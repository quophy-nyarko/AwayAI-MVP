import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii } from "../theme";

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const letters = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const palette = ["#DFF4EC", "#FCEBD9", "#E7E7FB", "#E5F1F8"];
  const index = [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % palette.length;
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: palette[index] },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>{letters || "?"}</Text>
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function Pill({
  label,
  tone = "green",
  icon,
}: {
  label: string;
  tone?: "green" | "amber" | "neutral" | "red";
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const toneStyle = {
    green: { backgroundColor: colors.mint, color: colors.greenDark },
    amber: { backgroundColor: colors.amberSoft, color: "#9A581C" },
    neutral: { backgroundColor: "#EEF1EE", color: colors.muted },
    red: { backgroundColor: colors.redSoft, color: colors.red },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.backgroundColor }]}>
      {icon ? <Ionicons name={icon} size={13} color={toneStyle.color} /> : null}
      <Text style={[styles.pillText, { color: toneStyle.color }]}>{label}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  icon,
  variant = "primary",
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
}) {
  const theme = {
    primary: { background: colors.green, color: "#FFFFFF", border: colors.green },
    secondary: { background: colors.surface, color: colors.ink, border: colors.line },
    ghost: { background: "transparent", color: colors.green, border: "transparent" },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.background, borderColor: theme.border },
        pressed && styles.pressed,
        (loading || disabled) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.color} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={theme.color} /> : null}
          <Text style={[styles.buttonText, { color: theme.color }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.green} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.greenDark,
    fontWeight: "800",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionAction: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "700",
  },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.55,
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 42,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyDescription: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 7,
    marginBottom: 18,
  },
});
