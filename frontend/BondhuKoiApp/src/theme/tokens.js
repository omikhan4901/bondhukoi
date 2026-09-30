/**
 * The only place colours, spacing, radii and type sizes are defined (docs/design.md).
 * Screens use these through useTheme(); a lint rule keeps hex values out of screens.
 */
export const palettes = {
  light: {
    brand: '#C2410C',
    brandPressed: '#9A3412',
    brandSoft: '#FFF4EE',
    brandLine: '#FFE4D5',
    onBrand: '#FFFFFF',
    ink: '#0F172A',
    muted: '#5B6B7F',
    faint: '#94A3B8',
    page: '#F8FAFC',
    surface: '#FFFFFF',
    sunken: '#F1F5F9',
    line: '#E2E8F0',
    here: '#15803D',
    hereDot: '#16A34A',
    hereSoft: '#F0FDF4',
    away: '#94A3B8',
    paused: '#B45309',
    pausedSoft: '#FFFBEB',
    danger: '#DC2626',
    dangerSoft: '#FEF2F2',
    overlay: 'rgba(15, 23, 42, 0.45)',
    shadow: '#0F172A',
  },
  dark: {
    brand: '#FB923C',
    brandPressed: '#FDBA74',
    brandSoft: '#2A1508',
    brandLine: '#7C2D12',
    onBrand: '#1C0A02',
    ink: '#F1F5F9',
    muted: '#94A3B8',
    faint: '#64748B',
    page: '#0B1220',
    surface: '#111A2E',
    sunken: '#0E1628',
    line: '#1E293B',
    here: '#4ADE80',
    hereDot: '#22C55E',
    hereSoft: '#0B2416',
    away: '#64748B',
    paused: '#FBBF24',
    pausedSoft: '#2A1F05',
    danger: '#F87171',
    dangerSoft: '#2A0F12',
    overlay: 'rgba(0, 0, 0, 0.6)',
    shadow: '#000000',
  },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 12, md: 16, lg: 24, full: 999 };

export const fonts = {
  display: 'PlusJakartaSans_700Bold',
  displaySemi: 'PlusJakartaSans_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
};

export const type = {
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  title: { fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 24 },
  secondary: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  secondaryStrong: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  stat: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.6 },
};

export const MIN_TOUCH = 44;
