export const colors = {
  background: "#f7f3e6",
  foreground: "#121212",
  card: "#fffdf7",
  muted: "#ece6d8",
  mutedForeground: "rgba(18, 18, 18, 0.62)",
  primary: "#0a3f2e",
  accent: "#0e6a4f",
  border: "rgba(10, 63, 46, 0.14)",
  success: "#0f8a58",
  warning: "#e59819",
  destructive: "#dc2626",
  syncing: "#1f73d8",
  offline: "#5f6368",
  gold: "#c99a2e",
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  18: 72,
  20: 80,
  24: 96,
  30: 120,
} as const;

export const components = {
  tabBar: {
    height: spacing[18],
    horizontalInset: spacing[4],
    radius: spacing[6],
    iconFrame: spacing[12],
    itemPaddingVertical: spacing[2],
  },
} as const;

export const theme = {
  colors,
  spacing,
  components,
} as const;
