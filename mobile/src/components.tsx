import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

import { colors, fontSize, radius, shadows, spacing } from "./theme";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost" | "accent" | "sparkle";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  small,
  icon,
  style,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: "#FFFFFF" },
    secondary: { bg: colors.surfaceSubtle, fg: colors.text, border: colors.border },
    outline: { bg: "transparent", fg: colors.primary, border: colors.primary },
    danger: { bg: colors.danger, fg: "#FFFFFF" },
    ghost: { bg: "transparent", fg: colors.primary },
    accent: { bg: colors.accent, fg: "#FFFFFF" },
    sparkle: { bg: colors.primaryLight, fg: colors.primary, border: colors.primary },
  };

  const p = palette[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          backgroundColor: p.bg,
          borderColor: p.border ?? "transparent",
          borderWidth: p.border ? 1.5 : 0,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        variant === "primary" && shadows.sm,
        small && styles.buttonSmall,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} size={small ? "small" : "small"} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Text style={[styles.buttonIcon, { color: p.fg }, small && styles.buttonIconSmall]}>{icon}</Text> : null}
          <Text style={[styles.buttonText, { color: p.fg }, small && styles.buttonTextSmall]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

interface TextFieldProps extends TextInputProps {
  label?: string;
  helper?: string;
  error?: string;
  editable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({
  label,
  helper,
  error,
  editable = true,
  style,
  containerStyle,
  ...props
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...props}
        editable={editable}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        placeholderTextColor={colors.textSubtle}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          editable === false && styles.inputDisabled,
          style,
        ]}
      />
      {error ? (
        <Text style={styles.fieldErrorText}>{error}</Text>
      ) : helper ? (
        <Text style={styles.fieldHelperText}>{helper}</Text>
      ) : null}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  elevated = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  elevated?: boolean;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          elevated && shadows.sm,
          pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[styles.card, elevated && shadows.sm, style]}>
      {children}
    </View>
  );
}

export function SectionHeading({
  title,
  subtitle,
  rightAction,
}: {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightAction ? <View style={styles.sectionRightAction}>{rightAction}</View> : null}
    </View>
  );
}

export function Chip({
  label,
  onPress,
  tone = "default",
  icon,
  style,
}: {
  label: string;
  onPress?: () => void;
  tone?: "default" | "match" | "missing" | "primary" | "accent";
  icon?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const configs = {
    default: { bg: colors.surfaceSubtle, fg: colors.text, border: colors.border },
    match: { bg: colors.successBg, fg: colors.successDark, border: "#86EFAC" },
    missing: { bg: colors.dangerBg, fg: colors.dangerDark, border: "#FCA5A5" },
    primary: { bg: colors.primaryLight, fg: colors.primary, border: "#C7D2FE" },
    accent: { bg: colors.accentLight, fg: colors.accent, border: "#DDD6FE" },
  };
  const cfg = configs[tone];

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: cfg.bg, borderColor: cfg.border, borderWidth: 1 },
        style,
      ]}
    >
      {icon ? <Text style={[styles.chipIcon, { color: cfg.fg }]}>{icon}</Text> : null}
      <Text style={[styles.chipText, { color: cfg.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ score }: { score: number }) {
  const color = score >= 85 ? colors.success : score >= 70 ? colors.warning : colors.danger;
  const bg = score >= 85 ? colors.successBg : score >= 70 ? colors.warningBg : colors.dangerBg;
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: color }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{score} ATS</Text>
    </View>
  );
}

export function AtsGauge({
  score,
  size = "medium",
}: {
  score: number;
  size?: "small" | "medium" | "large";
}) {
  const color = score >= 85 ? colors.success : score >= 70 ? colors.warning : colors.danger;
  const bg = score >= 85 ? colors.successBg : score >= 70 ? colors.warningBg : colors.dangerBg;
  const label = score >= 85 ? "ATS Ready" : score >= 70 ? "Good Potential" : "Needs Polish";

  const isLarge = size === "large";
  const isSmall = size === "small";

  return (
    <View style={[styles.gaugeContainer, isLarge && styles.gaugeContainerLarge]}>
      <View
        style={[
          styles.gaugeRing,
          {
            borderColor: color,
            backgroundColor: bg,
            width: isLarge ? 80 : isSmall ? 48 : 64,
            height: isLarge ? 80 : isSmall ? 48 : 64,
            borderRadius: 999,
          },
        ]}
      >
        <Text
          style={[
            styles.gaugeScoreText,
            { color, fontSize: isLarge ? 24 : isSmall ? 15 : 19 },
          ]}
        >
          {score}
        </Text>
        <Text style={[styles.gaugeMaxText, { color }]}>/100</Text>
      </View>
      {!isSmall ? (
        <View style={styles.gaugeInfo}>
          <Text style={[styles.gaugeLabel, { color }]}>{label}</Text>
          <Text style={styles.gaugeSubtitle}>ATS Compatibility</Text>
        </View>
      ) : null}
    </View>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accentColor = colors.primary,
  onPress,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  accentColor?: string;
  onPress?: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <Text style={styles.statCardTitle}>{title}</Text>
        {icon ? (
          <View style={[styles.statCardIconWrap, { backgroundColor: `${accentColor}15` }]}>
            <Text style={{ fontSize: 16 }}>{icon}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.statCardValue, { color: accentColor }]}>{value}</Text>
      {subtitle ? <Text style={styles.statCardSubtitle}>{subtitle}</Text> : null}
    </Card>
  );
}

