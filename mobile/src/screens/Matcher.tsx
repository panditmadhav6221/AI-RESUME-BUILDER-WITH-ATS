import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { aiApi, atsApi, resumesApi } from "../api";
import {
  AtsGauge,
  Button,
  Card,
  Chip,
  ErrorBanner,
  Loading,
  SectionHeading,
  TextField,
} from "../components";
import { showDialog } from "../dialog";
import { useNav } from "../navigation";
import { resumeToPlainText } from "../resumeText";
import { colors, fontSize, radius, shadows, spacing } from "../theme";
import { JDAnalysis, ResumeData } from "../types";
import { getUserId } from "../userStore";

interface MatcherProps {
  resumeId?: string;
  resume?: ResumeData;
}

export function MatcherScreen({ resumeId, resume }: MatcherProps) {
  const { navigate } = useNav();
  const [data, setData] = useState<ResumeData | null>(resume ?? null);
  const [jd, setJd] = useState("");
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null);
  const [resumeRefId, setResumeRefId] = useState<string | null>(resumeId ?? null);
  const [resumeTitle, setResumeTitle] = useState<string>("Active Resume");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const userId = await getUserId();
        if (data) return;
        if (resumeId) {
          const full = await resumesApi.get(userId, resumeId);
          setResumeRefId(full.id);
          setResumeTitle(full.title);
          setData(full.data);
          return;
        }
        const list = await resumesApi.list(userId);
        if (list.length > 0) {
          const full = list[0].data ? list[0] : await resumesApi.get(userId, list[0].id);
          setResumeRefId(full.id);
          setResumeTitle(full.title);
          setData(full.data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [resumeId, resume, data]);

  const analyze = () =>
    void (async () => {
      if (!jd.trim()) {
        setError("Please paste a Job Description first.");
        return;
      }
      setBusy("Scanning & Matching with JD…");
      setError("");
      try {
        const result = await aiApi.analyzeJd(jd, data ? resumeToPlainText(data) : "");
        setAnalysis(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy("");
      }
    });

  const insertMissing = () => {
    if (!analysis || !analysis.missingSkills.length || !resumeRefId) return;
    const names = analysis.missingSkills.map((s) => s.name);
    void (async () => {
      setBusy("Injecting keywords into Resume…");
      setError("");
      try {
        const userId = await getUserId();
        const result = await resumesApi.insertKeywords(userId, resumeRefId, names, "skills");
        setData(result.data);
        showDialog(
          "Keywords Injected!",
          `Added ${result.insertedKeywords.length} missing skill(s) into your resume: ${result.insertedKeywords.join(", ")}`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy("");
      }
    })();
  };

  const reScore = () => {
    if (!data) return;
    void (async () => {
      setBusy("Calculating overall ATS score…");
      setError("");
      try {
        const a = await atsApi.score(data);
        showDialog(
          `ATS Score: ${a.score}/100`,
          a.summary +
            (a.issues.length ? `\n\n${a.issues.map((i) => `• ${i.message}`).join("\n")}` : ""),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy("");
      }
    })();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? <ErrorBanner message={error} /> : null}

        {/* Selected Resume Banner */}
        <Card style={styles.targetResumeCard}>
          <View style={styles.targetResumeRow}>
            <View style={styles.resumeIconWrap}>
              <Text style={{ fontSize: 18 }}>📄</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.targetResumeLabel}>COMPARING AGAINST RESUME</Text>
              <Text style={styles.targetResumeTitle}>{resumeTitle}</Text>
            </View>
            {data ? (
              <Button
                title="View Resume"
                variant="ghost"
                small
                onPress={() =>
                  navigate({
                    name: "preview",
                    resumeId: resumeRefId ?? undefined,
                    title: resumeTitle,
                    data,
                  })
                }
              />
            ) : null}
          </View>
        </Card>

        {/* JD Input Card */}
        <Card style={styles.inputCard}>
          <SectionHeading
            title="Paste Job Description (JD)"
            subtitle="The AI will extract required keywords, hard & soft skills, and compare them against your resume."
          />
          <TextField
            multiline
            numberOfLines={7}
            value={jd}
            onChangeText={setJd}
            placeholder="Paste complete job description requirements here (e.g. Responsibilities, Qualifications, Technical Stack)…"
            style={styles.jdInput}
          />
          <Button
            title={busy || "Run ATS Keyword Match"}
            icon="🎯"
            variant="primary"
            onPress={analyze}
            loading={busy.includes("Matching")}
            style={{ marginTop: spacing.sm }}
          />
        </Card>

        {busy && !analysis ? <Loading label={busy} /> : null}

        {/* Analysis Results */}
        {analysis ? (
          <View style={styles.resultsContainer}>
            {/* Match Percentage Card */}
            <Card style={styles.matchScoreCard}>
              <View style={styles.matchScoreRow}>
                <AtsGauge score={analysis.matchPercentage} size="large" />
                <View style={styles.matchScoreInfo}>
                  <Text style={styles.matchPercentageTitle}>
                    {analysis.matchPercentage >= 75
                      ? "High Keyword Alignment 🎉"
                      : analysis.matchPercentage >= 50
                        ? "Moderate Match"
                        : "Low Match — Gaps Found"}
                  </Text>
                  <Text style={styles.matchPercentageSubtitle}>
                    {analysis.matchedSkills.length} of{" "}
                    {analysis.matchedSkills.length + analysis.missingSkills.length} key terms present
                    in your resume.
                  </Text>
                </View>
              </View>

              {analysis.missingSkills.length > 0 && resumeRefId ? (
                <Button
                  title="1-Tap Insert Missing Skills"
                  icon="⚡"
                  variant="sparkle"
                  onPress={insertMissing}
                  loading={busy.includes("Injecting")}
                  style={{ marginTop: spacing.md }}
                />
              ) : null}
            </Card>

            {/* Matched Skills */}
            <Card style={styles.skillsSectionCard}>
              <SectionHeading
                title={`Matched Keywords (${analysis.matchedSkills.length})`}
                subtitle="Skills found in both the job description and your resume"
              />
              <View style={styles.chipsCloud}>
                {analysis.matchedSkills.length > 0 ? (
                  analysis.matchedSkills.map((s, idx) => (
                    <Chip key={idx} label={s.name} tone="match" icon="✓" />
                  ))
                ) : (
                  <Text style={styles.noneText}>No direct keyword matches yet.</Text>
                )}
              </View>
            </Card>

            {/* Missing Skills */}
            <Card style={styles.skillsSectionCard}>
              <SectionHeading
                title={`Missing Skills & Keywords (${analysis.missingSkills.length})`}
                subtitle="Key requirements found in JD that are absent from your resume"
              />
              <View style={styles.chipsCloud}>
                {analysis.missingSkills.length > 0 ? (
                  analysis.missingSkills.map((s, idx) => (
                    <Chip key={idx} label={s.name} tone="missing" icon="+" />
                  ))
                ) : (
                  <Text style={styles.noneText}>
                    Incredible! You match all extracted skill keywords.
                  </Text>
                )}
              </View>
            </Card>

            {/* AI Optimization Suggestions */}
            {analysis.suggestions && analysis.suggestions.length > 0 ? (
              <Card style={styles.suggestionsCard}>
                <SectionHeading
                  title="AI Actionable Recommendations"
                  subtitle="Strategic tweaks to increase candidate ranking"
                />
                {analysis.suggestions.map((sug, idx) => (
                  <View key={idx} style={styles.suggestionRow}>
                    <Text style={styles.suggestionBullet}>✦</Text>
                    <Text style={styles.suggestionText}>{sug}</Text>
                  </View>
                ))}
              </Card>
            ) : null}

            {/* Re-Score CTA */}
            {data ? (
              <View style={styles.reScoreActions}>
                <Button
                  title="Check Overall ATS Score"
                  icon="⚡"
                  variant="outline"
                  onPress={reScore}
                  loading={busy.includes("ATS score")}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Preview Tailored Resume"
                  icon="👁️"
                  variant="secondary"
                  onPress={() =>
                    navigate({
                      name: "preview",
                      resumeId: resumeRefId ?? undefined,
                      title: resumeTitle,
                      data,
                    })
                  }
                  style={{ flex: 1 }}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },

  // Target Resume
  targetResumeCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  targetResumeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  resumeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  targetResumeLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  targetResumeTitle: {
    fontSize: fontSize.sm + 1,
    fontWeight: "700",
    color: colors.text,
  },

  // Input Card
  inputCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  jdInput: {
    minHeight: 140,
    textAlignVertical: "top",
    fontSize: fontSize.sm,
    lineHeight: 20,
  },

  // Results
  resultsContainer: {
    marginTop: spacing.xs,
  },
  matchScoreCard: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  matchScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  matchScoreInfo: {
    flex: 1,
  },
  matchPercentageTitle: {
    fontSize: fontSize.lg,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  matchPercentageSubtitle: {
    fontSize: fontSize.xs + 1,
    color: colors.textMuted,
    lineHeight: 18,
  },

  // Skills
  skillsSectionCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  chipsCloud: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.xs,
  },
  noneText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: "italic",
  },

  // Suggestions
  suggestionsCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xs + 2,
    gap: spacing.xs + 2,
  },
  suggestionBullet: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 2,
  },
  suggestionText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },

  // Re-score
  reScoreActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
