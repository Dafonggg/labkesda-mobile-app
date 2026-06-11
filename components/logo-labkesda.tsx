import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

// ── Labkesda Purwakarta — Official Logo ─────────────────────────────────────
// Source: assets/images/logo labkesda2.png
// Two variants:
//   • LogoIcon  — the icon-only mark (square, for circular containers)
//   • LogoFull  — full wordmark (wide aspect ratio)

// The new PNG logo (LABKESDA KABUPATEN PURWAKARTA)
const LOGO_SOURCE = require('@/assets/images/logo labkesda2.png');

// Original image aspect ratio (approximate from the PNG)
const FULL_ASPECT_RATIO = 1834 / 375; // wide wordmark
const ICON_ASPECT_RATIO = 1; // square crop for icon usage

interface LogoProps {
  /** Width of the logo (height scales proportionally) */
  width?: number;
  /** Height of the logo (width scales proportionally, ignored if width is set) */
  height?: number;
  /** Optional extra styles */
  style?: StyleProp<ImageStyle>;
}

/**
 * The icon-only mark — renders the full logo image scaled to fit
 * inside a square/circular container (like splash & login circles).
 */
export function LogoIcon({ width = 80, height, style }: LogoProps) {
  const w = width;
  const h = height ?? w / ICON_ASPECT_RATIO;

  return (
    <Image
      source={LOGO_SOURCE}
      style={[{ width: w, height: h }, style]}
      resizeMode="contain"
    />
  );
}

/**
 * Full wordmark logo — renders the full logo image at wide aspect ratio.
 */
export function LogoFull({ width = 280, height, style }: LogoProps) {
  const w = width;
  const h = height ?? w / FULL_ASPECT_RATIO;

  return (
    <Image
      source={LOGO_SOURCE}
      style={[{ width: w, height: h }, style]}
      resizeMode="contain"
    />
  );
}