export function PillTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { key: T; label: string; icon?: string }[];
  activeTab: T;
  onTabChange: (key: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pillTabsContainer}
    >
      {tabs.map((t) => {
        const active = t.key === activeTab;
        return (
          <Pressable
            key={t.key}
            onPress={() => onTabChange(t.key)}
            style={[
              styles.pillTab,
              active && styles.pillTabActive,
            ]}
          >
            {t.icon ? (
              <Text style={[styles.pillTabIcon, active && styles.pillTabIconActive]}>
                {t.icon}
              </Text>
            ) : null}
            <Text style={[styles.pillTabText, active && styles.pillTabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function AiAssistantModal({
  visible,
  title = "AI Optimization",
  subtitle = "Review proposed changes",
  originalText,
  proposedText,
  onAccept,
  onDiscard,
  onRegenerate,
  loading,
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  originalText?: string;
  proposedText: string;
  onAccept: () => void;
  onDiscard: () => void;
  onRegenerate?: () => void;
  loading?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDiscard}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalSparkleBadge}>
                <Text style={{ fontSize: 16 }}>✨</Text>
              </View>
              <View>
                <Text style={styles.modalTitle}>{title}</Text>
                <Text style={styles.modalSubtitle}>{subtitle}</Text>
              </View>
            </View>
            <Pressable onPress={onDiscard} hitSlop={12} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            {originalText ? (
              <View style={styles.diffBlock}>
                <Text style={styles.diffLabel}>ORIGINAL</Text>
                <Text style={styles.diffOriginalText}>{originalText}</Text>
              </View>
            ) : null}

            <View style={[styles.diffBlock, styles.diffBlockProposed]}>
              <View style={styles.diffHeaderRow}>
                <Text style={styles.diffLabelProposed}>AI ENHANCED (ATS-OPTIMIZED)</Text>
                <Text style={styles.diffBadge}>✦ Action + Quantified</Text>
              </View>
              {loading ? (
                <View style={{ paddingVertical: spacing.lg, alignItems: "center" }}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.loadingText}>Crafting perfection…</Text>
                </View>
              ) : (
                <Text style={styles.diffProposedText}>{proposedText}</Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            {onRegenerate ? (
              <Button
                title="Regenerate"
                variant="outline"
                small
                icon="🔄"
                onPress={onRegenerate}
                disabled={loading}
                style={{ flex: 1 }}
              />
            ) : null}
            <Button
              title="Apply Changes"
              variant="primary"
              small
              icon="✓"
              onPress={onAccept}
              disabled={loading || !proposedText}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonSmall: {
    minHeight: 38,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
  },
  buttonIcon: {
    fontSize: 16,
  },
  buttonIconSmall: {
    fontSize: 14,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  buttonTextSmall: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.textMuted,
  },
  fieldHelperText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  fieldErrorText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: 4,
    fontWeight: "500",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionRightAction: {
    marginLeft: spacing.sm,
    alignItems: "flex-end",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  chipIcon: {
    fontSize: 12,
  },
  chipText: {
    fontSize: fontSize.xs + 1,
    fontWeight: "600",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm + 2,
    borderWidth: 1,
    alignSelf: "flex-start",
    gap: 5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontWeight: "700",
    fontSize: fontSize.xs,
  },
  gaugeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  gaugeContainerLarge: {
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  gaugeRing: {
    borderWidth: 3.5,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeScoreText: {
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
  },
  gaugeMaxText: {
    fontSize: 9,
    fontWeight: "700",
    opacity: 0.8,
    marginTop: -2,
  },
  gaugeInfo: {
    justifyContent: "center",
  },
  gaugeLabel: {
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  gaugeSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  statCardTitle: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statCardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  statCardValue: {
    fontSize: fontSize.xl,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  statCardSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  pillTabsContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  pillTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  pillTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillTabIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  pillTabIconActive: {
    color: "#FFFFFF",
  },
  pillTabText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textMuted,
  },
  pillTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "85%",
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  modalSparkleBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "700",
  },
  modalBody: {
    marginVertical: spacing.sm,
  },
  diffBlock: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  diffBlockProposed: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  diffHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  diffLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  diffLabelProposed: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.successDark,
    letterSpacing: 0.5,
  },
  diffBadge: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.successDark,
    backgroundColor: colors.successBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  diffOriginalText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    textDecorationLine: "line-through",
  },
  diffProposedText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
    fontWeight: "500",
  },
  modalFooter: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.dangerBg,
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    color: colors.dangerDark,
    fontSize: fontSize.sm,
    flex: 1,
    fontWeight: "500",
  },
  loading: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
});