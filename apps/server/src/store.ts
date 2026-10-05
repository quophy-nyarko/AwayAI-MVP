import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AssistantSettings,
  Conversation,
  DashboardData,
  Message,
  StoreData,
} from "./types.js";

const defaultSettings: AssistantSettings = {
  assistantEnabled: true,
  awayMode: true,
  ownerName: "Alex",
  businessName: "My Business",
  awayMessage: "Auto-reply: Alex is not available at the moment, but I can help with a few questions.",
  knowledge:
    "Add only information you approve the assistant to share, such as your services, working hours, prices, location and booking process.",
  tone: "warm",
  fallbackMessage:
    "I don't have enough approved information to answer that. I've saved your message for Alex to review when available.",
  blockedTopics:
    "Passwords, verification codes, private information about other contacts, payment card details, medical advice, legal advice, and binding commitments.",
  maxHistoryMessages: 12,
  maxReplyCharacters: 700,
  replyDelaySeconds: 1,
  languageMode: "match-sender",
};

function demoData(): StoreData {
  const now = Date.now();
  const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

  const conversations: Conversation[] = [
    {
      id: "demo-maya",
      waId: "971500000001",
      contactName: "Maya",
      createdAt: iso(44),
      updatedAt: iso(3),
      unread: 0,
      needsHuman: false,
      messages: [
        {
          id: "demo-1",
          conversationId: "demo-maya",
          direction: "inbound",
          role: "contact",
          body: "Are you available for a call tomorrow morning?",
          timestamp: iso(4),
          source: "demo",
          status: "received",
        },
        {
          id: "demo-2",
          conversationId: "demo-maya",
          direction: "outbound",
          role: "assistant",
          body: "Auto-reply: Alex is not available at the moment, but I can help with a few questions. I can note that you prefer tomorrow morning, but Alex will confirm the exact time when available.",
          timestamp: iso(3),
          source: "demo",
          status: "delivered",
        },
      ],
    },
    {
      id: "demo-omar",
      waId: "971500000002",
      contactName: "Omar",
      createdAt: iso(130),
      updatedAt: iso(28),
      unread: 1,
      needsHuman: true,
      messages: [
        {
          id: "demo-3",
          conversationId: "demo-omar",
          direction: "inbound",
          role: "contact",
          body: "Can you approve the final price today?",
          timestamp: iso(29),
          source: "demo",
          status: "received",
        },
        {
          id: "demo-4",
          conversationId: "demo-omar",
          direction: "outbound",
          role: "assistant",
          body: "Auto-reply: Alex is not available at the moment, but I can help with a few questions. I can't approve a final price on Alex's behalf. I've flagged this for a personal reply.",
          timestamp: iso(28),
          source: "demo",
          status: "delivered",
        },
      ],
    },
    {
      id: "demo-sara",
      waId: "971500000003",
      contactName: "Sara",
      createdAt: iso(500),
      updatedAt: iso(86),
      unread: 0,
      needsHuman: false,
      messages: [
        {
          id: "demo-5",
          conversationId: "demo-sara",
          direction: "inbound",
          role: "contact",
          body: "Thanks, that answers everything!",
          timestamp: iso(86),
          source: "demo",
          status: "received",
        },
      ],
    },
  ];

  return {
    settings: defaultSettings,
    conversations,
    processedWebhookIds: [],
    counters: { aiReplies: 2, received: 3 },
  };
}

function emptyData(): StoreData {
  return {
    settings: defaultSettings,
    conversations: [],
    processedWebhookIds: [],
    counters: { aiReplies: 0, received: 0 },
  };
}

export class JsonStore {
  private readonly filePath: string;
  private data: StoreData = emptyData();
  private writeChain: Promise<void> = Promise.resolve();

  constructor(filePath = process.env.DATA_FILE ?? "./data/store.json") {
    this.filePath = resolve(filePath);
  }

  async init(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      this.data = {
        ...emptyData(),
        ...parsed,
        settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
        counters: { ...emptyData().counters, ...(parsed.counters ?? {}) },
        conversations: parsed.conversations ?? [],
        processedWebhookIds: parsed.processedWebhookIds ?? [],
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      this.data = process.env.DEMO_MODE === "false" ? emptyData() : demoData();
      await this.persist();
    }
  }

  getSettings(): AssistantSettings {
    return structuredClone(this.data.settings);
  }

