import type { AssistantSettings, ConversationSummary, DashboardData } from "../types";

export const mockSettings: AssistantSettings = {
  assistantEnabled: true,
  awayMode: true,
  ownerName: "Alex",
  businessName: "Studio North",
  awayMessage: "Auto-reply: Alex is not available at the moment, but I can help with a few questions.",
  knowledge:
    "Studio North helps small businesses with brand strategy and digital design.\nWorking hours: Monday to Friday, 9:00 AM to 6:00 PM Gulf Standard Time.\nDiscovery calls are 30 minutes and can be requested for the next working day.\nProject prices are confirmed personally by Alex after a discovery call.",
  tone: "warm",
  fallbackMessage:
    "I don't have enough approved information to answer that. I've saved your message for Alex to review when available.",
  blockedTopics: "Passwords, private chats, payment details, legal or medical advice, and binding commitments.",
  maxHistoryMessages: 12,
  maxReplyCharacters: 700,
  replyDelaySeconds: 1,
  languageMode: "match-sender",
};

const now = Date.now();
const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

export const mockConversations: ConversationSummary[] = [
  {
    id: "maya",
    waId: "971500000001",
    contactName: "Maya",
    updatedAt: iso(3),
    unread: 0,
    needsHuman: false,
    messageCount: 2,
    messages: [
      {
        id: "1",
        body: "Are you available for a call tomorrow morning?",
        role: "contact",
        timestamp: iso(4),
      },
      {
        id: "2",
        body: "I can note that you prefer tomorrow morning. Alex will confirm the exact time when available.",
        role: "assistant",
        timestamp: iso(3),
      },
    ],
  },
  {
    id: "omar",
    waId: "971500000002",
    contactName: "Omar",
    updatedAt: iso(28),
    unread: 1,
    needsHuman: true,
    messageCount: 4,
    messages: [
      {
        id: "3",
        body: "Can you approve the final price today?",
        role: "contact",
        timestamp: iso(29),
      },
      {
        id: "4",
        body: "I can't approve a final price on Alex's behalf. I've flagged this for a personal reply.",
        role: "assistant",
        timestamp: iso(28),
      },
    ],
  },
  {
    id: "sara",
    waId: "971500000003",
    contactName: "Sara",
    updatedAt: iso(86),
    unread: 0,
    needsHuman: false,
    messageCount: 7,
    messages: [
      {
        id: "5",
        body: "Thanks, that answers everything!",
        role: "contact",
        timestamp: iso(86),
      },
    ],
  },
];

export const mockDashboard: DashboardData = {
  assistantEnabled: true,
  awayMode: true,
  connection: {
    whatsappConfigured: false,
    llmConfigured: false,
    demoMode: true,
  },
  stats: {
    conversations: 18,
    aiReplies: 42,
    needsHuman: 2,
    received: 51,
  },
  recent: mockConversations.map((conversation) => ({
    id: conversation.id,
    contactName: conversation.contactName,
    lastMessage: conversation.messages.at(-1)?.body ?? "",
    updatedAt: conversation.updatedAt,
    needsHuman: conversation.needsHuman,
    lastRole: conversation.messages.at(-1)?.role ?? "contact",
  })),
};
