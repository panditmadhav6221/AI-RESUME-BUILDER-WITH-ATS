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
import { showDialog } from "../dialog";
import { useNav } from "../navigation";
import { colors, fontSize, radius, shadows, spacing } from "../theme";
import { OutreachResult, ResumeData } from "../types";
import { getUserId } from "../userStore";

interface OutreachProps {
  resumeId?: string;
  resume?: ResumeData;
}

type Tab = "connection" | "email" | "referral" | "followup";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "connection", label: "LinkedIn Note", icon: "🔗" },
  { key: "email", label: "Cold Pitch Email", icon: "✉️" },
  { key: "referral", label: "Alumni Referral", icon: "🎓" },
  { key: "followup", label: "Follow-Up", icon: "⏰" },
];

export function OutreachScreen({ resumeId, resume }: OutreachProps) {
  const { navigate } = useNav();
  const [data, setData] = useState<ResumeData | null>(resume ?? null);
  const [resumeTitle, setResumeTitle] = useState("Active Resume");
  const [companyName, setCompanyName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [contactType, setContactType] = useState<"hiring_manager" | "recruiter" | "alumni">("hiring_manager");
  const [jd, setJd] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("connection");
  const [result, setResult] = useState<OutreachResult | null>(null);
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
        setError("Please select or build a resume first.");
        return;
      }
      if (!companyName.trim() || !targetRole.trim()) {
        setError("Please provide company name and target role.");
        return;
      }
      setBusy("Generating high-converting networking messages…");
      setError("");
      try {
        const res = await aiApi.generateOutreach(
          data,
          companyName.trim(),
          targetRole.trim(),
          contactType,
          jd.trim() || null,
        );
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy("");
      }
    });

  const copySuccess = (title: string) => {
    showDialog(
      "Message Ready! 📋",
      `The ${title} is ready. Select and copy from the text box below to paste into LinkedIn or Gmail.`,
      [{ text: "Done" }],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? <ErrorBanner message={error} /> : null}

        {/* Candidate Banner */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Text style={{ fontSize: 20 }}>🤝</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerLabel}>NETWORKING OUTREACH ENGINE</Text>
              <Text style={styles.headerTitle}>{resumeTitle}</Text>
            </View>
            <Text style={styles.candidateName}>
              {data?.contact.fullName || "Candidate"}
            </Text>
          </View>
        </Card>

        {/* Input Form */}
        <Card style={styles.formCard}>
          <SectionHeading
            title="Target Company & Role"
            subtitle="Bypass ATS black holes by messaging decision makers directly with a compelling hook."
          />

          <TextField
            label="Company Name *"
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="e.g. Stripe, Uber, OpenAI"
          />
          <TextField
            label="Target Role *"
            value={targetRole}
            onChangeText={setTargetRole}
            placeholder="e.g. Senior Backend Engineer"
          />

          {/* Contact Type Selector */}
          <Text style={styles.subLabel}>WHO ARE YOU MESSAGING?</Text>
          <View style={styles.typePillsRow}>
            {[
              { key: "hiring_manager", label: "Hiring Manager", icon: "👔" },
              { key: "recruiter", label: "Tech Recruiter", icon: "🔍" },
              { key: "alumni", label: "College Alumni / Peer", icon: "🎓" },
            ].map((item) => {
              const active = contactType === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setContactType(item.key as any)}
                  style={[styles.typePill, active && styles.typePillActive]}
                >
                  <Text style={{ fontSize: 13 }}>{item.icon}</Text>
                  <Text style={[styles.typePillText, active && styles.typePillTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextField
            label="Job Description / Context (Optional)"
            multiline
            numberOfLines={3}
            value={jd}
            onChangeText={setJd}
            placeholder="Paste role link or key project requirements to personalize further…"
          />

          <Button
            title={busy || "Generate 4 Outreach Pitch Messages"}
            icon="✨"
            variant="primary"
            onPress={generate}
            loading={Boolean(busy)}
            style={{ marginTop: spacing.xs }}
          />
        </Card>

        {busy && !result ? <Loading label={busy} /> : null}

        {/* Result Message Tabs */}
        {result ? (
          <View style={styles.resultContainer}>
            {/* Tabs Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsRow}
            >
              {TABS.map((t) => {
                const active = activeTab === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setActiveTab(t.key)}
                    style={[styles.tabBtn, active && styles.tabBtnActive]}
                  >
                    <Text style={{ fontSize: 13 }}>{t.icon}</Text>
                    <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* TAB 1: LinkedIn Connection Note */}
            {activeTab === "connection" ? (
              <Card style={styles.messageCard}>
                <View style={styles.messageHeader}>
                  <View>
                    <Text style={styles.messageTypeTitle}>LinkedIn Connection Note</Text>
                    <Text style={styles.messageTypeSub}>
                      Strictly under 300 characters limit for non-premium connection requests.
                    </Text>
                  </View>
                  <View style={styles.charBadge}>
                    <Text
                      style={[
                        styles.charBadgeText,
                        {
                          color:
                            result.connectionNote.length <= 300
                              ? colors.successDark
                              : colors.danger,
                        },
                      ]}
                    >
                      {result.connectionNote.length} / 300 chars
                    </Text>
                  </View>
                </View>

                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>{result.connectionNote}</Text>
                </View>

                <Button
                  title="Copy Connection Note"
                  icon="📋"
                  variant="outline"
                  onPress={() => copySuccess("LinkedIn Connection Note")}
                  style={{ alignSelf: "flex-start", marginTop: spacing.sm }}
                />
              </Card>
            ) : null}

            {/* TAB 2: Cold Pitch Email */}
            {activeTab === "email" ? (
              <Card style={styles.messageCard}>
                <View style={styles.messageHeader}>
                  <View>
                    <Text style={styles.messageTypeTitle}>Hiring Manager Cold Pitch</Text>
                    <Text style={styles.messageTypeSub}>
                      Send directly via email or LinkedIn InMail to lead with value.
                    </Text>
                  </View>
                </View>

                <View style={styles.subjectBox}>
                  <Text style={styles.subjectLabel}>SUBJECT:</Text>
                  <Text style={styles.subjectText}>{result.coldEmailSubject}</Text>
                </View>

                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>{result.coldEmailBody}</Text>
                </View>

                <Button
                  title="Copy Pitch Email"
                  icon="📋"
                  variant="outline"
                  onPress={() => copySuccess("Cold Pitch Email")}
                  style={{ alignSelf: "flex-start", marginTop: spacing.sm }}
                />
              </Card>
            ) : null}

            {/* TAB 3: Alumni Referral */}
            {activeTab === "referral" ? (
              <Card style={styles.messageCard}>
                <View style={styles.messageHeader}>
                  <View>
                    <Text style={styles.messageTypeTitle}>Alumni Referral Request</Text>
                    <Text style={styles.messageTypeSub}>
                      Warm, low-pressure ask to someone working at the company.
                    </Text>
                  </View>
                </View>

                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>{result.referralRequest}</Text>
                </View>

                <Button
                  title="Copy Referral Request"
                  icon="📋"
                  variant="outline"
                  onPress={() => copySuccess("Referral Request")}
                  style={{ alignSelf: "flex-start", marginTop: spacing.sm }}
                />
              </Card>
            ) : null}

            {/* TAB 4: Follow-up Note */}
            {activeTab === "followup" ? (
              <Card style={styles.messageCard}>
                <View style={styles.messageHeader}>
                  <View>
                    <Text style={styles.messageTypeTitle}>4-Day Polite Follow-Up</Text>
                    <Text style={styles.messageTypeSub}>
                      Send 4-5 days after your initial message if no reply received.
                    </Text>
                  </View>
                </View>

                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>{result.followUpNote}</Text>
                </View>

                <Button
                  title="Copy Follow-Up"
                  icon="📋"
                  variant="outline"
                  onPress={() => copySuccess("Follow-Up Note")}
                  style={{ alignSelf: "flex-start", marginTop: spacing.sm }}
                />
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

  headerCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: fontSize.sm + 1,
    fontWeight: "700",
    color: colors.text,
  },
  candidateName: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: "600",
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
  subLabel: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  typePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: spacing.md - 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  typePillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  typePillText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textMuted,
  },
  typePillTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },

  resultContainer: {
    marginTop: spacing.xs,
  },
  tabsRow: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 5,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabBtnText: {
    fontSize: fontSize.xs + 1,
    fontWeight: "600",
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  messageCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  messageTypeTitle: {
    fontSize: fontSize.md,
    fontWeight: "800",
    color: colors.text,
  },
  messageTypeSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  charBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  charBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },

  subjectBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm + 2,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subjectLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  subjectText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.text,
  },

  messageBox: {
    backgroundColor: "#FFFFFF",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 22,
  },
});
