import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Card, Pill, SectionTitle } from "../components/ui";
import { colors, radii } from "../theme";
import type { AssistantSettings, DashboardData, TabKey } from "../types";
import { firstName, relativeTime } from "../lib/format";

interface Props {
  dashboard: DashboardData;
  settings: AssistantSettings;
  connected: boolean;
  onToggleAway: (value: boolean) => void;
  onNavigate: (tab: TabKey) => void;
}

export function HomeScreen({ dashboard, settings, connected, onToggleAway, onNavigate }: Props) {
  const onDuty = settings.assistantEnabled && settings.awayMode;
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>SUNDAY, 4 OCTOBER</Text>
            <Text style={styles.greeting}>Hello, {firstName(settings.ownerName)}</Text>
          </View>
          <View style={styles.avatarWrap}>
            <Avatar name={settings.ownerName} size={46} />
            <View style={[styles.connectionDot, connected ? styles.dotOnline : styles.dotPreview]} />
          </View>
        </View>

        <LinearGradient colors={["#0F6A59", "#103F38"]} style={styles.hero}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles" size={21} color={colors.lime} />
            </View>
            <Switch
              value={onDuty}
              onValueChange={onToggleAway}
              trackColor={{ false: "#66867E", true: colors.lime }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={styles.heroTitle}>{onDuty ? "Your assistant is on duty" : "Your assistant is paused"}</Text>
          <Text style={styles.heroBody}>
            {onDuty
              ? "New messages get a clear away notice and a helpful answer from your approved information."
              : "Messages are still saved, but AwayAI will not answer until you switch it back on."}
          </Text>
          <View style={styles.heroFooter}>
            <View style={styles.liveRow}>
              <View style={[styles.liveDot, onDuty && styles.liveDotOn]} />
              <Text style={styles.liveText}>{onDuty ? "AWAY MODE ACTIVE" : "REPLIES PAUSED"}</Text>
            </View>
            <Pressable onPress={() => onNavigate("settings")} style={styles.adjustButton}>
              <Text style={styles.adjustText}>Adjust</Text>
              <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        </LinearGradient>

        {!connected ? (
          <Pressable style={styles.previewBanner} onPress={() => onNavigate("settings")}>
            <Ionicons name="flask-outline" size={18} color="#85511D" />
            <View style={styles.previewCopy}>
              <Text style={styles.previewTitle}>Preview mode</Text>
              <Text style={styles.previewText}>Connect your hosted server to use live WhatsApp replies.</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#85511D" />
          </Pressable>
        ) : null}

        <SectionTitle title="Today at a glance" />
        <View style={styles.statGrid}>
          <StatCard
            icon="chatbubbles-outline"
            value={dashboard.stats.conversations}
            label="Conversations"
            color={colors.green}
            background={colors.mint}
          />
          <StatCard
            icon="sparkles-outline"
            value={dashboard.stats.aiReplies}
            label="AI replies"
            color={colors.blue}
            background="#EAF1F8"
          />
          <StatCard
            icon="person-outline"
            value={dashboard.stats.needsHuman}
            label="Need you"
            color={colors.amber}
            background={colors.amberSoft}
          />
        </View>

        <SectionTitle title="Recent replies" action="View inbox" />
        <Card style={styles.activityCard}>
          {dashboard.recent.slice(0, 3).map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => onNavigate("inbox")}
              style={[styles.activityRow, index > 0 && styles.activityDivider]}
            >
              <Avatar name={item.contactName} size={42} />
              <View style={styles.activityCopy}>
                <View style={styles.activityNameRow}>
                  <Text style={styles.activityName}>{item.contactName}</Text>
                  <Text style={styles.activityTime}>{relativeTime(item.updatedAt)}</Text>
                </View>
                <Text style={styles.activityText} numberOfLines={1}>
                  {item.lastRole === "assistant" ? "AI · " : ""}
                  {item.lastMessage}
                </Text>
              </View>
              {item.needsHuman ? <View style={styles.attentionDot} /> : null}
            </Pressable>
          ))}
        </Card>

        <Card style={styles.privacyCard}>
          <View style={styles.privacyIcon}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.green} />
          </View>
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>Private by conversation</Text>
            <Text style={styles.privacyBody}>
              AwayAI only uses each person's own thread plus information you approve. It never shares another contact's messages.
            </Text>
          </View>
          <Pill label="Protected" tone="green" />
        </Card>
      </View>
    </ScrollView>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
  background,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color: string;
  background: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 118 },
  container: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 20 },
  header: {
    paddingTop: 14,
    paddingBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  greeting: { color: colors.ink, fontSize: 28, fontWeight: "900", letterSpacing: -0.8, marginTop: 4 },
  avatarWrap: { position: "relative" },
  connectionDot: {
    position: "absolute",
    right: -1,
    bottom: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.canvas,
  },
  dotOnline: { backgroundColor: colors.green },
  dotPreview: { backgroundColor: colors.amber },
  hero: {
    minHeight: 238,
    borderRadius: radii.xl,
    padding: 22,
    overflow: "hidden",
    shadowColor: colors.greenDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 5,
  },
  heroGlowOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(201,240,107,0.09)",
    right: -70,
    top: -80,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    right: 42,
    bottom: -92,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", letterSpacing: -0.6, marginTop: 23 },
  heroBody: { color: "#CDE1DA", fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 470 },
  heroFooter: {
    marginTop: "auto",
    paddingTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#829C95" },
  liveDotOn: { backgroundColor: colors.lime },
  liveText: { color: "#DBEAE5", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  adjustButton: { flexDirection: "row", alignItems: "center", gap: 2 },
  adjustText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  previewBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.amberSoft,
    borderColor: "#F1D1AD",
    borderWidth: 1,
    padding: 13,
    borderRadius: radii.md,
    marginTop: 16,
  },
  previewCopy: { flex: 1 },
  previewTitle: { color: "#74471A", fontSize: 13, fontWeight: "800" },
  previewText: { color: "#8D663F", fontSize: 12, lineHeight: 17, marginTop: 2 },
  statGrid: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  statIcon: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  statValue: { color: colors.ink, fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", marginTop: 2 },
  activityCard: { paddingVertical: 5, paddingHorizontal: 16 },
  activityRow: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 12 },
  activityDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  activityCopy: { flex: 1, minWidth: 0 },
  activityNameRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  activityName: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  activityTime: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  activityText: { color: colors.muted, fontSize: 12, marginTop: 4 },
  attentionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber },
  privacyCard: { marginTop: 18, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  privacyIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  privacyCopy: { flex: 1 },
  privacyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  privacyBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
});
