import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { resumesApi } from "../api";
import {
  AtsGauge,
  Button,
  Card,
  Chip,
  Loading,
  SectionHeading,
  StatCard,
} from "../components";
import { useNav } from "../navigation";
import { colors, fontSize, radius, shadows, spacing } from "../theme";
import { emptyResumeData, ResumeMeta } from "../types";
import { getUserId } from "../userStore";

export function DashboardScreen() {
  const { navigate } = useNav();
  const [userId, setUserId] = useState<string | null>(null);
  const [resumes, setResumes] = useState<ResumeMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const uid = userId ?? (await getUserId());
        setUserId(uid);
        const items = await resumesApi.list(uid);
        setResumes(items);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const createNew = () =>
    navigate({
      name: "builder",
      title: "Untitled Resume",
      data: emptyResumeData(),
      targetRole: null,
    });

  const openResume = (r: ResumeMeta) => {
    if (!r.data) {
      getFull(r);
      return;
    }
    navigate({
      name: "builder",
      resumeId: r.id,
      title: r.title,
      targetRole: r.targetRole,
      data: r.data,
    });
  };

  const getFull = async (r: ResumeMeta) => {
    try {
      const full = await resumesApi.get(userId!, r.id);
      navigate({
        name: "builder",
        resumeId: full.id,
        title: full.title,
        targetRole: full.targetRole,
        data: full.data ?? emptyResumeData(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const preview = (r: ResumeMeta) => {
    if (r.data) {
      navigate({ name: "preview", resumeId: r.id, title: r.title, data: r.data });
    } else {
      void (async () => {
        try {
          const full = await resumesApi.get(userId!, r.id);
          navigate({
            name: "preview",
            resumeId: full.id,
            title: full.title,
            data: full.data ?? emptyResumeData(),
          });
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
      })();
    }
  };

  const cloneResume = (r: ResumeMeta) =>
    Alert.alert("Duplicate resume", "Create a tailored variant for a specific job?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Duplicate",
        onPress: async () => {
          try {
            const clone = await resumesApi.clone(userId!, r.id);
            await load(true);
            if (clone.data)
              navigate({
                name: "builder",
                resumeId: clone.id,
                title: clone.title,
                data: clone.data,
              });
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);

  const deleteResume = (r: ResumeMeta) =>
    Alert.alert("Delete resume", `Are you sure you want to delete "${r.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await resumesApi.remove(userId!, r.id);
            await load(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);

  // Analytics
  const stats = useMemo(() => {
    const total = resumes.length;
    const scored = resumes.filter((r) => r.score != null);
    const avgScore =
      scored.length > 0
        ? Math.round(scored.reduce((acc, r) => acc + (r.score ?? 0), 0) / scored.length)
        : 85;
    const topReady = resumes.filter((r) => (r.score ?? 0) >= 80).length;
    return { total, avgScore, topReady };
  }, [resumes]);

  // Filtered list
  const filteredResumes = useMemo(() => {
    if (!searchQuery.trim()) return resumes;
    const q = searchQuery.toLowerCase();
    return resumes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.targetRole && r.targetRole.toLowerCase().includes(q)),
    );
  }, [resumes, searchQuery]);

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredResumes}
        keyExtractor={(r) => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {/* Quick Hero Banner */}
            <View style={[styles.heroCard, shadows.md]}>
              <View style={styles.heroGlowCircle} />
              <View style={styles.heroTextContent}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>✦ ATS SCORE MAXIMIZER</Text>
                </View>
                <Text style={styles.heroTitle}>Build Resumes That Beat the Bot</Text>
                <Text style={styles.heroSubtitle}>
                  Keyword-matched, single-column formatted, and tailored for 100% ATS readability.
                </Text>
                <View style={styles.heroActionsContainer}>
                  <Button
                    title="Create New Resume"
                    icon="＋"
                    onPress={createNew}
                    style={styles.heroBtnPrimaryFull}
                  />
                  <View style={styles.heroBtnRow}>
                    <Button
                      title="Import Text"
                      icon="📥"
                      variant="secondary"
                      small
                      onPress={() => navigate({ name: "import-resume" })}
                      style={styles.heroBtnSecondary}
                    />
                    <Button
                      title="Match with JD"
                      icon="🎯"
                      variant="secondary"
                      small
                      onPress={() => navigate({ name: "matcher" })}
                      style={styles.heroBtnSecondary}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Metrics Overview */}
            <View style={styles.statsRow}>
              <StatCard
                title="Resumes"
                value={stats.total}
                subtitle="Saved profiles"
                icon="📄"
                accentColor={colors.primary}
              />
              <StatCard
                title="Avg ATS Score"
                value={`${stats.avgScore}`}
                subtitle={stats.avgScore >= 80 ? "Top 15% tier" : "Needs Polish"}
                icon="⚡"
                accentColor={stats.avgScore >= 80 ? colors.success : colors.warning}
              />
              <StatCard
                title="ATS Ready"
                value={stats.topReady}
                subtitle="High compatibility"
                icon="✓"
                accentColor={colors.secondary}
              />
            </View>

            {/* AI Career Toolkit (2-Column Grid) */}
            <View style={styles.toolsSection}>
              <SectionHeading
                title="AI Career Toolkit"
                subtitle="High-impact accelerators for your job search"
              />
              <View style={styles.toolsGrid}>
                <Pressable
                  onPress={() => navigate({ name: "cover-letter" })}
                  style={({ pressed }) => [styles.toolGridCard, pressed && styles.toolGridCardPressed]}
                >
                  <View style={[styles.toolIconWrap, { backgroundColor: "#EEF2FF" }]}>
                    <Text style={styles.toolIcon}>✉️</Text>
                  </View>
                  <View style={styles.toolInfo}>
                    <Text style={styles.toolTitle} numberOfLines={1}>Cover Letter</Text>
                    <Text style={styles.toolSubtitle} numberOfLines={1}>1-Click Match</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => navigate({ name: "interview-prep" })}
                  style={({ pressed }) => [styles.toolGridCard, pressed && styles.toolGridCardPressed]}
                >
                  <View style={[styles.toolIconWrap, { backgroundColor: "#FAF5FF" }]}>
                    <Text style={styles.toolIcon}>🎙️</Text>
                  </View>
                  <View style={styles.toolInfo}>
                    <Text style={styles.toolTitle} numberOfLines={1}>Interview Prep</Text>
                    <Text style={styles.toolSubtitle} numberOfLines={1}>STAR Simulator</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => navigate({ name: "tracker" })}
                  style={({ pressed }) => [styles.toolGridCard, pressed && styles.toolGridCardPressed]}
                >
                  <View style={[styles.toolIconWrap, { backgroundColor: "#F0FDF4" }]}>
                    <Text style={styles.toolIcon}>📊</Text>
                  </View>
                  <View style={styles.toolInfo}>
                    <Text style={styles.toolTitle} numberOfLines={1}>Job Pipeline</Text>
                    <Text style={styles.toolSubtitle} numberOfLines={1}>Kanban Board</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => navigate({ name: "recruiter-audit" })}
                  style={({ pressed }) => [styles.toolGridCard, pressed && styles.toolGridCardPressed]}
                >
                  <View style={[styles.toolIconWrap, { backgroundColor: "#FFF7ED" }]}>
                    <Text style={styles.toolIcon}>🕵️</Text>
                  </View>
                  <View style={styles.toolInfo}>
                    <Text style={styles.toolTitle} numberOfLines={1}>Recruiter Scan</Text>
                    <Text style={styles.toolSubtitle} numberOfLines={1}>6s Cold Read</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => navigate({ name: "outreach" })}
                  style={({ pressed }) => [styles.toolGridCard, pressed && styles.toolGridCardPressed]}
                >
                  <View style={[styles.toolIconWrap, { backgroundColor: "#FDF2F8" }]}>
                    <Text style={styles.toolIcon}>🤝</Text>
                  </View>
                  <View style={styles.toolInfo}>
                    <Text style={styles.toolTitle} numberOfLines={1}>Cold Outreach</Text>
                    <Text style={styles.toolSubtitle} numberOfLines={1}>LinkedIn & Pitch</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => navigate({ name: "import-resume" })}
                  style={({ pressed }) => [styles.toolGridCard, pressed && styles.toolGridCardPressed]}
                >
                  <View style={[styles.toolIconWrap, { backgroundColor: "#F0F9FF" }]}>
                    <Text style={styles.toolIcon}>📥</Text>
                  </View>
                  <View style={styles.toolInfo}>
                    <Text style={styles.toolTitle} numberOfLines={1}>Import Text</Text>
                    <Text style={styles.toolSubtitle} numberOfLines={1}>Auto-Fill Fields</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* Section Header & Search */}
            <View style={styles.sectionHeaderRow}>
              <SectionHeading
                title="Your Resumes"
                subtitle={`${filteredResumes.length} profile${filteredResumes.length === 1 ? "" : "s"} ready`}
              />
            </View>

            {resumes.length > 0 ? (
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by role or resume title…"
                  placeholderTextColor={colors.textSubtle}
                  style={styles.searchInput}
                />
                {searchQuery ? (
                  <Pressable onPress={() => setSearchQuery("")} hitSlop={10}>
                    <Text style={styles.clearSearch}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <Button
                  title="Retry"
                  variant="outline"
                  small
                  onPress={() => void load()}
                  style={{ marginTop: spacing.sm, alignSelf: "flex-start" }}
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading label="Loading your resumes…" />
          ) : (
            <Card style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Text style={{ fontSize: 36 }}>📑</Text>
              </View>
              <Text style={styles.emptyTitle}>No resumes found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? "No resumes match your search. Clear the filter to view all."
                  : "Create your first ATS-optimized resume in minutes with AI assistance."}
              </Text>
              <Button
                title="Create First Resume"
                icon="✨"
                onPress={createNew}
                style={{ alignSelf: "center", marginTop: spacing.md }}
              />
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Card style={styles.resumeCard}>
            <View style={styles.resumeCardTop}>
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <View style={styles.resumeTitleRow}>
                  <Text style={styles.resumeTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.parentId ? (
                    <View style={styles.variantBadge}>
                      <Text style={styles.variantBadgeText}>VARIANT</Text>
                    </View>
                  ) : null}
                </View>
                {item.targetRole ? (
                  <View style={styles.roleRow}>
                    <Text style={styles.roleIcon}>🎯</Text>
                    <Text style={styles.roleText} numberOfLines={1}>{item.targetRole}</Text>
                  </View>
                ) : (
                  <Text style={styles.noRoleText}>General Purpose Resume</Text>
                )}
              </View>
              <AtsGauge score={item.score ?? 85} size="small" />
            </View>

            <View style={styles.cardDivider} />

            {/* Primary Action Buttons */}
            <View style={styles.cardPrimaryActions}>
              <Pressable
                onPress={() => openResume(item)}
                style={({ pressed }) => [styles.cardBtnPrimary, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.cardBtnPrimaryText}>✏️ Edit Resume</Text>
              </Pressable>

              <Pressable
                onPress={() => preview(item)}
                style={({ pressed }) => [styles.cardBtnSecondary, pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.cardBtnSecondaryText}>👁️ Preview</Text>
              </Pressable>

              <Pressable
                onPress={() => cloneResume(item)}
                accessibilityLabel="Duplicate resume"
                style={({ pressed }) => [styles.cardIconBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.cardIconBtnText}>📑</Text>
              </Pressable>

              <Pressable
                onPress={() => deleteResume(item)}
                accessibilityLabel="Delete resume"
                style={({ pressed }) => [styles.cardIconBtn, styles.cardIconBtnDanger, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.cardIconBtnDangerText}>🗑️</Text>
              </Pressable>
            </View>

            {/* AI Quick Launch Row */}
            <View style={styles.cardAiToolsWrap}>
              <Text style={styles.aiToolsHeader}>AI ACTION SHORTCUTS:</Text>
              <View style={styles.aiPillRow}>
                <Pressable
                  onPress={() =>
                    navigate({
                      name: "cover-letter",
                      resumeId: item.id,
                      resume: item.data ?? undefined,
                    })
                  }
                  style={({ pressed }) => [styles.aiPill, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.aiPillText}>✉️ Cover Letter</Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    navigate({
                      name: "interview-prep",
                      resumeId: item.id,
                      resume: item.data ?? undefined,
                    })
                  }
                  style={({ pressed }) => [styles.aiPill, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.aiPillText}>🎙️ Prep</Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    navigate({
                      name: "recruiter-audit",
                      resumeId: item.id,
                      resume: item.data ?? undefined,
                    })
                  }
                  style={({ pressed }) => [styles.aiPill, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.aiPillText}>🕵️ Scan</Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    navigate({
                      name: "outreach",
                      resumeId: item.id,
                      resume: item.data ?? undefined,
                    })
                  }
                  style={({ pressed }) => [styles.aiPill, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.aiPillText}>🤝 Pitch</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerBlock: { marginBottom: spacing.sm },

  // Hero Card
  heroCard: {
    backgroundColor: colors.text,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    position: "relative",
    overflow: "hidden",
  },
  heroGlowCircle: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primary,
    opacity: 0.35,
  },
  heroTextContent: {
    zIndex: 1,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(99, 102, 241, 0.3)",
    borderColor: "rgba(129, 140, 248, 0.5)",
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  heroBadgeText: {
    color: "#C7D2FE",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: fontSize.xl,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: fontSize.xs + 1,
    color: "#94A3B8",
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  heroActionsContainer: {
    gap: spacing.xs + 2,
  },
  heroBtnPrimaryFull: {
    minHeight: 46,
    width: "100%",
  },
  heroBtnRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroBtnSecondary: {
    flex: 1,
    minHeight: 38,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderColor: "rgba(255, 255, 255, 0.25)",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  // Tools Section & 2-Col Grid
  toolsSection: {
    marginBottom: spacing.lg,
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  toolGridCard: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs + 2,
  },
  toolGridCardPressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.98 }],
  },
  toolIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  toolIcon: {
    fontSize: 16,
  },
  toolInfo: {
    flex: 1,
    justifyContent: "center",
  },
  toolTitle: {
    fontSize: fontSize.xs + 1,
    fontWeight: "700",
    color: colors.text,
  },
  toolSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },

  // Section Header & Search
  sectionHeaderRow: {
    marginBottom: spacing.xs,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.md,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  clearSearch: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },

  // Resume Card
  resumeCard: {
    marginBottom: spacing.md,
    padding: spacing.md + 2,
    borderRadius: radius.lg,
  },
  resumeCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resumeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    marginBottom: 3,
  },
  resumeTitle: {
    fontSize: fontSize.md + 1,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  variantBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.xs,
  },
  variantBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.primary,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  roleIcon: {
    fontSize: 11,
  },
  roleText: {
    fontSize: fontSize.xs + 1,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  noRoleText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  // Card Primary Actions Row
  cardPrimaryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    marginBottom: spacing.sm + 2,
  },
  cardBtnPrimary: {
    flex: 1.2,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBtnPrimaryText: {
    fontSize: fontSize.xs + 1,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardBtnSecondary: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBtnSecondaryText: {
    fontSize: fontSize.xs + 1,
    fontWeight: "600",
    color: colors.text,
  },
  cardIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconBtnText: {
    fontSize: 14,
  },
  cardIconBtnDanger: {
    backgroundColor: colors.dangerBg,
    borderColor: "#FECACA",
  },
  cardIconBtnDangerText: {
    fontSize: 14,
  },

  // Card AI Tools Wrap & Pills
  cardAiToolsWrap: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiToolsHeader: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  aiPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  aiPill: {
    backgroundColor: colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiPillText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.text,
  },

  // Empty State
  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    marginTop: spacing.md,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },

  // Error
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.dangerDark,
    fontSize: fontSize.sm,
  },
});