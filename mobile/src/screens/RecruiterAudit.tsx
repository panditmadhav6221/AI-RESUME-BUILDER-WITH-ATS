import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { aiApi, resumesApi } from "../api";
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
import { useNav } from "../navigation";
import { colors, fontSize, radius, shadows, spacing } from "../theme";
import { RecruiterAuditResult, ResumeData } from "../types";
import { getUserId } from "../userStore";

interface RecruiterAuditProps {
  resumeId?: string;
  resume?: ResumeData;
}

export function RecruiterAuditScreen({ resumeId, resume }: RecruiterAuditProps) {
  const { navigate } = useNav();
  const [data, setData] = useState<ResumeData | null>(resume ?? null);
  const [resumeTitle, setResumeTitle] = useState("Active Resume");
  const [targetRole, setTargetRole] = useState("");
  const [audit, setAudit] = useState<RecruiterAuditResult | null>(null);
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

  const runAudit = () =>
    void (async () => {
      if (!data) {
        setError("Please select or build a resume first.");
        return;
      }
      setBusy("Running 6-second recruiter cold read simulation…");
      setError("");
      try {
        const res = await aiApi.recruiterAudit(data, targetRole || null);
        setAudit(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy("");
      }
    });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? <ErrorBanner message={error} /> : null}

        {/* Candidate Banner */}
        <Card style={styles.candidateCard}>
          <View style={styles.candidateRow}>
            <View style={styles.auditIconWrap}>
              <Text style={{ fontSize: 20 }}>🕵️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.candidateLabel}>EXECUTIVE COLD READ AUDIT</Text>
              <Text style={styles.candidateTitle}>{resumeTitle}</Text>
              <Text style={styles.candidateName}>
                {data?.contact.fullName || "Target Candidate"}
              </Text>
            </View>
          </View>
        </Card>

        {/* Input & Action */}
        <Card style={styles.actionCard}>
          <SectionHeading
            title="Recruiter 6-Second Scan Simulation"
            subtitle="Recruiters review resumes in 6 seconds. Find out exactly what catches their eye, red flags, and interview callback odds."
          />
          <TextField
            label="Target Position (Optional)"
            value={targetRole}
            onChangeText={setTargetRole}
            placeholder="e.g. Lead Product Designer, Staff Engineer"
          />
          <Button
            title={busy || "Simulate 6-Second Recruiter Read"}
            icon="⚡"
            variant="primary"
            onPress={runAudit}
            loading={Boolean(busy)}
            style={{ marginTop: spacing.xs }}
          />
        </Card>

        {busy && !audit ? <Loading label={busy} /> : null}

        {/* Audit Results */}
        {audit ? (
          <View style={styles.auditResults}>
            {/* Probability Gauge & Verdict */}
            <Card style={styles.scoreCard}>
              <View style={styles.scoreRow}>
                <AtsGauge score={audit.callbackProbability} size="large" />
                <View style={styles.scoreInfo}>
                  <Text style={styles.probLabel}>CALLBACK PROBABILITY</Text>
                  <Text style={styles.probStatus}>
                    {audit.callbackProbability >= 80
                      ? "High Priority Candidate 🎉"
                      : audit.callbackProbability >= 60
                        ? "Moderate — Borderline"
                        : "High Risk — Likely Skipped"}
                  </Text>
                  <Text style={styles.verdictText}>"{audit.executiveVerdict}"</Text>
                </View>
              </View>
            </Card>

            {/* 6-Second First Impression */}
            <Card style={styles.impressionCard}>
              <View style={styles.impressionHeader}>
                <Text style={styles.stopwatchIcon}>⏱️</Text>
                <Text style={styles.impressionTitle}>6-Second First Impression</Text>
              </View>
              <Text style={styles.impressionText}>{audit.firstImpression}</Text>
            </Card>

            {/* Red Flags Card */}
            {audit.redFlags && audit.redFlags.length > 0 ? (
              <Card style={styles.redFlagsCard}>
                <SectionHeading
                  title="Immediate Red Flags 🚩"
                  subtitle="Critical issues that cause recruiters to pass"
                />
                {audit.redFlags.map((flag, idx) => (
                  <View key={idx} style={styles.flagItem}>
                    <Text style={styles.flagIcon}>⚠️</Text>
                    <Text style={styles.flagText}>{flag}</Text>
                  </View>
                ))}
              </Card>
            ) : null}

            {/* Strengths Card */}
            {audit.strengths && audit.strengths.length > 0 ? (
              <Card style={styles.strengthsCard}>
                <SectionHeading
                  title="Key Selling Points ✦"
                  subtitle="What makes you stand out from the applicant pool"
                />
                {audit.strengths.map((s, idx) => (
                  <View key={idx} style={styles.strengthItem}>
                    <Text style={styles.strengthIcon}>✓</Text>
                    <Text style={styles.strengthText}>{s}</Text>
                  </View>
                ))}
              </Card>
            ) : null}

            {/* Top 3 Quick Fixes */}
            {audit.top3Fixes && audit.top3Fixes.length > 0 ? (
              <Card style={styles.fixesCard}>
                <SectionHeading
                  title="Top 3 Urgent Fixes 🚀"
                  subtitle="Change these now to double your callback rate"
                />
                {audit.top3Fixes.map((fix, idx) => (
                  <View key={idx} style={styles.fixItem}>
                    <View style={styles.fixBadge}>
                      <Text style={styles.fixBadgeText}>#{idx + 1}</Text>
                    </View>
                    <Text style={styles.fixText}>{fix}</Text>
                  </View>
                ))}
              </Card>
            ) : null}

            {/* Next Step Action */}
            <Button
              title="Edit in Builder to Fix Issues"
              icon="✏️"
              variant="primary"
              onPress={() =>
                navigate({
                  name: "builder",
                  resumeId,
                  title: resumeTitle,
                  targetRole,
                  data: data ?? undefined,
                })
              }
              style={{ marginTop: spacing.sm }}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },

  candidateCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  auditIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  candidateLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  candidateTitle: {
    fontSize: fontSize.sm + 1,
    fontWeight: "700",
    color: colors.text,
  },
  candidateName: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: "600",
  },

  actionCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },

  auditResults: {
    marginTop: spacing.xs,
  },
  scoreCard: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  scoreInfo: {
    flex: 1,
  },
  probLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  probStatus: {
    fontSize: fontSize.md + 1,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.2,
    marginVertical: 2,
  },
  verdictText: {
    fontSize: fontSize.xs + 1,
    color: colors.textMuted,
    fontStyle: "italic",
    lineHeight: 18,
  },

  impressionCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    borderColor: "#C7D2FE",
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  impressionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.xs,
  },
  stopwatchIcon: { fontSize: 16 },
  impressionTitle: {
    fontSize: fontSize.xs + 1,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  impressionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },

  redFlagsCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.dangerBg,
    borderColor: "#FECACA",
    borderWidth: 1,
  },
  flagItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xs + 2,
    gap: spacing.xs + 2,
  },
  flagIcon: { fontSize: 14 },
  flagText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.dangerDark,
    lineHeight: 20,
    fontWeight: "500",
  },

  strengthsCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  strengthItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xs + 2,
    gap: spacing.xs + 2,
  },
  strengthIcon: {
    fontSize: 14,
    color: colors.success,
    fontWeight: "700",
  },
  strengthText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },

  fixesCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  fixItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  fixBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  fixBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
  },
  fixText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    fontWeight: "500",
  },
});
