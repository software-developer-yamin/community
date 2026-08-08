// Golden Hour Studio — see DESIGN.md for the full rationale behind every token.
const gamification = {
  ember: "#FF8C42",
  progressGreen: "#17B978",
  sky: "#2FB6E0",
  aurum: "#E8B34C",
} as const;

const semantic = {
  success: gamification.progressGreen,
  successForeground: "#FFFFFF",
  destructive: "#E23D42",
  destructiveForeground: "#FFFFFF",
  destructiveSurface: "rgba(226,61,66,0.1)",
  warning: "#F5A623",
  warningForeground: "#FFFFFF",
  warningSurface: "rgba(245,166,35,0.12)",
  info: gamification.sky,
  infoForeground: "#FFFFFF",
  infoSurface: "rgba(47,182,224,0.12)",
} as const;

const gradients = {
  practice: ["#6C4DFF", "#FF6B4A"] as const, // primary CTA, AI/premium moments
  streak: ["#FF8C42", "#FF6B4A"] as const, // streak flame chip
  pro: ["#F7D77E", "#E8B34C"] as const, // Pro/premium gold
} as const;

export const lightTheme = {
  colors: {
    ...gamification,
    ...semantic,
    // Learn register (light)
    background: "#FFFBF5", // cream
    foreground: "#1A1523", // ink
    typography: "#1A1523",
    card: "#FFFFFF", // paper
    cardForeground: "#1A1523",
    border: "#F1E7DA", // sand
    input: "#F1E7DA",
    primary: "#6C4DFF", // violet
    primaryPressed: "#4B31D6",
    primaryForeground: "#FFFFFF",
    secondary: "#FF6B4A", // coral
    secondaryPressed: "#E8502F",
    secondaryForeground: "#FFFFFF",
    muted: "#F1E7DA",
    mutedForeground: "#6B6478",
    accent: "#F5EEE3",
    accentForeground: "#1A1523",
    ring: "#6C4DFF",
    // Live/Stage register — fixed dark regardless of system theme
    stage: "#0E0B14",
    stageCard: "#1B1626",
    stageBorder: "rgba(255,255,255,0.08)",
    stageForeground: "#F5F2FA",
    stageMutedForeground: "#A79FBD",
  },
  gradients,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    // `none` is kept for screens not yet migrated to Golden Hour Studio
    // (see ARCHITECTURE.md roadmap); new/rebuilt screens use pill buttons
    // and never reach for `none`.
    none: 0,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },
  fontFamily: {
    display: "Sora_700Bold",
    headline: "Sora_700Bold",
    title: "Sora_600SemiBold",
    body: "Manrope_400Regular",
    bodyStrong: "Manrope_600SemiBold",
    label: "Manrope_600SemiBold",
    caption: "Manrope_500Medium",
  },
  shadow: {
    card: {
      shadowColor: "#6C4DFF",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
    cta: {
      shadowColor: "#FF6B4A",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 24,
      elevation: 8,
    },
    tabBar: {
      shadowColor: "#1A1523",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
      elevation: 6,
    },
  },
} as const;

export const darkTheme = {
  colors: {
    ...gamification,
    ...semantic,
    // Golden Hour Studio's "Learn" register in dark mode uses the same Stage
    // palette as Live contexts — one dark surface language, not two.
    background: "#0E0B14",
    foreground: "#F5F2FA",
    typography: "#F5F2FA",
    card: "#1B1626",
    cardForeground: "#F5F2FA",
    border: "rgba(255,255,255,0.08)",
    input: "rgba(255,255,255,0.08)",
    primary: "#8B72FF",
    primaryPressed: "#6C4DFF",
    primaryForeground: "#0E0B14",
    secondary: "#FF8266",
    secondaryPressed: "#FF6B4A",
    secondaryForeground: "#0E0B14",
    muted: "rgba(255,255,255,0.06)",
    mutedForeground: "#A79FBD",
    accent: "#241D33",
    accentForeground: "#F5F2FA",
    ring: "#8B72FF",
    stage: "#0E0B14",
    stageCard: "#1B1626",
    stageBorder: "rgba(255,255,255,0.08)",
    stageForeground: "#F5F2FA",
    stageMutedForeground: "#A79FBD",
  },
  gradients,
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  fontSize: lightTheme.fontSize,
  fontFamily: lightTheme.fontFamily,
  shadow: {
    card: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    cta: {
      shadowColor: "#FF6B4A",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
      elevation: 8,
    },
    tabBar: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
  },
} as const;