  async updateSettings(patch: Partial<AssistantSettings>): Promise<AssistantSettings> {
    const allowed: Array<keyof AssistantSettings> = [
      "assistantEnabled",
      "awayMode",
      "ownerName",
      "businessName",
      "awayMessage",
      "knowledge",
      "tone",
      "fallbackMessage",
      "blockedTopics",
      "maxHistoryMessages",
      "maxReplyCharacters",
      "replyDelaySeconds",
      "languageMode",
    ];

    for (const key of allowed) {
      if (patch[key] !== undefined) {
        (this.data.settings as unknown as Record<string, unknown>)[key] = patch[key];
      }
    }

    this.data.settings.maxHistoryMessages = clampNumber(
      this.data.settings.maxHistoryMessages,
      2,
      40,
    );
    this.data.settings.maxReplyCharacters = clampNumber(
      this.data.settings.maxReplyCharacters,
      120,
      3000,
    );
    this.data.settings.replyDelaySeconds = clampNumber(
      this.data.settings.replyDelaySeconds,
      0,
      20,
    );
    this.data.settings.ownerName = cleanText(this.data.settings.ownerName, 80);
    this.data.settings.businessName = cleanText(this.data.settings.businessName, 120);
    this.data.settings.awayMessage = cleanText(this.data.settings.awayMessage, 500);
    this.data.settings.knowledge = cleanText(this.data.settings.knowledge, 20_000);
    this.data.settings.fallbackMessage = cleanText(this.data.settings.fallbackMessage, 1000);
    this.data.settings.blockedTopics = cleanText(this.data.settings.blockedTopics, 2000);

    await this.persist();
    return this.getSettings();
  }

  getConversations(): Conversation[] {
    return structuredClone(
      [...this.data.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
  }

  getConversation(idOrWaId: string): Conversation | undefined {
    const found = this.data.conversations.find(
      (conversation) => conversation.id === idOrWaId || conversation.waId === idOrWaId,
    );
    return found ? structuredClone(found) : undefined;
  }

  async appendMessage(input: {
    conversationWaId: string;
    contactName?: string;
    message: Omit<Message, "conversationId">;
  }): Promise<Conversation> {
    let conversation = this.data.conversations.find(
      (item) => item.waId === input.conversationWaId,
    );

    if (!conversation) {
      conversation = {
        id: randomUUID(),
        waId: input.conversationWaId,
        contactName: input.contactName || input.conversationWaId,
        createdAt: input.message.timestamp,
        updatedAt: input.message.timestamp,
        unread: 0,
        needsHuman: false,
        messages: [],
      };
      this.data.conversations.push(conversation);
    }

    if (conversation.messages.some((message) => message.id === input.message.id)) {
      return structuredClone(conversation);
    }

    conversation.contactName = input.contactName || conversation.contactName;
    conversation.messages.push({ ...input.message, conversationId: conversation.id });
    conversation.updatedAt = input.message.timestamp;
    if (input.message.direction === "inbound") {
      conversation.unread += 1;
      this.data.counters.received += 1;
    }
    if (input.message.role === "assistant") this.data.counters.aiReplies += 1;

    await this.persist();
    return structuredClone(conversation);
  }

  async setNeedsHuman(idOrWaId: string, value: boolean): Promise<void> {
    const conversation = this.data.conversations.find(
      (item) => item.id === idOrWaId || item.waId === idOrWaId,
    );
    if (!conversation) return;
    conversation.needsHuman = value;
    await this.persist();
  }

  async markRead(idOrWaId: string): Promise<void> {
    const conversation = this.data.conversations.find(
      (item) => item.id === idOrWaId || item.waId === idOrWaId,
    );
    if (!conversation) return;
    conversation.unread = 0;
    await this.persist();
  }

  async deleteConversation(idOrWaId: string): Promise<boolean> {
    const before = this.data.conversations.length;
    this.data.conversations = this.data.conversations.filter(
      (item) => item.id !== idOrWaId && item.waId !== idOrWaId,
    );
    if (this.data.conversations.length === before) return false;
    await this.persist();
    return true;
  }

  hasProcessedWebhook(id: string): boolean {
    return this.data.processedWebhookIds.includes(id);
  }

  async markWebhookProcessed(id: string): Promise<void> {
    if (this.hasProcessedWebhook(id)) return;
    this.data.processedWebhookIds.push(id);
    this.data.processedWebhookIds = this.data.processedWebhookIds.slice(-5000);
    await this.persist();
  }

  dashboard(): DashboardData {
    const conversations = this.getConversations();
    return {
      assistantEnabled: this.data.settings.assistantEnabled,
      awayMode: this.data.settings.awayMode,
      connection: {
        whatsappConfigured: Boolean(
          process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
        ),
        llmConfigured: Boolean(process.env.LLM_API_KEY),
        demoMode: process.env.DEMO_MODE !== "false",
      },
      stats: {
        conversations: conversations.length,
        aiReplies: this.data.counters.aiReplies,
        needsHuman: conversations.filter((item) => item.needsHuman).length,
        received: this.data.counters.received,
      },
      recent: conversations.slice(0, 5).map((conversation) => {
        const last = conversation.messages.at(-1);
        return {
          id: conversation.id,
          contactName: conversation.contactName,
          lastMessage: last?.body ?? "No messages yet",
          updatedAt: conversation.updatedAt,
          needsHuman: conversation.needsHuman,
          lastRole: last?.role ?? "contact",
        };
      }),
    };
  }

  private persist(): Promise<void> {
    const snapshot = JSON.stringify(this.data, null, 2);
    this.writeChain = this.writeChain.then(async () => {
      const temp = `${this.filePath}.${process.pid}.tmp`;
      await writeFile(temp, snapshot, { encoding: "utf8", mode: 0o600 });
      await rename(temp, this.filePath);
    });
    return this.writeChain;
  }
}

function clampNumber(value: unknown, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\0/g, "").trim().slice(0, maxLength);
}
