import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Pill, SectionTitle } from "../components/ui";
import { colors, radii } from "../theme";
import type { ApiConfig, AssistantSettings, DashboardData } from "../types";

interface Props {
  config: ApiConfig;
  settings: AssistantSettings;
  dashboard: DashboardData;
  connected: boolean;
  onSaveConfig: (config: ApiConfig) => Promise<boolean>;
  onSaveSettings: (patch: Partial<AssistantSettings>) => Promise<void>;
}

export function SettingsScreen({
  config,
  settings,
  dashboard,
  connected,
  onSaveConfig,
  onSaveSettings,
}: Props) {
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [token, setToken] = useState(config.token);
  const [showToken, setShowToken] = useState(false);
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [savingConnection, setSavingConnection] = useState(false);

  useEffect(() => {
    setBaseUrl(config.baseUrl);
    setToken(config.token);
  }, [config]);

  useEffect(() => {
    setOwnerName(settings.ownerName);
    setBusinessName(settings.businessName);
  }, [settings.ownerName, settings.businessName]);

  async function connect() {
    setSavingConnection(true);
    try {
      const worked = await onSaveConfig({ baseUrl, token });
      Alert.alert(
        worked ? "Server connected" : "Saved, but not reachable",
        worked
          ? "The app can now manage your AwayAI server."
          : "Check the HTTPS URL, token, and whether the server is running.",
      );
    } finally {
      setSavingConnection(false);
    }
  }

  async function saveProfile() {
    try {
      await onSaveSettings({ ownerName, businessName });
      Alert.alert("Profile saved");
    } catch (error) {
      Alert.alert("Couldn't save", error instanceof Error ? error.message : "Please try again.");
    }
  }

  async function toggleEnabled(value: boolean) {
    try {
      await onSaveSettings({ assistantEnabled: value });
    } catch (error) {
      Alert.alert("Couldn't update", error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Connections, profile and safety controls.</Text>
          </View>
          <View style={styles.settingsIcon}>
            <Ionicons name="options-outline" size={22} color={colors.green} />
          </View>
        </View>

        <Card style={styles.statusCard}>
          <View style={styles.whatsappIcon}>
            <Ionicons name="logo-whatsapp" size={25} color="#FFFFFF" />
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>WhatsApp Business</Text>
            <Text style={styles.statusText}>
              {dashboard.connection.whatsappConfigured ? "Cloud API credentials found" : "Cloud API setup still required"}
            </Text>
          </View>
          <Pill
            label={dashboard.connection.whatsappConfigured ? "Ready" : "Setup"}
            tone={dashboard.connection.whatsappConfigured ? "green" : "amber"}
            icon={dashboard.connection.whatsappConfigured ? "checkmark" : "build-outline"}
          />
        </Card>

        <SectionTitle title="App server" />
        <View style={styles.formCard}>
          <View style={styles.connectionRow}>
            <View style={[styles.serverDot, connected && styles.serverDotOn]} />
            <Text style={styles.connectionLabel}>{connected ? "Connected to your server" : "Preview data — no live connection"}</Text>
          </View>
          <Text style={styles.label}>HTTPS SERVER URL</Text>
          <TextInput
            value={baseUrl}
            onChangeText={setBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://your-awayai-server.example.com"
            placeholderTextColor="#9AA6A1"
            style={styles.input}
          />
          <Text style={styles.label}>APP ADMIN TOKEN</Text>
          <View style={styles.tokenField}>
            <TextInput
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showToken}
              placeholder="Paste APP_ADMIN_TOKEN"
              placeholderTextColor="#9AA6A1"
              style={styles.tokenInput}
            />
            <Pressable onPress={() => setShowToken((value) => !value)}>
              <Ionicons name={showToken ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={styles.helpText}>Stored in Android secure storage. WhatsApp and AI provider secrets remain only on the server.</Text>
          <Button label="Save & test connection" icon="link-outline" onPress={connect} loading={savingConnection} />
        </View>

        <SectionTitle title="Your profile" />
        <View style={styles.formCard}>
          <Text style={styles.label}>YOUR NAME</Text>
          <TextInput value={ownerName} onChangeText={setOwnerName} placeholder="Alex" placeholderTextColor="#9AA6A1" style={styles.input} />
          <Text style={styles.label}>BUSINESS OR ROLE</Text>
          <TextInput value={businessName} onChangeText={setBusinessName} placeholder="Studio North" placeholderTextColor="#9AA6A1" style={styles.input} />
          <Button label="Save profile" onPress={saveProfile} variant="secondary" />
        </View>

        <SectionTitle title="Assistant control" />
        <Card style={styles.toggleCard}>
          <View style={styles.toggleIcon}>
            <Ionicons name="power-outline" size={21} color={colors.green} />
          </View>
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>Allow automatic replies</Text>
            <Text style={styles.toggleText}>The dashboard Away Mode switch controls when replies are sent.</Text>
          </View>
          <Switch
            value={settings.assistantEnabled}
            onValueChange={toggleEnabled}
            trackColor={{ false: "#CCD3CF", true: "#86C7B4" }}
            thumbColor={settings.assistantEnabled ? colors.green : "#FFFFFF"}
          />
        </Card>

        <SectionTitle title="Before you go live" />
        <View style={styles.stepsCard}>
          <Step number="1" title="Deploy the server" body="Use the included Dockerfile or Render blueprint so replies continue when your phone is offline." />
          <Step number="2" title="Connect Meta Cloud API" body="Add the permanent token, phone number ID and webhook URL to the hosted server." />
          <Step number="3" title="Link your Business app" body="Use Meta's supported onboarding/coexistence path if it is available for your account and region." last />
          <Pressable
            style={styles.docsButton}
            onPress={() => Linking.openURL("https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/")}
          >
            <Text style={styles.docsText}>Open Meta setup guide</Text>
            <Ionicons name="open-outline" size={16} color={colors.green} />
          </Pressable>
        </View>

        <Card style={styles.warningCard}>
          <Ionicons name="information-circle-outline" size={22} color="#91561E" />
          <Text style={styles.warningText}>
            AwayAI cannot detect that your phone lost internet. Turn on Away Mode before going offline, or leave it on whenever you want cloud replies.
          </Text>
        </Card>

        <Text style={styles.version}>AwayAI · MVP 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

function Step({ number, title, body, last = false }: { number: string; title: string; body: string; last?: boolean }) {
  return (
    <View style={[styles.step, !last && styles.stepBorder]}>
      <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View>
      <View style={styles.stepCopy}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 118 },
  container: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 20 },
  header: { paddingTop: 14, paddingBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.ink, fontSize: 29, fontWeight: "900", letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 5 },
  settingsIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  whatsappIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#20B967", alignItems: "center", justifyContent: "center" },
  statusCopy: { flex: 1 },
  statusTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  statusText: { color: colors.muted, fontSize: 11, marginTop: 3 },
  formCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radii.lg, padding: 16, gap: 10 },
  connectionRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 },
  serverDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber },
  serverDotOn: { backgroundColor: colors.green },
  connectionLabel: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  label: { color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 0.9, marginTop: 3 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: "#F7F9F6", color: colors.ink, paddingHorizontal: 13, fontSize: 13 },
  tokenField: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: "#F7F9F6", paddingHorizontal: 13, flexDirection: "row", alignItems: "center" },
  tokenInput: { flex: 1, color: colors.ink, fontSize: 13, paddingVertical: 0 },
  helpText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginBottom: 3 },
  toggleCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  toggleCopy: { flex: 1 },
  toggleTitle: { color: colors.ink, fontSize: 13, fontWeight: "900" },
  toggleText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  stepsCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radii.lg, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14 },
  step: { flexDirection: "row", gap: 12, paddingVertical: 15 },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  stepNumber: { width: 28, height: 28, borderRadius: 10, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: colors.greenDark, fontSize: 11, fontWeight: "900" },
  stepCopy: { flex: 1 },
  stepTitle: { color: colors.ink, fontSize: 13, fontWeight: "900" },
  stepBody: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  docsButton: { minHeight: 44, borderRadius: 14, backgroundColor: colors.mintSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 2 },
  docsText: { color: colors.green, fontSize: 12, fontWeight: "900" },
  warningCard: { flexDirection: "row", gap: 10, marginTop: 18, backgroundColor: colors.amberSoft, borderColor: "#EED2B5" },
  warningText: { flex: 1, color: "#7F5A37", fontSize: 11, lineHeight: 17 },
  version: { color: "#9AA6A1", fontSize: 10, textAlign: "center", marginTop: 22 },
});
