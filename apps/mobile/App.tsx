import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AwayApi } from "./src/lib/api";
import { loadApiConfig, saveApiConfig } from "./src/lib/storage";
import { mockConversations, mockDashboard, mockSettings } from "./src/lib/mock";
import { HomeScreen } from "./src/screens/HomeScreen";
import { InboxScreen } from "./src/screens/InboxScreen";
import { KnowledgeScreen } from "./src/screens/KnowledgeScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { colors, radii } from "./src/theme";
import type {
  ApiConfig,
  AssistantSettings,
  ConversationSummary,
  DashboardData,
  TabKey,
} from "./src/types";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>("home");
  const [config, setConfig] = useState<ApiConfig>({ baseUrl: "", token: "" });
  const [connected, setConnected] = useState(false);
  const [settings, setSettings] = useState<AssistantSettings>(mockSettings);
  const [dashboard, setDashboard] = useState<DashboardData>(mockDashboard);
  const [conversations, setConversations] = useState<ConversationSummary[]>(mockConversations);
  const api = useRef(new AwayApi(config));

  useEffect(() => {
    void (async () => {
      const stored = await loadApiConfig();
      setConfig(stored);
      api.current.setConfig(stored);
      if (stored.baseUrl) await refresh();
    })();
  }, []);

  async function refresh(): Promise<boolean> {
    try {
      const [nextDashboard, nextSettings, nextConversations] = await Promise.all([
        api.current.dashboard(),
        api.current.settings(),
        api.current.conversations(),
      ]);
      setDashboard(nextDashboard);
      setSettings(nextSettings);
      setConversations(nextConversations);
      setConnected(true);
      return true;
    } catch {
      setConnected(false);
      return false;
    }
  }

  async function updateSettings(patch: Partial<AssistantSettings>): Promise<void> {
    if (connected) {
      const next = await api.current.updateSettings(patch);
      setSettings(next);
      setDashboard((current) => ({
        ...current,
        assistantEnabled: next.assistantEnabled,
        awayMode: next.awayMode,
      }));
      return;
    }
    setSettings((current) => ({ ...current, ...patch }));
    setDashboard((current) => ({
      ...current,
      ...(patch.assistantEnabled !== undefined ? { assistantEnabled: patch.assistantEnabled } : {}),
      ...(patch.awayMode !== undefined ? { awayMode: patch.awayMode } : {}),
    }));
  }

  async function toggleAway(value: boolean): Promise<void> {
    await updateSettings({ awayMode: value, ...(value ? { assistantEnabled: true } : {}) });
  }

  async function updateConfig(next: ApiConfig): Promise<boolean> {
    const clean = {
      baseUrl: next.baseUrl.trim().replace(/\/$/, ""),
      token: next.token.trim(),
    };
    await saveApiConfig(clean);
    setConfig(clean);
    api.current.setConfig(clean);
    return refresh();
  }

  async function importChat(input: { contactName: string; waId: string; transcript: string }): Promise<number> {
    if (!connected) throw new Error("Connect your AwayAI server in Settings before importing a chat.");
    const result = await api.current.importChat(input);
    const nextConversations = await api.current.conversations();
    setConversations(nextConversations);
    return result.imported;
  }

  async function simulate(message: string): Promise<{ text: string; needsHuman: boolean }> {
    if (connected) return api.current.simulate(message);
    const lower = message.toLocaleLowerCase();
    const lines = settings.knowledge.split(/\n+/).filter(Boolean);
    const relevant = lines.find((line) => {
      if (/hours|open|working/.test(lower)) return /hours|monday|friday|open/i.test(line);
      if (/price|cost|fee/.test(lower)) return /price|cost|fee/i.test(line);
      if (/book|call|meeting/.test(lower)) return /book|call|meeting|consult/i.test(line);
      return false;
    });
    const answer = relevant ?? settings.fallbackMessage;
    return {
      text: `${settings.awayMessage} ${answer}`,
      needsHuman: !relevant,
    };
  }

  const screen = useMemo(() => {
    if (tab === "inbox") return <InboxScreen conversations={conversations} />;
    if (tab === "knowledge") {
      return (
        <KnowledgeScreen
          settings={settings}
          onSave={updateSettings}
          onSimulate={simulate}
          onImportChat={importChat}
        />
      );
    }
    if (tab === "settings") {
      return (
        <SettingsScreen
          config={config}
          settings={settings}
          dashboard={dashboard}
          connected={connected}
          onSaveConfig={updateConfig}
          onSaveSettings={updateSettings}
        />
      );
    }
    return (
      <HomeScreen
        dashboard={dashboard}
        settings={settings}
        connected={connected}
        onToggleAway={(value) => void toggleAway(value)}
        onNavigate={setTab}
      />
    );
  }, [tab, conversations, settings, config, dashboard, connected]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.app}>{screen}</View>
      <BottomNav tab={tab} onChange={setTab} bottom={Math.max(insets.bottom, 10)} />
    </SafeAreaView>
  );
}

const navItems: Array<{
  key: TabKey;
  label: string;
  active: keyof typeof Ionicons.glyphMap;
  inactive: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "home", label: "Home", active: "grid", inactive: "grid-outline" },
  { key: "inbox", label: "Inbox", active: "chatbubbles", inactive: "chatbubbles-outline" },
  { key: "knowledge", label: "Teach", active: "sparkles", inactive: "sparkles-outline" },
  { key: "settings", label: "Settings", active: "options", inactive: "options-outline" },
];

function BottomNav({ tab, onChange, bottom }: { tab: TabKey; onChange: (tab: TabKey) => void; bottom: number }) {
  return (
    <View style={[styles.navPosition, { bottom }]} pointerEvents="box-none">
      <View style={styles.nav}>
        {navItems.map((item) => {
          const active = item.key === tab;
          return (
            <Pressable key={item.key} onPress={() => onChange(item.key)} style={styles.navItem}>
              <View style={[styles.navIcon, active && styles.navIconActive]}>
                <Ionicons name={active ? item.active : item.inactive} size={20} color={active ? colors.greenDark : colors.muted} />
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  app: { flex: 1, backgroundColor: colors.canvas },
  navPosition: { position: "absolute", left: 0, right: 0, alignItems: "center", paddingHorizontal: 14 },
  nav: {
    width: "100%",
    maxWidth: 560,
    minHeight: 70,
    borderRadius: radii.xl,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 9,
    paddingVertical: 8,
    flexDirection: "row",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 9,
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  navIcon: { width: 38, height: 32, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  navIconActive: { backgroundColor: colors.mint },
  navLabel: { color: colors.muted, fontSize: 9, fontWeight: "800" },
  navLabelActive: { color: colors.greenDark },
});
