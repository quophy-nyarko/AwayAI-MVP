import type {
  ApiConfig,
  AssistantSettings,
  ConversationSummary,
  DashboardData,
} from "../types";

export class AwayApi {
  constructor(private config: ApiConfig) {}

  setConfig(config: ApiConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return Boolean(this.config.baseUrl);
  }

  dashboard(): Promise<DashboardData> {
    return this.request("/api/dashboard");
  }

  settings(): Promise<AssistantSettings> {
    return this.request("/api/settings");
  }

  updateSettings(patch: Partial<AssistantSettings>): Promise<AssistantSettings> {
    return this.request("/api/settings", {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  }

  conversations(): Promise<ConversationSummary[]> {
    return this.request("/api/conversations");
  }

  simulate(message: string): Promise<{ text: string; needsHuman: boolean }> {
    return this.request("/api/simulate", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  importChat(input: { contactName: string; waId: string; transcript: string }): Promise<{ imported: number }> {
    return this.request("/api/import-chat", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async checkConnection(): Promise<boolean> {
    if (!this.config.baseUrl) return false;
    try {
      await this.dashboard();
      return true;
    } catch {
      return false;
    }
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.config.baseUrl) throw new Error("Add your server URL in Settings");
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(this.config.token ? { Authorization: `Bearer ${this.config.token}` } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // Preserve the status message.
      }
      throw new Error(message);
    }
    return (await response.json()) as T;
  }
}
