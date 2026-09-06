export const colors = {
  // Brand & Accents
  primary: "#4F46E5",       // Modern Indigo
  primaryDark: "#3730A3",
  primaryLight: "#EEF2FF",
  secondary: "#0EA5E9",     // Vibrant Sky
  secondaryLight: "#E0F2FE",
  accent: "#8B5CF6",        // Violet accent
  accentLight: "#F5F3FF",

  // Neutrals & Surfaces
  background: "#F8FAFC",     // Premium Slate light
  surface: "#FFFFFF",
  surfaceSubtle: "#F1F5F9",
  surfaceMuted: "#E2E8F0",
  border: "#E2E8F0",
  borderDark: "#CBD5E1",

  // Typography
  text: "#0F172A",          // Deep Slate
  textMuted: "#64748B",
  textSubtle: "#94A3B8",
  textInverse: "#FFFFFF",

  // Feedback & ATS Indicators
  success: "#10B981",       // Emerald
  successDark: "#047857",
  successBg: "#DCFCE7",
  warning: "#F59E0B",       // Amber
  warningDark: "#B45309",
  warningBg: "#FEF3C7",
  danger: "#EF4444",        // Rose/Red
  dangerDark: "#B91C1C",
  dangerBg: "#FEE2E2",

  pageLine: "#EF4444",
  shadow: "#0F172A",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
};

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const font = {
  regular: "System",
  medium: "System",
  semibold: "System",
  bold: "System",
};