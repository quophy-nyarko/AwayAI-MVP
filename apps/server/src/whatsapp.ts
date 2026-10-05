import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "./types.js";

export function verifyMetaSignature(rawBody: Buffer, signatureHeader?: string): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const supplied = Buffer.from(signatureHeader, "utf8");
  const computed = Buffer.from(expected, "utf8");
  return supplied.length === computed.length && timingSafeEqual(supplied, computed);
}

export function extractIncomingMessages(payload: unknown): IncomingMessage[] {
  if (!isRecord(payload) || payload.object !== "whatsapp_business_account") return [];
  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  const output: IncomingMessage[] = [];

  for (const entry of entries) {
    if (!isRecord(entry) || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      if (!isRecord(change) || change.field !== "messages" || !isRecord(change.value)) continue;
      const contacts = Array.isArray(change.value.contacts) ? change.value.contacts : [];
      const names = new Map<string, string>();
      for (const contact of contacts) {
        if (!isRecord(contact) || typeof contact.wa_id !== "string") continue;
        const profile = isRecord(contact.profile) ? contact.profile : undefined;
        names.set(
          contact.wa_id,
          profile && typeof profile.name === "string" ? profile.name : contact.wa_id,
        );
      }

      const messages = Array.isArray(change.value.messages) ? change.value.messages : [];
      for (const message of messages) {
        if (!isRecord(message)) continue;
        if (
          typeof message.id !== "string" ||
          typeof message.from !== "string" ||
          typeof message.type !== "string"
        ) {
          continue;
        }
        output.push({
          id: message.id,
          from: message.from,
          contactName: names.get(message.from) ?? message.from,
          body: messageBody(message),
          timestamp: fromUnixTimestamp(message.timestamp),
          type: message.type,
        });
      }
    }
  }
  return output;
}

export async function sendWhatsAppText(input: {
  to: string;
  body: string;
  replyToId?: string;
}): Promise<string | undefined> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WhatsApp credentials are not configured");
    }
    console.info("[demo] WhatsApp reply", { to: input.to, body: input.body });
    return undefined;
  }

  const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v26.0";
  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.to,
    type: "text",
    text: {
      preview_url: false,
      body: input.body,
    },
  };
  if (input.replyToId) payload.context = { message_id: input.replyToId };

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    },
  );

  const responseBody = (await response.json()) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; code?: number };
  };
  if (!response.ok) {
    throw new Error(
      `WhatsApp API ${response.status}: ${responseBody.error?.message ?? "unknown error"}`,
    );
  }
  return responseBody.messages?.[0]?.id;
}

function messageBody(message: Record<string, unknown>): string {
  if (message.type === "text" && isRecord(message.text) && typeof message.text.body === "string") {
    return message.text.body;
  }
  if (message.type === "button" && isRecord(message.button) && typeof message.button.text === "string") {
    return message.button.text;
  }
  if (message.type === "interactive" && isRecord(message.interactive)) {
    const interactive = message.interactive;
    const reply = isRecord(interactive.button_reply)
      ? interactive.button_reply
      : isRecord(interactive.list_reply)
        ? interactive.list_reply
        : undefined;
    if (reply && typeof reply.title === "string") return reply.title;
  }

  const friendly: Record<string, string> = {
    audio: "[Audio message received]",
    image: "[Image received]",
    video: "[Video received]",
    document: "[Document received]",
    location: "[Location received]",
    contacts: "[Contact card received]",
    sticker: "[Sticker received]",
    reaction: "[Reaction received]",
  };
  return friendly[String(message.type)] ?? "[Unsupported WhatsApp message received]";
}

function fromUnixTimestamp(value: unknown): string {
  const seconds = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
