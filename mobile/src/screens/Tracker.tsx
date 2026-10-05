import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Button,
  Card,
  Chip,
  SectionHeading,
  StatCard,
  TextField,
} from "../components";
import { showDialog } from "../dialog";
import { useNav } from "../navigation";
import { colors, fontSize, radius, shadows, spacing } from "../theme";
import { ApplicationStatus, JobApplication, nextId } from "../types";

const INITIAL_APPLICATIONS: JobApplication[] = [
  {
    id: "app-1",
    companyName: "Stripe",
    roleTitle: "Staff Software Engineer",
    location: "Remote / US",
    salary: "$190k - $230k",
    status: "interview",
    dateApplied: "2026-08-28",
    notes: "Completed initial recruiter screen. System design interview next week.",
  },
  {
    id: "app-2",
    companyName: "Datadog",
    roleTitle: "Senior Backend Developer",
    location: "New York, NY",
    salary: "$175k - $205k",
    status: "applied",
    dateApplied: "2026-09-01",
    notes: "Applied with ATS-optimized tailored resume.",
  },
  {
    id: "app-3",
    companyName: "Figma",
    roleTitle: "Full Stack Engineer",
    location: "San Francisco, CA",
    salary: "$180k - $210k",
    status: "wishlist",
    dateApplied: "2026-09-04",
    notes: "Need to customize bullets with WebGL & Canvas keywords.",
  },
];

const STAGES: { key: ApplicationStatus; label: string; icon: string; color: string }[] = [
  { key: "wishlist", label: "Wishlist", icon: "📌", color: colors.textMuted },
  { key: "applied", label: "Applied", icon: "📨", color: colors.secondary },
  { key: "interview", label: "Interview", icon: "🎙️", color: colors.accent },
  { key: "offer", label: "Offer", icon: "🎉", color: colors.success },
  { key: "rejected", label: "Archived", icon: "📁", color: colors.danger },
];

