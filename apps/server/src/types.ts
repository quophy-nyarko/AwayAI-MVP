export type MessageDirection = "inbound" | "outbound";
export type MessageRole = "contact" | "assistant" | "owner";
export type MessageSource = "whatsapp" | "ai" | "owner" | "import" | "demo";

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  role: MessageRole;
  body: string;
  timestamp: string;
  source: MessageSource;
  status?: "received" | "sent" | "delivered" | "read" | "failed";
  replyToId?: string;
}

export interface Conversation {
  id: string;
  waId: string;
  contactName: string;
  updatedAt: string;
  createdAt: string;
  unread: number;
  needsHuman: boolean;
  messages: Message[];
}

export interface AssistantSettings {
  assistantEnabled: boolean;
  awayMode: boolean;
  ownerName: string;
  businessName: string;
  awayMessage: string;
  knowledge: string;
  tone: "warm" | "professional" | "casual" | "brief";
  fallbackMessage: string;
  blockedTopics: string;
  maxHistoryMessages: number;
  maxReplyCharacters: number;
  replyDelaySeconds: number;
  languageMode: "match-sender" | "english";
}

export interface StoreData {
  settings: AssistantSettings;
  conversations: Conversation[];
  processedWebhookIds: string[];
  counters: {
    aiReplies: number;
    received: number;
  };
}

export interface DashboardData {
  assistantEnabled: boolean;
  awayMode: boolean;
  connection: {
    whatsappConfigured: boolean;
    llmConfigured: boolean;
    demoMode: boolean;
  };
  stats: {
    conversations: number;
    aiReplies: number;
    needsHuman: number;
    received: number;
  };
  recent: Array<{
    id: string;
    contactName: string;
    lastMessage: string;
    updatedAt: string;
    needsHuman: boolean;
    lastRole: MessageRole;
  }>;
}

export interface IncomingMessage {
  id: string;
  from: string;
  contactName: string;
  body: string;
  timestamp: string;
  type: string;
}
