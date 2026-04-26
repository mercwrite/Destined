// theme.ts — Destined design tokens
// Atlas structure (editorial hierarchy) + Aurora softness (gentle gradients, soft shadows)
// Baby blue palette per CLAUDE.md.

export const colors = {
  // Brand
  accent: '#4291db',          // baby blue — primary CTA, highlights
  accentSoft: '#dbeafe',      // tints for chips, backgrounds, selected states
  accentDeep: '#2563a0',      // pressed / strong text on light
  accentGlow: 'rgba(66, 145, 219, 0.18)', // soft halo

  // Surfaces
  bg: '#f7f5f0',              // warm off-white app background (bone)
  surface: '#ffffff',         // cards, sheets
  surfaceSoft: '#faf8f3',     // subtle grouping
  surfaceWarm: '#fef6ee',     // soft peach accent surface (Aurora softness)

  // Ink (text)
  ink: '#1a1612',             // primary text — warm near-black
  inkSoft: '#6b6660',         // secondary text
  inkFaint: '#a09a92',        // tertiary / hints

  // Lines
  rule: 'rgba(26, 22, 18, 0.08)',
  ruleStrong: 'rgba(26, 22, 18, 0.16)',

  // Status
  success: '#5fa66f',
  danger: '#d96565',
  warning: '#e8a44a',

  // Pure
  white: '#ffffff',
  black: '#000000',
} as const;

export const gradients = {
  // Soft sunrise — used on welcome hero, match modal
  sunrise: ['#dbeafe', '#fce7e2', '#fef6ee'] as const,
  // Card overlay — bottom-of-photo readability
  cardScrim: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)'] as const,
  // Accent halo — behind hero elements
  accentHalo: ['rgba(66,145,219,0.2)', 'rgba(66,145,219,0)'] as const,
};

export const typography = {
  // Atlas uses Fraunces for editorial display; Aurora softens with DM Sans body.
  // If expo-font isn't set up, fall back to system serifs/sans.
  serif: 'Fraunces_500Medium',          // display headings
  serifItalic: 'Fraunces_500Medium_Italic',
  sans: 'DMSans_400Regular',            // body
  sansMedium: 'DMSans_500Medium',
  sansBold: 'DMSans_700Bold',
  mono: 'JetBrainsMono_500Medium',      // labels, eyebrow text

  // Type scale
  display: { fontSize: 44, lineHeight: 44, letterSpacing: -1.2 },
  h1: { fontSize: 30, lineHeight: 32, letterSpacing: -0.6 },
  h2: { fontSize: 22, lineHeight: 26, letterSpacing: -0.3 },
  h3: { fontSize: 18, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22 },
  bodySmall: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 11, lineHeight: 14, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  // Screen edge padding
  edge: 24,
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
  // Card radius — generous Aurora softness
  card: 24,
} as const;

export const shadows = {
  // Soft Aurora shadows — subtle warm-tinted lift, not harsh
  sm: {
    shadowColor: '#1a1612',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#1a1612',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  lg: {
    shadowColor: '#1a1612',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 12,
  },
  // Accent-tinted glow for primary CTAs
  accent: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Re-export as a single theme object for convenience
export const theme = { colors, gradients, typography, spacing, radii, shadows };
export type Theme = typeof theme;