export function TrackerScreen() {
  const { navigate } = useNav();
  const [applications, setApplications] = useState<JobApplication[]>(INITIAL_APPLICATIONS);
  const [activeStage, setActiveStage] = useState<ApplicationStatus | "all">("all");
  const [modalVisible, setModalVisible] = useState(false);

  // New Application Form
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("applied");

  const saveApplication = () => {
    if (!companyName.trim() || !roleTitle.trim()) {
      showDialog("Missing Fields", "Please enter company name and role title.");
      return;
    }
    const newApp: JobApplication = {
      id: nextId("app"),
      companyName: companyName.trim(),
      roleTitle: roleTitle.trim(),
      location: location.trim() || undefined,
      salary: salary.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      dateApplied: new Date().toISOString().split("T")[0],
    };
    setApplications([newApp, ...applications]);
    setCompanyName("");
    setRoleTitle("");
    setLocation("");
    setSalary("");
    setNotes("");
    setModalVisible(false);
  };

  const updateStatus = (id: string, newStatus: ApplicationStatus) => {
    setApplications(
      applications.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
    );
  };

  const deleteApp = (id: string, name: string) => {
    showDialog("Delete application", `Remove ${name} from your pipeline?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => setApplications(applications.filter((a) => a.id !== id)),
      },
    ]);
  };

  const filtered =
    activeStage === "all"
      ? applications
      : applications.filter((a) => a.status === activeStage);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Summary Metrics */}
        <View style={styles.statsRow}>
          <StatCard
            title="Active Pipeline"
            value={applications.filter((a) => a.status !== "rejected").length}
            subtitle="Live applications"
            icon="📊"
            accentColor={colors.primary}
          />
          <StatCard
            title="Interviews"
            value={applications.filter((a) => a.status === "interview").length}
            subtitle="Scheduled / round 2"
            icon="🎙️"
            accentColor={colors.accent}
          />
          <StatCard
            title="Offers"
            value={applications.filter((a) => a.status === "offer").length}
            subtitle="Received offers"
            icon="🎉"
            accentColor={colors.success}
          />
        </View>

        {/* Add Application Bar */}
        <View style={styles.addBarRow}>
          <View style={{ flex: 1 }}>
            <SectionHeading
              title="Job Applications"
              subtitle={`${applications.length} total tracked roles`}
            />
          </View>
          <Button
            title="+ Add Role"
            icon="💼"
            variant="primary"
            small
            onPress={() => setModalVisible(true)}
          />
        </View>

        {/* Stage Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          <Pressable
            onPress={() => setActiveStage("all")}
            style={[
              styles.filterPill,
              activeStage === "all" && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                activeStage === "all" && styles.filterPillTextActive,
              ]}
            >
              All ({applications.length})
            </Text>
          </Pressable>

          {STAGES.map((s) => {
            const count = applications.filter((a) => a.status === s.key).length;
            const active = activeStage === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => setActiveStage(s.key)}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <Text style={styles.filterPillIcon}>{s.icon}</Text>
                <Text
                  style={[
                    styles.filterPillText,
                    active && styles.filterPillTextActive,
                  ]}
                >
                  {s.label} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Applications List */}
        {filtered.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={{ fontSize: 32, marginBottom: spacing.xs }}>📋</Text>
            <Text style={styles.emptyTitle}>No applications in this stage</Text>
            <Text style={styles.emptySubtitle}>
              Tap “+ Add Role” to log a new application or update the stage filter.
            </Text>
          </Card>
        ) : (
          filtered.map((app) => {
            const stageConfig = STAGES.find((s) => s.key === app.status) ?? STAGES[0];
            return (
              <Card key={app.id} style={styles.appCard}>
                <View style={styles.appCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.companyTitle}>{app.companyName}</Text>
                    <Text style={styles.roleTitle}>{app.roleTitle}</Text>
                    {app.location || app.salary ? (
                      <Text style={styles.detailsText}>
                        {[app.location, app.salary].filter(Boolean).join("  •  ")}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: `${stageConfig.color}15`, borderColor: stageConfig.color },
                    ]}
                  >
                    <Text style={styles.statusPillIcon}>{stageConfig.icon}</Text>
                    <Text style={[styles.statusPillText, { color: stageConfig.color }]}>
                      {stageConfig.label.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {app.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>{app.notes}</Text>
                  </View>
                ) : null}

                <View style={styles.appDivider} />

                {/* Move Stage Selector */}
                <View style={styles.stageMoveRow}>
                  <Text style={styles.stageMoveLabel}>MOVE STAGE:</Text>
                  <View style={styles.stageBtnGroup}>
                    {STAGES.map((s) => {
                      const isCurrent = app.status === s.key;
                      return (
                        <Pressable
                          key={s.key}
                          onPress={() => updateStatus(app.id, s.key)}
                          style={[
                            styles.moveBtn,
                            isCurrent && {
                              backgroundColor: s.color,
                              borderColor: s.color,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.moveBtnText,
                              isCurrent && { color: "#FFFFFF", fontWeight: "800" },
                            ]}
                          >
                            {s.icon}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable
                    onPress={() => deleteApp(app.id, app.companyName)}
                    hitSlop={10}
                    style={styles.deleteBtn}
                  >
                    <Text style={{ fontSize: 13, color: colors.danger }}>🗑️</Text>
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Add Application Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Job Application</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={{ marginVertical: spacing.sm }}>
              <TextField
                label="Company Name *"
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="e.g. Netflix, Airbnb"
              />
              <TextField
                label="Role Title *"
                value={roleTitle}
                onChangeText={setRoleTitle}
                placeholder="e.g. Senior Backend Engineer"
              />
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Location"
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Remote / City"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Target Compensation"
                    value={salary}
                    onChangeText={setSalary}
                    placeholder="$160k - $190k"
                  />
                </View>
              </View>

              {/* Status Picker */}
              <Text style={styles.modalLabel}>CURRENT APPLICATION STAGE</Text>
              <View style={styles.stageChoiceRow}>
                {STAGES.map((s) => (
                  <Pressable
                    key={s.key}
                    onPress={() => setStatus(s.key)}
                    style={[
                      styles.stageChoiceBtn,
                      status === s.key && styles.stageChoiceBtnActive,
                    ]}
                  >
                    <Text style={{ fontSize: 12 }}>{s.icon}</Text>
                    <Text
                      style={[
                        styles.stageChoiceText,
                        status === s.key && styles.stageChoiceTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextField
                label="Notes & Next Steps"
                multiline
                value={notes}
                onChangeText={setNotes}
                placeholder="Recruiter contact, interview dates, specific requirements…"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Application"
                variant="primary"
                onPress={saveApplication}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },

  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  addBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },

  filterPillsRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillIcon: { fontSize: 12 },
  filterPillText: {
    fontSize: fontSize.xs + 1,
    fontWeight: "600",
    color: colors.textMuted,
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  appCard: {
    marginBottom: spacing.md,
    padding: spacing.md + 2,
    borderRadius: radius.lg,
  },
  appCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  companyTitle: {
    fontSize: fontSize.md + 1,
    fontWeight: "800",
    color: colors.text,
  },
  roleTitle: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primaryDark,
    marginTop: 1,
  },
  detailsText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 4,
  },
  statusPillIcon: { fontSize: 11 },
  statusPillText: {
    fontSize: 9,
    fontWeight: "800",
  },

  notesBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  notesText: {
    fontSize: fontSize.xs,
    color: colors.text,
    lineHeight: 16,
  },

  appDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  stageMoveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stageMoveLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  stageBtnGroup: {
    flexDirection: "row",
    gap: 4,
  },
  moveBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  moveBtnText: {
    fontSize: 13,
  },
  deleteBtn: {
    padding: 6,
  },

  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    borderRadius: radius.lg,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: fontSize.xs + 1,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
  },
  modalClose: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textMuted,
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalLabel: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  stageChoiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  stageChoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  stageChoiceBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  stageChoiceText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textMuted,
  },
  stageChoiceTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  modalFooter: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
