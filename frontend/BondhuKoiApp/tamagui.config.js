import { createAnimations } from "@tamagui/animations-moti";
import { createFont, createTamagui, createTokens } from "tamagui";
import { shorthands } from "@tamagui/shorthands";

const headingFont = createFont({
  family: "Manrope",
  size: { 1: 12, 2: 14, 3: 18, 4: 24, 5: 28, 6: 32, 7: 40, 8: 48, 9: 56, true: 24 },
  lineHeight: { 1: 16, 2: 20, 3: 24, 4: 32, 5: 36, 6: 40, 7: 48, 8: 56, 9: 64 },
  weight: { 4: "600", 9: "800", true: "600" },
  letterSpacing: { 4: -0.5, 9: -1 },
});

const bodyFont = createFont({
  family: "Inter",
  size: { 1: 12, 2: 14, 3: 16, 4: 18, true: 16 },
  lineHeight: { 1: 18, 2: 22, 3: 26, 4: 28 },
  weight: { 4: "400", 6: "600", true: "400" },
});

const tokens = createTokens({
  color: {
    // Light (Digital Sanctuary)
    lightSurface: "#F9F9F9",
    lightSurfaceContainerLow: "#F2F4F4",
    lightSurfaceContainer: "#EBEBEB",
    lightSurfaceContainerHigh: "#E4E9EA",
    lightSurfaceContainerHighest: "#DDE2E3",
    lightSurfaceContainerLowest: "#FFFFFF",
    lightPrimary: "#005BC1",
    lightPrimaryDim: "#004FAA",
    lightOnSurface: "#2D3435",
    lightOnSurfaceVariant: "#5A6061",
    lightOutlineVariant: "rgba(45, 52, 53, 0.15)",
    
    // Dark (Midnight Sanctuary)
    darkSurface: "#111317",
    darkSurfaceContainerLow: "#1A1C20",
    darkSurfaceContainer: "#1E2024",
    darkSurfaceContainerHigh: "#282A2E",
    darkSurfaceContainerHighest: "#33353A",
    darkSurfaceContainerLowest: "#0A0B0D",
    darkPrimary: "#A2C9FF",
    darkPrimaryContainer: "#47A1FF",
    darkTertiary: "#2AE500",
    darkOnSurface: "#FFFFFF",
    darkOnSurfaceVariant: "#8A919D",
    darkOutlineVariant: "rgba(255, 255, 255, 0.15)",
    red: "#FF453A",
  },
  size: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, true: 16 },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 10: 40, 12: 48, 16: 64, true: 16 },
  radius: { md: 12, lg: 16, xl: 24, "3xl": 48, full: 9999, true: 16 },
  zIndex: { 0: 0, 1: 100, 5: 500, true: 0 },
});

const lightTheme = {
  background: tokens.color.lightSurface,
  surface: tokens.color.lightSurface,
  surfaceContainerLow: tokens.color.lightSurfaceContainerLow,
  surfaceContainer: tokens.color.lightSurfaceContainer,
  surfaceContainerHigh: tokens.color.lightSurfaceContainerHigh,
  surfaceContainerHighest: tokens.color.lightSurfaceContainerHighest,
  surfaceContainerLowest: tokens.color.lightSurfaceContainerLowest,
  primary: tokens.color.lightPrimary,
  primaryContainer: tokens.color.lightPrimaryDim,
  onPrimary: "#FFFFFF",
  onSurface: tokens.color.lightOnSurface,
  onSurfaceVariant: tokens.color.lightOnSurfaceVariant,
  outlineVariant: tokens.color.lightOutlineVariant,
  tertiary: tokens.color.darkTertiary, // Shared
  error: tokens.color.red,
};

const darkTheme = {
  background: tokens.color.darkSurface,
  surface: tokens.color.darkSurface,
  surfaceContainerLow: tokens.color.darkSurfaceContainerLow,
  surfaceContainer: tokens.color.darkSurfaceContainer,
  surfaceContainerHigh: tokens.color.darkSurfaceContainerHigh,
  surfaceContainerHighest: tokens.color.darkSurfaceContainerHighest,
  surfaceContainerLowest: tokens.color.darkSurfaceContainerLowest,
  primary: tokens.color.darkPrimary,
  primaryContainer: tokens.color.darkPrimaryContainer,
  onPrimary: "#000000",
  onSurface: tokens.color.darkOnSurface,
  onSurfaceVariant: tokens.color.darkOnSurfaceVariant,
  outlineVariant: tokens.color.darkOutlineVariant,
  tertiary: tokens.color.darkTertiary,
  error: tokens.color.red,
};

export default createTamagui({
  animations: createAnimations({
    fast: { type: "spring", damping: 20, stiffness: 250 },
  }),
  fonts: { heading: headingFont, body: bodyFont },
  tokens,
  shorthands,
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
});
