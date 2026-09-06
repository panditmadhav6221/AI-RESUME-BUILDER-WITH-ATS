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
  Chip,
  ErrorBanner,
  Loading,
  SectionHeading,
  TextField,
} from "../components";
import { useNav } from "../navigation";
import { colors, fontSize, radius, shadows, spacing } from "../theme";
import { InterviewPrepResult, ResumeData } from "../types";
import { getUserId } from "../userStore";

interface InterviewPrepProps {
  resumeId?: string;
  resume?: ResumeData;
}

export function InterviewPrepScreen({ resumeId, resume }: InterviewPrepProps) {
  const { navigate } = useNav();
  const [data, setData] = useState<ResumeData | null>(resume ?? null);
  const [resumeTitle, setResumeTitle] = useState("Active Resume");
  const [targetRole, setTargetRole] = useState("");
  const [jd, setJd] = useState("");
  const [result, setResult] = useState<InterviewPrepResult | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
        setError("Please build or select a resume first.");
        return;
      }
      setBusy("Generating interview simulation & STAR answers…");
      setError("");
      try {
        const res = await aiApi.interviewPrep(data, jd || null, targetRole || null);
        setResult(res);
        if (res.questions.length > 0) {
          setExpandedId(res.questions[0].id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy("");
      }
    });

  const toggleExpand = (id: string) => {
    setExpandedId((curr) => (curr === id ? null : id));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? <ErrorBanner message={error} /> : null}

        {/* Selected Resume Card */}
        <Card style={styles.resumeCard}>
          <View style={styles.resumeRow}>
            <Text style={{ fontSize: 18 }}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.resumeLabel}>INTERVIEW CANDIDATE</Text>
              <Text style={styles.resumeCandidate}>
                {data?.contact.fullName || "Candidate"} ({resumeTitle})
              </Text>
            </View>
          </View>
        </Card>

        {/* Setup Card */}
        <Card style={styles.formCard}>
          <SectionHeading
            title="Interview Target"
            subtitle="AI analyzes your experience bullets & target role to craft realistic STAR scenarios."
          />
          <TextField
            label="Target Position / Job Title"
            value={targetRole}
            onChangeText={setTargetRole}
            placeholder="e.g. Senior Software Engineer, Product Manager"
          />
          <TextField
            label="Target Job Description / Key Requirements (Optional)"
            multiline
            numberOfLines={4}
            value={jd}
            onChangeText={setJd}
            placeholder="Paste role requirements to extract tailored domain questions…"
            style={styles.jdInput}
          />
          <Button
            title={busy || "Simulate Interview & Generate STAR Answers"}
            icon="⚡"
            variant="primary"
            onPress={generate}
            loading={Boolean(busy)}
            style={{ marginTop: spacing.sm }}
          />
        </Card>

        {busy && !result ? <Loading label={busy} /> : null}

        {/* Results */}
        {result ? (
          <View style={styles.resultsContainer}>
            <SectionHeading
              title={`Curated Interview Questions (${result.questions.length})`}
              subtitle={`Role: ${result.role} • Tap any card to reveal model STAR answer`}
            />

            {result.questions.map((q, idx) => {
              const isExpanded = expandedId === q.id;
              const isBehavioral = q.type === "behavioral";
              return (
                <Card key={q.id || idx} style={styles.questionCard}>
                  <Pressable onPress={() => toggleExpand(q.id)}>
                    <View style={styles.questionHeader}>
                      <View style={styles.questionBadgeRow}>
                        <View style={styles.badgeLeftGroup}>
                          <View style={styles.qNumBadge}>
                            <Text style={styles.qNumText}>Q{idx + 1}</Text>
                          </View>
                          <Chip
                            label={q.type.toUpperCase()}
                            tone={isBehavioral ? "primary" : "accent"}
                          />
                        </View>
                        <View style={[styles.expandPill, isExpanded && styles.expandPillActive]}>
                          <Text style={[styles.expandHint, isExpanded && styles.expandHintActive]}>
                            {isExpanded ? "Collapse ▲" : "Reveal Answer ▼"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.questionText}>{q.question}</Text>
                      {q.whyAsked ? (
                        <View style={styles.whyAskedBox}>
                          <Text style={styles.whyAskedLabel}>Recruiter's intent: </Text>
                          <Text style={styles.whyAskedText}>{q.whyAsked}</Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>

                  {/* Expanded STAR Breakdown */}
                  {isExpanded && (
                    <View style={styles.answerContainer}>
                      {q.keyPointsToCover && q.keyPointsToCover.length > 0 ? (
                        <View style={styles.keyPointsBox}>
                          <Text style={styles.keyPointsTitle}>KEY POINTS TO HIT:</Text>
                          {q.keyPointsToCover.map((pt, pIdx) => (
                            <Text key={pIdx} style={styles.keyPointItem}>
                              • {pt}
                            </Text>
                          ))}
                        </View>
                      ) : null}

                      {q.sampleStarAnswer ? (
                        <View style={styles.starBox}>
                          <Text style={styles.starModelTitle}>
                            ★ MODEL ANSWER (STAR METHOD)
                          </Text>

                          {/* Situation */}
                          <View style={[styles.starPart, styles.starPartSituation]}>
                            <Text style={styles.starPartLabel}>SITUATION (Context):</Text>
                            <Text style={styles.starPartText}>
                              {q.sampleStarAnswer.situation}
                            </Text>
                          </View>

                          {/* Task */}
                          <View style={[styles.starPart, styles.starPartTask]}>
                            <Text style={styles.starPartLabel}>TASK (Goal / Challenge):</Text>
                            <Text style={styles.starPartText}>
                              {q.sampleStarAnswer.task}
                            </Text>
                          </View>

                          {/* Action */}
                          <View style={[styles.starPart, styles.starPartAction]}>
                            <Text style={styles.starPartLabel}>ACTION (Specific steps you took):</Text>
                            <Text style={styles.starPartText}>
                              {q.sampleStarAnswer.action}
                            </Text>
                          </View>

                          {/* Result */}
                          <View style={[styles.starPart, styles.starPartResult]}>
                            <Text style={styles.starPartLabel}>RESULT (Quantified Impact):</Text>
                            <Text style={styles.starPartText}>
                              {q.sampleStarAnswer.result}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  )}
                </Card>
              );
            })}

            {/* General Interview Tips */}
            {result.generalTips && result.generalTips.length > 0 ? (
              <Card style={styles.tipsCard}>
                <SectionHeading
                  title="Recruiter Tips for This Role"
                  subtitle="Proven strategies to convert to an offer"
                />
                {result.generalTips.map((tip, idx) => (
                  <View key={idx} style={styles.tipRow}>
                    <Text style={styles.tipIcon}>💡</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </Card>
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

  resumeCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  resumeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  resumeLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  resumeCandidate: {
    fontSize: fontSize.sm + 1,
    fontWeight: "700",
    color: colors.text,
  },

  formCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  jdInput: {
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: fontSize.sm,
  },

  resultsContainer: {
    marginTop: spacing.xs,
  },
  questionCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  questionHeader: {},
  questionBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  badgeLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  qNumBadge: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: radius.xs,
  },
  qNumText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  expandPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  expandPillActive: {
    backgroundColor: colors.surfaceSubtle,
  },
  expandHint: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: "700",
  },
  expandHintActive: {
    color: colors.textMuted,
  },
  questionText: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  whyAskedBox: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: "#F8FAFC",
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  whyAskedLabel: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.primaryDark,
    marginBottom: 2,
  },
  whyAskedText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },

  answerContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  keyPointsBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyPointsTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  keyPointItem: {
    fontSize: fontSize.xs + 1,
    color: colors.text,
    lineHeight: 18,
  },

  starBox: {
    gap: spacing.xs + 2,
  },
  starModelTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  starPart: {
    padding: spacing.md - 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  starPartSituation: {
    backgroundColor: "#F0F9FF",
    borderColor: "#BAE6FD",
  },
  starPartTask: {
    backgroundColor: "#FEFCE8",
    borderColor: "#FEF08A",
  },
  starPartAction: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  starPartResult: {
    backgroundColor: "#FAF5FF",
    borderColor: "#E9D5FF",
  },
  starPartLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  starPartText: {
    fontSize: fontSize.xs + 1,
    color: colors.text,
    lineHeight: 18,
  },

  tipsCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
    gap: spacing.xs + 2,
  },
  tipIcon: { fontSize: 16 },
  tipText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
