import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { readRoute, subscribeToRoute, writeRoute } from "./router";
import { colors, fontSize, radius, shadows, spacing } from "./theme";
import type { ResumeData } from "./types";

export type Screen =
  | { name: "dashboard" }
  | {
      name: "builder";
      resumeId?: string;
      title?: string;
      targetRole?: string | null;
      data?: ResumeData;
    }
  | { name: "preview"; resumeId?: string; title: string; data: ResumeData; unsaved?: boolean }
  | { name: "matcher"; resumeId?: string; resume?: ResumeData }
  | { name: "cover-letter"; resumeId?: string; resume?: ResumeData }
  | { name: "interview-prep"; resumeId?: string; resume?: ResumeData }
  | { name: "tracker" }
  | { name: "import-resume" }
  | { name: "recruiter-audit"; resumeId?: string; resume?: ResumeData }
  | { name: "outreach"; resumeId?: string; resume?: ResumeData };

interface NavContextValue {
  screen: Screen;
  navigate: (next: Screen) => void;
}

const NavContext = createContext<NavContextValue>({ screen: { name: "dashboard" }, navigate: () => {} });

export function useNav(): NavContextValue {
  return useContext(NavContext);
}

const TITLES: Record<Screen["name"], { title: string; subtitle: string }> = {
  dashboard: { title: "My Resumes", subtitle: "ATS Optimization Hub" },
  builder: { title: "Resume Builder", subtitle: "AI Content & Structure" },
  preview: { title: "Executive Preview", subtitle: "ATS Scan & A4 Layout" },
  matcher: { title: "Job Matcher", subtitle: "Keyword & Skill Gap Audit" },
  "cover-letter": { title: "AI Cover Letter", subtitle: "Targeted 1-Click Match" },
  "interview-prep": { title: "Interview Prep", subtitle: "STAR Behavioral Simulator" },
  tracker: { title: "Job Pipeline", subtitle: "Application Tracker" },
  "import-resume": { title: "Import Resume", subtitle: "AI Auto-Extract & Fill" },
  "recruiter-audit": { title: "Recruiter 6s Scan", subtitle: "Cold Read & Red Flag Audit" },
  outreach: { title: "Cold Outreach", subtitle: "LinkedIn & Referral Pitch" },
};

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>(() => {
    const routed = readRoute();
    return routed ? ({ name: routed } as Screen) : { name: "dashboard" };
  });

  const navigate = (next: Screen) => {
    setScreen(next);
    writeRoute(next.name);
  };

  // Browser back/forward: only deep-linkable screens can be restored this way.
  useEffect(() => subscribeToRoute((name) => setScreen({ name: (name ?? "dashboard") } as Screen)), []);

  return <NavContext.Provider value={{ screen, navigate }}>{children}</NavContext.Provider>;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { screen, navigate } = useNav();
  const screenMeta = TITLES[screen.name];
  const isDashboard = screen.name === "dashboard";

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, shadows.sm]}>
        {!isDashboard ? (
          <View style={styles.subHeaderWrap}>
            <Pressable
              onPress={() => navigate({ name: "dashboard" })}
              hitSlop={12}
              style={({ pressed }) => [styles.backCircleBtn, pressed && styles.backCircleBtnPressed]}
            >
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
            <View style={styles.titleWrap}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {screenMeta.title}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {screenMeta.subtitle}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.dashboardHeaderWrap}>
            <View style={styles.brandRow}>
              <View style={styles.brandLogo}>
                <Text style={styles.brandLogoText}>⚡</Text>
              </View>
              <View>
                <View style={styles.brandTitleRow}>
                  <Text style={styles.brandName}>ResumAI</Text>
                  <View style={styles.atsPill}>
                    <Text style={styles.atsPillText}>ATS PRO</Text>
                  </View>
                </View>
                <Text style={styles.brandTagline}>AI Resume Architect</Text>
              </View>
            </View>

            <View style={styles.statusIndicator}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Engine Active</Text>
            </View>
          </View>
        )}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const isWeb = Platform.OS === "web";

// Native reserves space for the notch/status bar; the browser has neither.
const HEADER_TOP_INSET = isWeb ? spacing.md + 2 : Platform.OS === "android" ? 44 : 52;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.background,
    maxWidth: isWeb ? 960 : undefined,
    alignSelf: "center",
    minHeight: isWeb ? "100vh" : undefined,
    borderLeftWidth: isWeb ? 1 : 0,
    borderRightWidth: isWeb ? 1 : 0,
    borderColor: colors.border,
  },
  header: {
    backgroundColor: colors.surface,
    paddingTop: HEADER_TOP_INSET,
    paddingBottom: spacing.sm + 2,
    paddingHorizontal: spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  subHeaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  backCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backCircleBtnPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  backArrow: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
    marginTop: -1,
  },
  titleWrap: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: fontSize.md + 1,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  dashboardHeaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  brandLogo: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogoText: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  brandTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandName: {
    fontSize: fontSize.lg,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  atsPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  atsPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successBg,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
    gap: 5,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  onlineText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.successDark,
  },
  body: { flex: 1 },
});