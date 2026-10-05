import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { aiApi, resumesApi } from "../api";
import {
  Button,
  Card,
  ErrorBanner,
  Loading,
  SectionHeading,
  TextField,
} from "../components";
import { showDialog } from "../dialog";
import { useNav } from "../navigation";
import { colors, fontSize, radius, shadows, spacing } from "../theme";
import { CoverLetterResult, ResumeData } from "../types";
import { getUserId } from "../userStore";

interface CoverLetterProps {
  resumeId?: string;
  resume?: ResumeData;
}

type Tone = "professional" | "enthusiastic" | "executive";

const TONES: { key: Tone; label: string; icon: string }[] = [
  { key: "professional", label: "Professional", icon: "💼" },
  { key: "enthusiastic", label: "Enthusiastic", icon: "🚀" },
  { key: "executive", label: "Executive", icon: "🏛️" },
];

export function CoverLetterScreen({ resumeId, resume }: CoverLetterProps) {
  const { navigate } = useNav();
  const [data, setData] = useState<ResumeData | null>(resume ?? null);
  const [resumeTitle, setResumeTitle] = useState("Active Resume");
  const [jd, setJd] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [result, setResult] = useState<CoverLetterResult | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const userId = await getUserId();
        if (data) return;
        if (resumeId) {
          const full = await resumesApi.get(userId, resumeId);
          setResumeTitle(full.title);
          setTargetRole(full.targetRole ?? "");
          setData(full.data);
          return;
        }
        const list = await resumesApi.list(userId);
        if (list.length > 0) {
          const full = list[0].data ? list[0] : await resumesApi.get(userId, list[0].id);
          setResumeTitle(full.title);
          setTargetRole(full.targetRole ?? "");
          setData(full.data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [resumeId, resume, data]);

  const generate = () =>
    void (async () => {
      if (!data) {
        setError("Please create or select a resume first.");
        return;
      }
      if (!jd.trim()) {
        setError("Please paste the target Job Description.");
        return;
      }
      setBusy("Crafting tailored cover letter…");
      setError("");
      try {
        const res = await aiApi.generateCoverLetter(
          data,
          jd,
          companyName || null,
          targetRole || null,
          tone,
        );
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy("");
      }
    });

  const copyText = () => {
    if (!result) return;
    showDialog(
      "Cover Letter Ready",
      "Full letter text formatted for your application.\n\nYou can select and copy the text directly from the preview card below.",
      [{ text: "Awesome!" }],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? <ErrorBanner message={error} /> : null}

        {/* Top Resume Indicator */}
        <Card style={styles.resumeInfoCard}>
          <View style={styles.resumeInfoRow}>
            <Text style={{ fontSize: 18 }}>✉️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.resumeInfoLabel}>LINKED RESUME</Text>
              <Text style={styles.resumeInfoTitle}>{resumeTitle}</Text>
            </View>
            <Text style={styles.candidateName}>
              {data?.contact.fullName || "Candidate"}
            </Text>
          </View>
        </Card>

        {/* Input Form */}
        <Card style={styles.formCard}>
          <SectionHeading
            title="Target Role & Job Description"
            subtitle="The AI will highlight your most relevant experience to match this role."
          />

          <TextField
            label="Company Name"
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="e.g. Google, Stripe, Microsoft"
          />
          <TextField
            label="Target Job Title"
            value={targetRole}
            onChangeText={setTargetRole}
            placeholder="e.g. Senior Frontend Engineer, Product Manager"
          />

          {/* Tone Selector */}
          <Text style={styles.toneLabel}>VOICE & TONE</Text>
          <View style={styles.tonePillsRow}>
            {TONES.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setTone(t.key)}
                style={[
                  styles.tonePill,
                  tone === t.key && styles.tonePillActive,
                ]}
              >
                <Text style={styles.toneIcon}>{t.icon}</Text>
                <Text
                  style={[
                    styles.toneText,
                    tone === t.key && styles.toneTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextField
            label="Job Description (Responsibilities & Requirements) *"
            multiline
            numberOfLines={6}
            value={jd}
            onChangeText={setJd}
            placeholder="Paste complete job description or key responsibilities here…"
            style={styles.jdInput}
          />

          <Button
            title={busy || "Generate Tailored Cover Letter"}
            icon="✨"
            variant="primary"
            onPress={generate}
            loading={Boolean(busy)}
            style={{ marginTop: spacing.sm }}
          />
        </Card>

        {busy && !result ? <Loading label={busy} /> : null}

        {/* Generated Cover Letter Document Preview */}
        {result ? (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <SectionHeading
                title="Generated Cover Letter"
                subtitle={`Aligned with ${companyName || "the company"} • ${tone.toUpperCase()} tone`}
              />
              <Button
                title="Copy Text"
                icon="📋"
                variant="outline"
                small
                onPress={copyText}
              />
            </View>

            <View style={[styles.letterPaper, shadows.md]}>
              {/* Header */}
              <View style={styles.letterHeader}>
                <Text style={styles.senderName}>
                  {data?.contact.fullName || "Candidate"}
                </Text>
                <Text style={styles.senderContact}>
                  {[data?.contact.email, data?.contact.phone, data?.contact.location]
                    .filter(Boolean)
                    .join("  |  ")}
                </Text>
              </View>

              <View style={styles.letterDivider} />

              <Text style={styles.salutationText}>{result.salutation}</Text>

              <Text style={styles.paragraphText}>{result.opening}</Text>

              {result.bodyParagraphs.map((para, idx) => (
                <Text key={idx} style={styles.paragraphText}>
                  {para}
                </Text>
              ))}

              <Text style={styles.paragraphText}>{result.closing}</Text>

              <Text style={styles.signoffText}>{result.signoff}</Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.bottomActions}>
              <Button
                title="Regenerate Letter"
                icon="🔄"
                variant="secondary"
                onPress={generate}
                style={{ flex: 1 }}
              />
              <Button
                title="Back to Resumes"
                variant="outline"
                onPress={() => navigate({ name: "dashboard" })}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },

  resumeInfoCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  resumeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  resumeInfoLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  resumeInfoTitle: {
    fontSize: fontSize.sm + 1,
    fontWeight: "700",
    color: colors.text,
  },
  candidateName: {
    fontSize: fontSize.xs + 1,
    fontWeight: "600",
    color: colors.primary,
  },

  formCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  toneLabel: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  tonePillsRow: {
    flexDirection: "row",
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  tonePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  tonePillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  toneIcon: { fontSize: 13 },
  toneText: {
    fontSize: fontSize.xs + 1,
    fontWeight: "600",
    color: colors.textMuted,
  },
  toneTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  jdInput: {
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: fontSize.sm,
    lineHeight: 20,
  },

  resultContainer: {
    marginTop: spacing.sm,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  letterPaper: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  letterHeader: {
    marginBottom: spacing.md,
  },
  senderName: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  senderContact: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  letterDivider: {
    height: 1.5,
    backgroundColor: colors.text,
    marginBottom: spacing.lg,
  },
  salutationText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  paragraphText: {
    fontSize: 12.5,
    color: "#1E293B",
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  signoffText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  bottomActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
