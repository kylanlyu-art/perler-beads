import type { MappedPixel } from '../../utils/pixelation';

export interface ResolvedTextColor {
  key: string;
  color: string;
  warning?: string;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface PaletteEntry {
  key: string;
  hex: string;
  rgb: RgbColor;
}

function hexToRgb(hex: string): RgbColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

function colorDistance(a: RgbColor, b: RgbColor): number {
  return Math.sqrt(
    (a.r - b.r) * (a.r - b.r) +
    (a.g - b.g) * (a.g - b.g) +
    (a.b - b.b) * (a.b - b.b),
  );
}

function findClosestPaletteColor(targetRgb: RgbColor, palette: PaletteEntry[]): PaletteEntry {
  let closest = palette[0];
  let minDistance = Infinity;
  for (const color of palette) {
    const distance = colorDistance(targetRgb, color.rgb);
    if (distance < minDistance) {
      minDistance = distance;
      closest = color;
    }
  }
  return closest;
}

function toPaletteColor(color: { key: string; color: string }): PaletteEntry | null {
  const hex = color.color.toUpperCase();
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return { key: color.key, hex, rgb };
}

export function resolveTextColor(
  roleLabel: string,
  targetHex: string,
  availablePalette: Array<{ key: string; color: string }>,
): ResolvedTextColor {
  const normalizedTarget = targetHex.toUpperCase();
  const exact = availablePalette.find((color) => color.color.toUpperCase() === normalizedTarget);
  if (exact) {
    return { key: exact.key, color: exact.color.toUpperCase() };
  }

  const targetRgb = hexToRgb(normalizedTarget);
  const palette = availablePalette.map(toPaletteColor).filter((color): color is PaletteEntry => color !== null);
  if (!targetRgb || palette.length === 0) {
    return {
      key: availablePalette[0]?.key ?? 'ERR',
      color: availablePalette[0]?.color.toUpperCase() ?? '#000000',
      warning: `${roleLabel} 默认色 ${targetHex} 不可用，已使用可用色板中的备用色。`,
    };
  }

  const closest = findClosestPaletteColor(targetRgb, palette);
  return {
    key: closest.key,
    color: closest.hex.toUpperCase(),
    warning: `${roleLabel} 默认色 ${targetHex} 不在当前色板中，已映射为 ${closest.key}。`,
  };
}

export function toMappedPixel(resolved: ResolvedTextColor): MappedPixel {
  return { key: resolved.key, color: resolved.color, isExternal: false };
}
