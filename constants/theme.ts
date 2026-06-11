/**
 * SIA Labkesda – Design Token System
 * Matches the Stitch-generated design system for consistent UI.
 */
import { Platform } from 'react-native';

export const Colors = {
  primary: '#006a44',
  primaryContainer: '#0b8658',
  primaryFixed: '#90f7c0',
  primaryFixedDim: '#73daa5',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#fafff9',

  secondary: '#675e42',
  secondaryContainer: '#efe2bf',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#6d6448',

  tertiary: '#096a45',
  tertiaryContainer: '#2f845d',
  tertiaryFixed: '#a0f4c5',
  tertiaryFixedDim: '#84d7aa',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#fbfff9',

  background: '#fbf9f8',
  creamBg: '#FFFCF5',
  surface: '#fbf9f8',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f6f3f2',
  surfaceContainer: '#f0eded',
  surfaceContainerHigh: '#eae8e7',
  surfaceContainerHighest: '#e4e2e1',
  surfaceVariant: '#e4e2e1',
  onSurface: '#1b1c1c',
  onSurfaceVariant: '#3e4942',
  onBackground: '#1b1c1c',
  inverseSurface: '#303030',
  inverseOnSurface: '#f3f0f0',
  inversePrimary: '#73daa5',

  outline: '#6e7a71',
  outlineVariant: '#bdcabf',

  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  // Status colors
  statusSuccess: '#16A34A',
  statusWarning: '#F59E0B',
  statusDanger: '#DC2626',
  statusInfo: '#2563EB',

  // Gray scale
  gray100: '#F5F5F5',
  gray200: '#E5E5E5',
  gray400: '#A3A3A3',
  gray700: '#404040',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const FontSize = {
  labelSm: 12,
  labelMd: 14,
  bodySm: 12,
  bodyMd: 14,
  bodyLg: 16,
  headlineSm: 20,
  headlineMd: 24,
  headlineLg: 28,
  headlineXl: 32,
};

/**
 * Android-safe card background colors.
 * On Android (especially Samsung One UI), rgba() + elevation causes
 * partial color rendering / clipping. These provide visually equivalent
 * solid opaque colors computed against creamBg (#FFFCF5).
 */
export const CardBg = {
  /** ~72% white over creamBg */
  glass72: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.72)',
  /** ~45% white over creamBg */
  glass45: Platform.OS === 'android' ? '#FEFEFE' : 'rgba(255,255,255,0.45)',
  /** ~60% white over creamBg */
  glass60: Platform.OS === 'android' ? '#FEFEFE' : 'rgba(255,255,255,0.6)',
  /** ~82% white over creamBg */
  glass82: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)',
  /** ~55% white over creamBg */
  glass55: Platform.OS === 'android' ? '#FEFEFE' : 'rgba(255,255,255,0.55)',
  /** ~98% white (tab bar) */
  glass98: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.98)',
};

/**
 * Backwards-compatible light/dark structure for Expo template components.
 * New screens should use the flat `Colors.*` tokens directly.
 */
export const ThemeColors = {
  light: {
    text: Colors.onSurface,
    background: Colors.background,
    tint: Colors.primary,
    icon: Colors.onSurfaceVariant,
    tabIconDefault: Colors.onSurfaceVariant,
    tabIconSelected: Colors.primary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: Colors.inversePrimary,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: Colors.inversePrimary,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
