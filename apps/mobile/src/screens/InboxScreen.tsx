import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, EmptyState, Pill } from "../components/ui";
import { relativeTime } from "../lib/format";
import { colors, radii } from "../theme";
import type { ConversationSummary } from "../types";

interface Props {
  conversations: ConversationSummary[];
}

export function InboxScreen({ conversations }: Props) {
  const [filter, setFilter] = useState<"all" | "needsHuman">("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = useMemo(() => {
    const lowered = query.trim().toLocaleLowerCase();
    return conversations.filter((item) => {
      if (filter === "needsHuman" && !item.needsHuman) return false;
      return !lowered || item.contactName.toLocaleLowerCase().includes(lowered) || item.messages.some((message) => message.body.toLocaleLowerCase().includes(lowered));
    });
  }, [conversations, filter, query]);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Inbox</Text>
            <Text style={styles.subtitle}>See what AwayAI handled while you were away.</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.green} />
          </View>
        </View>

        <View style={styles.search}>
          <Ionicons name="search-outline" size={19} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search people or messages"
            placeholderTextColor="#9AA6A1"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9AA6A1" />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filters}>
          <FilterChip label="All chats" selected={filter === "all"} onPress={() => setFilter("all")} />
          <FilterChip
            label={`Needs you (${conversations.filter((item) => item.needsHuman).length})`}
            selected={filter === "needsHuman"}
            onPress={() => setFilter("needsHuman")}
          />
        </View>

        {visible.length ? (
          <View style={styles.list}>
            {visible.map((conversation) => {
              const last = conversation.messages.at(-1);
              const isExpanded = expanded === conversation.id;
              return (
                <Pressable
                  key={conversation.id}
                  onPress={() => setExpanded(isExpanded ? null : conversation.id)}
                  style={({ pressed }) => [styles.chatCard, pressed && styles.pressed]}
                >
                  <View style={styles.chatTop}>
                    <View style={styles.avatarWrap}>
                      <Avatar name={conversation.contactName} size={48} />
                      {conversation.unread ? <View style={styles.unreadDot} /> : null}
                    </View>
                    <View style={styles.chatCopy}>
                      <View style={styles.nameRow}>
                        <Text style={styles.name}>{conversation.contactName}</Text>
                        <Text style={styles.time}>{relativeTime(conversation.updatedAt)}</Text>
                      </View>
                      <Text style={styles.message} numberOfLines={isExpanded ? 4 : 2}>
                        {last?.body ?? "No message preview"}
                      </Text>
                      <View style={styles.metaRow}>
                        {last?.role === "assistant" ? (
                          <Pill label="AI replied" icon="sparkles" tone="green" />
                        ) : (
                          <Pill label="Received" icon="arrow-down" tone="neutral" />
                        )}
                        {conversation.needsHuman ? (
                          <Pill label="Needs you" icon="person" tone="amber" />
                        ) : null}
                      </View>
                    </View>
                  </View>
                  {isExpanded ? (
                    <View style={styles.threadPreview}>
                      <View style={styles.threadLabelRow}>
                        <Text style={styles.threadLabel}>LATEST EXCHANGE</Text>
                        <Text style={styles.threadCount}>{conversation.messageCount} messages</Text>
                      </View>
                      {conversation.messages.map((message) => (
                        <View
                          key={message.id}
                          style={[
                            styles.bubble,
                            message.role === "contact" ? styles.contactBubble : styles.assistantBubble,
                          ]}
                        >
                          <Text style={styles.bubbleLabel}>
                            {message.role === "contact" ? conversation.contactName : "AwayAI"}
                          </Text>
                          <Text style={styles.bubbleText}>{message.body}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="mail-open-outline"
            title="Nothing here yet"
            description={filter === "needsHuman" ? "No conversations need your attention." : "New WhatsApp conversations will appear here."}
          />
        )}
      </View>
    </ScrollView>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, selected && styles.filterSelected]}>
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 118 },
  container: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 20 },
  header: { paddingTop: 14, paddingBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.ink, fontSize: 29, fontWeight: "900", letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 5 },
  headerIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  search: { height: 50, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 9 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14, outlineStyle: "none" } as never,
  filters: { flexDirection: "row", gap: 9, marginTop: 14, marginBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "#EAEEEA", borderRadius: radii.pill },
  filterSelected: { backgroundColor: colors.ink },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  filterTextSelected: { color: "#FFFFFF" },
  list: { gap: 11 },
  chatCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radii.lg, padding: 15 },
  pressed: { opacity: 0.85 },
  chatTop: { flexDirection: "row", gap: 12 },
  avatarWrap: { position: "relative" },
  unreadDot: { position: "absolute", right: 0, top: 0, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: colors.surface, backgroundColor: colors.green },
  chatCopy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { color: colors.ink, fontSize: 15, fontWeight: "900" },
  time: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  message: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 5 },
  metaRow: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },
  threadPreview: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 15, paddingTop: 14, gap: 8 },
  threadLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  threadLabel: { color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  threadCount: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  bubble: { maxWidth: "90%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  contactBubble: { backgroundColor: "#F0F2EF", alignSelf: "flex-start" },
  assistantBubble: { backgroundColor: colors.mintSoft, alignSelf: "flex-end" },
  bubbleLabel: { color: colors.greenDark, fontSize: 9, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 3 },
  bubbleText: { color: colors.ink, fontSize: 12, lineHeight: 17 },
});
