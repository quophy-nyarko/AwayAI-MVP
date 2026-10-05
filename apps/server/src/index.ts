import "dotenv/config";
import { randomUUID, timingSafeEqual } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { createReply } from "./ai.js";
import { parseWhatsAppExport } from "./import-chat.js";
import { JsonStore } from "./store.js";
import type { AssistantSettings, IncomingMessage, Message } from "./types.js";
import {
  extractIncomingMessages,
  sendWhatsAppText,
  verifyMetaSignature,
} from "./whatsapp.js";

type RequestWithRawBody = Request & { rawBody?: Buffer };

const app = express();
const store = new JsonStore();
const jobs = new Map<string, Promise<void>>();
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origin not allowed"));
      }
    },
  }),
);
app.use(
  express.json({
    limit: "1mb",
    verify(req, _res, buffer) {
      (req as RequestWithRawBody).rawBody = Buffer.from(buffer);
    },
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "AwayAI", time: new Date().toISOString() });
});

// Meta performs this challenge when the webhook callback URL is saved.
app.get("/webhooks/whatsapp", (req, res) => {
  const mode = String(req.query["hub.mode"] ?? "");
  const token = String(req.query["hub.verify_token"] ?? "");
  const challenge = String(req.query["hub.challenge"] ?? "");
  if (
    mode === "subscribe" &&
    process.env.META_VERIFY_TOKEN &&
    safeEqual(token, process.env.META_VERIFY_TOKEN)
  ) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

// Acknowledge quickly. Processing continues after Meta receives HTTP 200.
app.post("/webhooks/whatsapp", (req: RequestWithRawBody, res) => {
  if (!verifyMetaSignature(req.rawBody ?? Buffer.alloc(0), req.header("x-hub-signature-256"))) {
    res.sendStatus(401);
    return;
  }

  const incoming = extractIncomingMessages(req.body);
  res.sendStatus(200);
  for (const message of incoming) enqueueIncoming(message);
});

app.use("/api", requireAdminToken);

app.get("/api/dashboard", (_req, res) => {
  res.json(store.dashboard());
});

app.get("/api/settings", (_req, res) => {
  res.json(store.getSettings());
});

app.put("/api/settings", async (req, res, next) => {
  try {
    const patch = isRecord(req.body) ? (req.body as Partial<AssistantSettings>) : {};
    const settings = await store.updateSettings(patch);
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

app.get("/api/conversations", (_req, res) => {
  const conversations = store.getConversations().map((conversation) => ({
    ...conversation,
    messages: conversation.messages.slice(-2),
    messageCount: conversation.messages.length,
  }));
  res.json(conversations);
});

app.get("/api/conversations/:id", async (req, res) => {
  const conversation = store.getConversation(req.params.id);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  await store.markRead(req.params.id);
  res.json(conversation);
});

app.patch("/api/conversations/:id", async (req, res) => {
  if (!isRecord(req.body) || typeof req.body.needsHuman !== "boolean") {
    res.status(400).json({ error: "needsHuman must be a boolean" });
    return;
  }
  await store.setNeedsHuman(req.params.id, req.body.needsHuman);
  res.json({ ok: true });
});

app.delete("/api/conversations/:id", async (req, res) => {
  const deleted = await store.deleteConversation(req.params.id);
  res.status(deleted ? 200 : 404).json({ ok: deleted });
});

app.post("/api/simulate", async (req, res, next) => {
  try {
    if (!isRecord(req.body) || typeof req.body.message !== "string") {
      res.status(400).json({ error: "message is required" });
      return;
    }
    const incoming = cleanText(req.body.message, 4096);
    if (!incoming) {
      res.status(400).json({ error: "message cannot be empty" });
      return;
    }
    const result = await simulateMessage(incoming);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/import-chat", async (req, res, next) => {
  try {
    if (
      !isRecord(req.body) ||
      typeof req.body.transcript !== "string" ||
      typeof req.body.contactName !== "string" ||
      typeof req.body.waId !== "string"
    ) {
      res.status(400).json({ error: "transcript, contactName and waId are required" });
      return;
    }
    const contactName = cleanText(req.body.contactName, 80);
    const waId = req.body.waId.replace(/\D/g, "").slice(0, 20);
    const ownerName = store.getSettings().ownerName.toLocaleLowerCase();
    const parsed = parseWhatsAppExport(req.body.transcript);
    if (!contactName || !waId || parsed.length === 0) {
      res.status(400).json({
        error: "No WhatsApp messages were recognized. Check the contact and export format.",
      });
      return;
    }

    for (const line of parsed) {
      const isOwner = line.sender.toLocaleLowerCase() === ownerName;
      await store.appendMessage({
        conversationWaId: waId,
        contactName,
        message: {
          id: `import-${randomUUID()}`,
          direction: isOwner ? "outbound" : "inbound",
          role: isOwner ? "owner" : "contact",
          body: cleanText(line.body, 4096),
          timestamp: line.timestamp,
          source: "import",
          status: isOwner ? "sent" : "received",
        },
      });
    }
    res.status(201).json({ imported: parsed.length, conversation: store.getConversation(waId) });
  } catch (error) {
    next(error);
  }
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong" });
});

function enqueueIncoming(incoming: IncomingMessage): void {
  const previous = jobs.get(incoming.from) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(() => processIncoming(incoming))
    .catch((error) => console.error("Failed to process WhatsApp message", error))
    .finally(() => {
      if (jobs.get(incoming.from) === current) jobs.delete(incoming.from);
    });
  jobs.set(incoming.from, current);
}

async function processIncoming(incoming: IncomingMessage): Promise<void> {
  if (store.hasProcessedWebhook(incoming.id)) return;

  await store.appendMessage({
    conversationWaId: incoming.from,
    contactName: incoming.contactName,
    message: {
      id: incoming.id,
      direction: "inbound",
      role: "contact",
      body: incoming.body,
      timestamp: incoming.timestamp,
      source: "whatsapp",
      status: "received",
    },
  });
  await store.markWebhookProcessed(incoming.id);

  const settings = store.getSettings();
  if (!settings.assistantEnabled || !settings.awayMode) return;
  if (settings.replyDelaySeconds) {
    await new Promise((resolve) => setTimeout(resolve, settings.replyDelaySeconds * 1000));
  }

  const conversation = store.getConversation(incoming.from);
  const history =
    conversation?.messages.filter((message) => message.id !== incoming.id).slice(-settings.maxHistoryMessages) ?? [];
  const reply = await createReply({
    incomingText: incoming.body,
    contactName: incoming.contactName,
    history,
    settings,
  });

  let outboundId = `local-${randomUUID()}`;
  let status: Message["status"] = "sent";
  try {
    outboundId =
      (await sendWhatsAppText({
        to: incoming.from,
        body: reply.text,
        replyToId: incoming.id,
      })) ?? outboundId;
  } catch (error) {
    status = "failed";
    reply.needsHuman = true;
    console.error("WhatsApp send failed", error);
  }

  await store.appendMessage({
    conversationWaId: incoming.from,
    contactName: incoming.contactName,
    message: {
      id: outboundId,
      direction: "outbound",
      role: "assistant",
      body: reply.text,
      timestamp: new Date().toISOString(),
      source: "ai",
      status,
      replyToId: incoming.id,
    },
  });
  if (reply.needsHuman) await store.setNeedsHuman(incoming.from, true);
}

async function simulateMessage(message: string) {
  const waId = "demo-simulator";
  const messageId = `demo-${randomUUID()}`;
  const timestamp = new Date().toISOString();
  await store.appendMessage({
    conversationWaId: waId,
    contactName: "Test contact",
    message: {
      id: messageId,
      direction: "inbound",
      role: "contact",
      body: message,
      timestamp,
      source: "demo",
      status: "received",
    },
  });
  const settings = store.getSettings();
  const conversation = store.getConversation(waId);
  const reply = await createReply({
    incomingText: message,
    contactName: "Test contact",
    history: conversation?.messages.filter((item) => item.id !== messageId) ?? [],
    settings,
  });
  await store.appendMessage({
    conversationWaId: waId,
    contactName: "Test contact",
    message: {
      id: `demo-${randomUUID()}`,
      direction: "outbound",
      role: "assistant",
      body: reply.text,
      timestamp: new Date().toISOString(),
      source: "demo",
      status: "sent",
      replyToId: messageId,
    },
  });
  if (reply.needsHuman) await store.setNeedsHuman(waId, true);
  return reply;
}

function requireAdminToken(req: Request, res: Response, next: NextFunction): void {
  const configured = process.env.APP_ADMIN_TOKEN;
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      res.status(503).json({ error: "APP_ADMIN_TOKEN is not configured" });
      return;
    }
    next();
    return;
  }
  const bearer = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const provided = bearer || req.header("x-app-token") || "";
  if (!safeEqual(provided, configured)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function cleanText(value: string, max: number): string {
  return value.replace(/\0/g, "").trim().slice(0, max);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const port = Number(process.env.PORT ?? 8787);
await store.init();
app.listen(port, "0.0.0.0", () => {
  console.log(`AwayAI API listening on http://0.0.0.0:${port}`);
});

export { app, store };
