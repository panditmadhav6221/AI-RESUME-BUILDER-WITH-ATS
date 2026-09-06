import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { atsApi, resumesApi } from "../api";
import { AtsGauge, Button, Card, Chip, ErrorBanner, Loading, SectionHeading } from "../components";
import { useNav } from "../navigation";
import { exportPdfAndShare } from "../pdf";
import { estimatePages, resumeToPlainText } from "../resumeText";
import { colors, fontSize, radius, shadows, spacing } from "../theme";
import { ResumeData } from "../types";
import { getUserId } from "../userStore";

interface PreviewProps {
  resumeId?: string;
  title: string;
  data: ResumeData;
  unsaved?: boolean;
}

type TemplateTheme = "modern" | "classic" | "minimal";

export function PreviewScreen({ resumeId, title, data, unsaved }: PreviewProps) {
  const { navigate } = useNav();
  const [template, setTemplate] = useState<TemplateTheme>("modern");
  const [score, setScore] = useState<{ score: number; label: string } | null>(null);
  const [issues, setIssues] = useState<{ severity: string; message: string; fix: string }[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const text = useMemo(() => resumeToPlainText(data), [data]);
  const { pages } = useMemo(() => estimatePages(text), [text]);
  const isNew = unsaved === true;

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const analysis = await atsApi.score(data);
        if (!mounted) return;
        const label =
          analysis.score >= 85 ? "Strong" : analysis.score >= 70 ? "Good" : "Needs work";
        setScore({ score: analysis.score, label });
        setIssues(
          analysis.issues.map((i) => ({
            severity: i.severity,
            message: i.message,
            fix: i.fix,
          })),
        );
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [data]);

  const sharePdf = () =>
    void (async () => {
      setBusy("Preparing PDF…");
      setError("");
      try {
        await exportPdfAndShare(data, title);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy("");
      }
    });

  const saveTailored = () =>
    Alert.alert("Save as new resume", "Save this variant to your dashboard?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Save",
        onPress: () =>
          void (async () => {
            setBusy("Saving…");
            setError("");
            try {
              const userId = await getUserId();
              await resumesApi.save(userId, title, data, template);
              navigate({ name: "dashboard" });
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
              setBusy("");
            }
          }),
      },
    ]);

  const contactList = [
    data.contact.email,
    data.contact.phone,
    data.contact.location,
    data.contact.linkedin,
    data.contact.website,
  ].filter(Boolean);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? <ErrorBanner message={error} /> : null}

        {/* ATS Score & Diagnostic Card */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <AtsGauge score={score?.score ?? 85} size="medium" />
            <View style={styles.scoreSummary}>
              <Text style={styles.scoreTitle}>{title}</Text>
              <Text style={styles.scoreCandidate}>{data.contact.fullName || "Target Candidate"}</Text>
              <View style={styles.pagePill}>
                <Text
                  style={[
                    styles.pagePillText,
                    { color: pages <= 1 ? colors.successDark : colors.warningDark },
                  ]}
                >
                  {pages <= 1 ? "✓ Fits on 1 ATS Page" : `⚠️ Estimated ${pages} pages`}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick issues tally */}
          {issues.length > 0 ? (
            <View style={styles.issuesTally}>
              <Text style={styles.issuesTallyText}>
                Found {issues.filter((i) => i.severity === "error").length} critical items &{" "}
                {issues.filter((i) => i.severity === "warning").length} recommendations.
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Template Selector Bar */}
        <View style={styles.templateBar}>
          <Text style={styles.templateLabel}>DESIGN TEMPLATE:</Text>
          <View style={styles.templateOptions}>
            {(["modern", "classic", "minimal"] as TemplateTheme[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTemplate(t)}
                style={[
                  styles.templateTab,
                  template === t && styles.templateTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.templateTabText,
                    template === t && styles.templateTabTextActive,
                  ]}
                >
                  {t.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Real Document Paper Layout */}
        <View style={[styles.paper, shadows.md, template === "classic" && styles.paperClassic]}>
          {/* Paper Header */}
          <View
            style={[
              styles.resumeHeader,
              template === "classic" && styles.resumeHeaderClassic,
              template === "minimal" && styles.resumeHeaderMinimal,
            ]}
          >
            <Text
              style={[
                styles.resumeName,
                template === "classic" && styles.resumeNameClassic,
                template === "minimal" && styles.resumeNameMinimal,
              ]}
            >
              {data.contact.fullName || "Your Full Name"}
            </Text>
            {contactList.length > 0 ? (
              <Text style={styles.resumeContact}>{contactList.join("  •  ")}</Text>
            ) : null}
          </View>

          {/* Professional Summary */}
          {data.summary ? (
            <View style={styles.resumeSection}>
              <Text style={styles.sectionHeaderTitle}>PROFESSIONAL SUMMARY</Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.resumeBodyText}>{data.summary}</Text>
            </View>
          ) : null}

          {/* Experience */}
          {data.experience.length > 0 ? (
            <View style={styles.resumeSection}>
              <Text style={styles.sectionHeaderTitle}>WORK EXPERIENCE</Text>
              <View style={styles.sectionDivider} />
              {data.experience.map((exp, idx) => (
                <View key={exp.id || idx} style={styles.experienceItem}>
                  <View style={styles.expTitleRow}>
                    <Text style={styles.expCompany}>{exp.company || "Company Name"}</Text>
                    <Text style={styles.expDate}>
                      {exp.startDate} - {exp.current ? "Present" : exp.endDate}
                    </Text>
                  </View>
                  <Text style={styles.expRole}>
                    {exp.position}
                    {exp.location ? ` | ${exp.location}` : ""}
                  </Text>
                  {exp.bullets.map((b, bIdx) =>
                    b.trim() ? (
                      <View key={bIdx} style={styles.bulletRow}>
                        <Text style={styles.bulletSymbol}>•</Text>
                        <Text style={styles.bulletContent}>{b.trim()}</Text>
                      </View>
                    ) : null,
                  )}
                </View>
              ))}
            </View>
          ) : null}

          {/* Education */}
          {data.education.length > 0 ? (
            <View style={styles.resumeSection}>
              <Text style={styles.sectionHeaderTitle}>EDUCATION</Text>
              <View style={styles.sectionDivider} />
              {data.education.map((edu, idx) => (
                <View key={edu.id || idx} style={styles.educationItem}>
                  <View style={styles.expTitleRow}>
                    <Text style={styles.expCompany}>{edu.institution}</Text>
                    <Text style={styles.expDate}>{edu.endDate}</Text>
                  </View>
                  <Text style={styles.expRole}>
                    {edu.degree}
                    {edu.field ? ` in ${edu.field}` : ""}
                    {edu.gpa ? ` (GPA: ${edu.gpa})` : ""}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Skills */}
          {data.skills.length > 0 ? (
            <View style={styles.resumeSection}>
              <Text style={styles.sectionHeaderTitle}>TECHNICAL & CORE SKILLS</Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.resumeSkillsLine}>
                {data.skills.map((s) => s.name).join("  •  ")}
              </Text>
            </View>
          ) : null}

          {/* Projects */}
          {data.projects.length > 0 ? (
            <View style={styles.resumeSection}>
              <Text style={styles.sectionHeaderTitle}>KEY PROJECTS</Text>
              <View style={styles.sectionDivider} />
              {data.projects.map((proj, idx) => (
                <View key={proj.id || idx} style={styles.projectItem}>
                  <Text style={styles.projectName}>
                    {proj.name}
                    {proj.url ? ` (${proj.url})` : ""}
                  </Text>
                  {proj.description ? (
                    <Text style={styles.projectDesc}>{proj.description}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {/* Certifications */}
          {data.certifications.length > 0 ? (
            <View style={styles.resumeSection}>
              <Text style={styles.sectionHeaderTitle}>CERTIFICATIONS</Text>
              <View style={styles.sectionDivider} />
              {data.certifications.map((cert, idx) => (
                <View key={cert.id || idx} style={styles.certItem}>
                  <Text style={styles.certName}>{cert.name}</Text>
                  <Text style={styles.certIssuer}>
                    {[cert.issuer, cert.date].filter(Boolean).join(" | ")}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* ATS Issues List & Fix Recommendations */}
        {issues.length > 0 ? (
          <View style={styles.issuesContainer}>
            <SectionHeading
              title="ATS Diagnostic Details"
              subtitle="Fix these to maximize interview callback rates"
            />
            {issues.map((issue, idx) => (
              <Card
                key={idx}
                style={[
                  styles.issueCard,
                  issue.severity === "error" ? styles.issueCardError : styles.issueCardWarning,
                ]}
              >
                <View style={styles.issueHeaderRow}>
                  <Text style={styles.issueIcon}>
                    {issue.severity === "error" ? "🛑" : "⚠️"}
                  </Text>
                  <Text
                    style={[
                      styles.issueSeverity,
                      { color: issue.severity === "error" ? colors.dangerDark : colors.warningDark },
                    ]}
                  >
                    {issue.severity.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.issueMessage}>{issue.message}</Text>
                {issue.fix ? (
                  <View style={styles.issueFixBox}>
                    <Text style={styles.issueFixText}>💡 Fix: {issue.fix}</Text>
                  </View>
                ) : null}
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={[styles.footer, shadows.md]}>
        <View style={styles.footerBtnsRow}>
          {isNew ? (
            <Button
              title="Save to Dashboard"
              icon="💾"
              onPress={saveTailored}
              loading={busy === "Saving…"}
              style={{ flex: 1.2 }}
            />
          ) : (
            <Button
              title={busy || "Export PDF & Share"}
              icon="📥"
              onPress={sharePdf}
              loading={busy === "Preparing PDF…"}
              style={{ flex: 1.2 }}
            />
          )}

          <Button
            title="Edit"
            icon="✏️"
            variant="secondary"
            onPress={() =>
              navigate({
                name: "builder",
                resumeId,
                title,
                targetRole: null,
                data,
              })
            }
            style={{ flex: 0.8 }}
          />

          <Button
            title="Match JD"
            icon="🎯"
            variant="outline"
            onPress={() => navigate({ name: "matcher", resumeId, resume: data })}
            style={{ flex: 0.9 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: 110 },

  // Score Card
  scoreCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  scoreSummary: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: fontSize.lg,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  scoreCandidate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  pagePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pagePillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  issuesTally: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  issuesTallyText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: "500",
  },

  // Template Bar
  templateBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  templateLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  templateOptions: {
    flexDirection: "row",
    gap: 4,
  },
  templateTab: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceSubtle,
  },
  templateTabActive: {
    backgroundColor: colors.primary,
  },
  templateTabText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
  },
  templateTabTextActive: {
    color: "#FFFFFF",
  },

  // Document Paper
  paper: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  paperClassic: {
    borderColor: "#94A3B8",
  },
  resumeHeader: {
    alignItems: "center",
    marginBottom: spacing.lg,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.text,
    paddingBottom: spacing.md,
  },
  resumeHeaderClassic: {
    borderBottomColor: "#475569",
  },
  resumeHeaderMinimal: {
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resumeName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 4,
  },
  resumeNameClassic: {
    fontFamily: "serif",
    fontSize: 24,
  },
  resumeNameMinimal: {
    textAlign: "left",
    fontWeight: "700",
  },
  resumeContact: {
    fontSize: 10.5,
    color: "#334155",
    textAlign: "center",
    lineHeight: 16,
  },
  resumeSection: {
    marginBottom: spacing.lg,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 1,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#CBD5E1",
    marginTop: 3,
    marginBottom: spacing.sm,
  },
  resumeBodyText: {
    fontSize: 11,
    color: "#1E293B",
    lineHeight: 17,
  },
  experienceItem: {
    marginBottom: spacing.md,
  },
  expTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expCompany: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.text,
  },
  expDate: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "500",
  },
  expRole: {
    fontSize: 10.5,
    fontStyle: "italic",
    color: "#334155",
    marginBottom: 3,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 2,
    paddingLeft: 4,
  },
  bulletSymbol: {
    fontSize: 12,
    color: "#475569",
    marginRight: 6,
    lineHeight: 16,
  },
  bulletContent: {
    flex: 1,
    fontSize: 10.5,
    color: "#1E293B",
    lineHeight: 16,
  },
  educationItem: {
    marginBottom: spacing.sm,
  },
  resumeSkillsLine: {
    fontSize: 11,
    color: "#1E293B",
    lineHeight: 18,
    fontWeight: "500",
  },
  projectItem: {
    marginBottom: spacing.sm,
  },
  projectName: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.text,
  },
  projectDesc: {
    fontSize: 10.5,
    color: "#334155",
    lineHeight: 15,
    marginTop: 1,
  },
  certItem: {
    marginBottom: 4,
  },
  certName: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  certIssuer: {
    fontSize: 10,
    color: "#475569",
  },

  // Issues Section
  issuesContainer: {
    marginTop: spacing.sm,
  },
  issueCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  issueCardError: {
    backgroundColor: colors.dangerBg,
    borderColor: "#FECACA",
  },
  issueCardWarning: {
    backgroundColor: colors.warningBg,
    borderColor: "#FDE68A",
  },
  issueHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  issueIcon: { fontSize: 13 },
  issueSeverity: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  issueMessage: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 18,
  },
  issueFixBox: {
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  issueFixText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: "600",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtnsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
