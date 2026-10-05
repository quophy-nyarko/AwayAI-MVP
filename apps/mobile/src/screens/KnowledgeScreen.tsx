import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Pill, SectionTitle } from "../components/ui";
import { colors, radii } from "../theme";
import type { AssistantSettings } from "../types";

interface Props {
  settings: AssistantSettings;
  onSave: (patch: Partial<AssistantSettings>) => Promise<void>;
  onSimulate: (message: string) => Promise<{ text: string; needsHuman: boolean }>;
  onImportChat: (input: { contactName: string; waId: string; transcript: string }) => Promise<number>;
}

const tones: Array<{ value: AssistantSettings["tone"]; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: "warm", label: "Warm", icon: "heart-outline" },
  { value: "professional", label: "Professional", icon: "briefcase-outline" },
  { value: "casual", label: "Casual", icon: "happy-outline" },
  { value: "brief", label: "Brief", icon: "flash-outline" },
];

export function KnowledgeScreen({ settings, onSave, onSimulate, onImportChat }: Props) {
  const [knowledge, setKnowledge] = useState(settings.knowledge);
  const [awayMessage, setAwayMessage] = useState(settings.awayMessage);
  const [tone, setTone] = useState(settings.tone);
  const [saving, setSaving] = useState(false);
  const [testMessage, setTestMessage] = useState("What are your working hours?");
  const [testReply, setTestReply] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [contactName, setContactName] = useState("");
  const [waId, setWaId] = useState("");
  const [transcript, setTranscript] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setKnowledge(settings.knowledge);
    setAwayMessage(settings.awayMessage);
    setTone(settings.tone);
  }, [settings]);

  async function save() {
    setSaving(true);
    try {
      await onSave({ knowledge, awayMessage, tone });
      Alert.alert("Saved", "AwayAI will use these instructions for future replies.");
    } catch (error) {
      Alert.alert("Couldn't save", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function runTest() {
    if (!testMessage.trim()) return;
    setTesting(true);
    setTestReply(null);
    try {
      if (knowledge !== settings.knowledge || awayMessage !== settings.awayMessage || tone !== settings.tone) {
        await onSave({ knowledge, awayMessage, tone });
      }
      const result = await onSimulate(testMessage.trim());
      setTestReply(result.text);
    } catch (error) {
      setTestReply(error instanceof Error ? error.message : "The test could not run.");
    } finally {
      setTesting(false);
    }
  }

  async function importChat() {
    if (!contactName.trim() || !waId.trim() || !transcript.trim()) {
      Alert.alert("Missing details", "Add the contact name, WhatsApp number, and exported chat text.");
      return;
    }
    setImporting(true);
    try {
      const count = await onImportChat({
        contactName: contactName.trim(),
        waId: waId.trim(),
        transcript: transcript.trim(),
      });
      setTranscript("");
      Alert.alert("Chat imported", `${count} messages are now available only inside ${contactName.trim()}'s thread.`);
    } catch (error) {
      Alert.alert("Couldn't import", error instanceof Error ? error.message : "Please check the export format.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.sparkleBox}>
            <Ionicons name="sparkles" size={23} color={colors.green} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Teach AwayAI</Text>
            <Text style={styles.subtitle}>You decide exactly what it knows and can share.</Text>
          </View>
        </View>

        <Card style={styles.guardrailCard}>
          <View style={styles.guardrailIcon}>
            <Ionicons name="lock-closed-outline" size={19} color={colors.greenDark} />
          </View>
          <View style={styles.guardrailCopy}>
            <Text style={styles.guardrailTitle}>Previous chats stay separated</Text>
            <Text style={styles.guardrailText}>
              A person can get context from their own earlier messages, never from someone else's conversation.
            </Text>
          </View>
        </Card>

        <SectionTitle title="Previous chat context" />
        <View style={styles.importCard}>
          <Pressable style={styles.importHeader} onPress={() => setShowImport((value) => !value)}>
            <View style={styles.importIcon}>
              <Ionicons name="document-text-outline" size={20} color={colors.green} />
            </View>
            <View style={styles.importCopy}>
              <Text style={styles.importTitle}>Import one exported chat</Text>
              <Text style={styles.importText}>Seed context from before AwayAI was connected.</Text>
            </View>
            <Ionicons name={showImport ? "chevron-up" : "chevron-down"} size={19} color={colors.muted} />
          </Pressable>
          {showImport ? (
            <View style={styles.importForm}>
              <Text style={styles.fieldLabel}>CONTACT NAME</Text>
              <TextInput value={contactName} onChangeText={setContactName} placeholder="Maya" placeholderTextColor="#9AA6A1" style={styles.smallInput} />
              <Text style={styles.fieldLabel}>WHATSAPP NUMBER WITH COUNTRY CODE</Text>
              <TextInput value={waId} onChangeText={setWaId} keyboardType="phone-pad" placeholder="971501234567" placeholderTextColor="#9AA6A1" style={styles.smallInput} />
              <Text style={styles.fieldLabel}>EXPORTED CHAT TEXT</Text>
              <TextInput
                value={transcript}
                onChangeText={setTranscript}
                multiline
                textAlignVertical="top"
                placeholder="Paste the text from WhatsApp's Export chat here…"
                placeholderTextColor="#9AA6A1"
                style={styles.transcriptInput}
              />
              <Text style={styles.importPrivacy}>Only use a chat you are authorized to process. It is stored under this contact's thread and is not global knowledge.</Text>
              <Button label="Import conversation" icon="download-outline" onPress={importChat} loading={importing} variant="secondary" />
            </View>
          ) : null}
        </View>

        <SectionTitle title="Your approved information" />
        <View style={styles.fieldCard}>
          <View style={styles.fieldTop}>
            <View>
              <Text style={styles.fieldLabel}>WHAT CAN IT ANSWER?</Text>
              <Text style={styles.fieldHint}>Services, hours, prices, booking rules, links and FAQs</Text>
            </View>
            <Pill label={`${knowledge.length}/20k`} tone="neutral" />
          </View>
          <TextInput
            value={knowledge}
            onChangeText={setKnowledge}
            multiline
            maxLength={20_000}
            textAlignVertical="top"
            placeholder="Example: We are open Monday–Friday, 9 AM–6 PM. A consultation costs..."
            placeholderTextColor="#9AA6A1"
            style={styles.knowledgeInput}
          />
          <View style={styles.tipRow}>
            <Ionicons name="bulb-outline" size={16} color={colors.amber} />
            <Text style={styles.tipText}>Use one fact per line. Never paste passwords or private conversations here.</Text>
          </View>
        </View>

        <SectionTitle title="How it introduces itself" />
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>AWAY DISCLOSURE</Text>
          <TextInput
            value={awayMessage}
            onChangeText={setAwayMessage}
            multiline
            maxLength={500}
            placeholder="Auto-reply: I am not available at the moment..."
            placeholderTextColor="#9AA6A1"
            style={styles.disclosureInput}
          />
          <View style={styles.requiredRow}>
            <Ionicons name="checkmark-circle" size={15} color={colors.green} />
            <Text style={styles.requiredText}>Added to every AI reply so people always know you are away.</Text>
          </View>
        </View>

        <SectionTitle title="Voice & tone" />
        <View style={styles.toneGrid}>
          {tones.map((item) => {
            const selected = item.value === tone;
            return (
              <Pressable
                key={item.value}
                onPress={() => setTone(item.value)}
                style={[styles.toneCard, selected && styles.toneSelected]}
              >
                <Ionicons name={item.icon} size={19} color={selected ? colors.green : colors.muted} />
                <Text style={[styles.toneText, selected && styles.toneTextSelected]}>{item.label}</Text>
                {selected ? <Ionicons name="checkmark-circle" size={17} color={colors.green} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Button label="Save AI instructions" icon="checkmark" onPress={save} loading={saving} />

        <SectionTitle title="Try a message" />
        <Card>
          <Text style={styles.testLabel}>PREVIEW BEFORE GOING LIVE</Text>
          <View style={styles.testRow}>
            <TextInput
              value={testMessage}
              onChangeText={setTestMessage}
              placeholder="Ask a question as a contact"
              placeholderTextColor="#9AA6A1"
              style={styles.testInput}
            />
            <Pressable onPress={runTest} style={styles.sendButton} disabled={testing}>
              <Ionicons name={testing ? "hourglass-outline" : "arrow-up"} size={19} color="#FFFFFF" />
            </Pressable>
          </View>
          {testReply ? (
            <View style={styles.replyPreview}>
              <View style={styles.replyHeader}>
                <Ionicons name="sparkles" size={14} color={colors.green} />
                <Text style={styles.replyLabel}>AWAYAI REPLY</Text>
              </View>
              <Text style={styles.replyText}>{testReply}</Text>
            </View>
          ) : null}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 118 },
  container: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 20 },
  header: { paddingTop: 14, paddingBottom: 20, flexDirection: "row", alignItems: "center", gap: 13 },
  sparkleBox: { width: 48, height: 48, borderRadius: 17, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 28, fontWeight: "900", letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  guardrailCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.mintSoft },
  guardrailIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  guardrailCopy: { flex: 1 },
  guardrailTitle: { color: colors.greenDark, fontSize: 13, fontWeight: "900" },
  guardrailText: { color: "#57726A", fontSize: 11, lineHeight: 16, marginTop: 3 },
  importCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  importHeader: { flexDirection: "row", alignItems: "center", gap: 11, padding: 15 },
  importIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  importCopy: { flex: 1 },
  importTitle: { color: colors.ink, fontSize: 13, fontWeight: "900" },
  importText: { color: colors.muted, fontSize: 11, marginTop: 3 },
  importForm: { borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: "#FAFBF9", padding: 15, gap: 9 },
  smallInput: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 12, fontSize: 13 },
  transcriptInput: { minHeight: 120, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, color: colors.ink, padding: 12, fontSize: 12, lineHeight: 18 },
  importPrivacy: { color: colors.muted, fontSize: 10, lineHeight: 15, marginBottom: 2 },
  fieldCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 4 },
  fieldTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  fieldLabel: { color: colors.ink, fontSize: 11, fontWeight: "900", letterSpacing: 0.9 },
  fieldHint: { color: colors.muted, fontSize: 11, marginTop: 4 },
  knowledgeInput: { minHeight: 180, color: colors.ink, fontSize: 14, lineHeight: 21, backgroundColor: "#F7F9F6", borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, padding: 13, marginTop: 14 },
  disclosureInput: { minHeight: 86, color: colors.ink, fontSize: 14, lineHeight: 20, backgroundColor: "#F7F9F6", borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, padding: 13, marginTop: 11, textAlignVertical: "top" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 7, marginTop: 10 },
  tipText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
  requiredRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  requiredText: { color: colors.muted, fontSize: 11, flex: 1 },
  toneGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 20 },
  toneCard: { width: "48.5%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 50, borderRadius: radii.md, paddingHorizontal: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  toneSelected: { backgroundColor: colors.mintSoft, borderColor: "#9DCEBE" },
  toneText: { flex: 1, color: colors.muted, fontSize: 12, fontWeight: "800" },
  toneTextSelected: { color: colors.greenDark },
  testLabel: { color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  testRow: { flexDirection: "row", gap: 9, marginTop: 10 },
  testInput: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: "#F4F6F3", paddingHorizontal: 13, color: colors.ink, fontSize: 13 },
  sendButton: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  replyPreview: { backgroundColor: colors.mintSoft, borderRadius: radii.md, padding: 13, marginTop: 12 },
  replyHeader: { flexDirection: "row", alignItems: "center", gap: 5 },
  replyLabel: { color: colors.green, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  replyText: { color: colors.ink, fontSize: 12, lineHeight: 18, marginTop: 7 },
});
