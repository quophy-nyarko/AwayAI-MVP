export type TabKey = "home" | "inbox" | "knowledge" | "settings";

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

export interface RecentItem {
  id: string;
  contactName: string;
  lastMessage: string;
  updatedAt: string;
  needsHuman: boolean;
  lastRole: "contact" | "assistant" | "owner";
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
  recent: RecentItem[];
}

export interface ConversationSummary {
  id: string;
  waId: string;
  contactName: string;
  updatedAt: string;
  unread: number;
  needsHuman: boolean;
  messageCount: number;
  messages: Array<{
    id: string;
    body: string;
    role: "contact" | "assistant" | "owner";
    timestamp: string;
  }>;
}

export interface ApiConfig {
  baseUrl: string;
  token: string;
}
