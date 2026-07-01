import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateTextChart } from './generateTextChart.ts';
import { textChartStyles } from './textChartStyles.ts';
import type { GlyphAtlas } from '../text-grid-core/types.ts';
import type { TextChartStyleId } from './types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const atlas = JSON.parse(
  readFileSync(join(here, '../text-grid-core/generated/fusion-12-zh-hans-mono.v2026.05.07.json'), 'utf8'),
) as GlyphAtlas;

const exactPalette = [
  { key: 'WHITE', color: '#FFFFFF' },
  { key: 'GREEN', color: '#1F9D8A' },
  { key: 'CREAM', color: '#F7E8C8' },
  { key: 'BROWN', color: '#7A4F2A' },
  { key: 'WOOD', color: '#C89155' },
  { key: 'LEAF', color: '#3F8F4E' },
  { key: 'NAVY', color: '#101826' },
  { key: 'YELLOW', color: '#F8D84A' },
  { key: 'CYAN', color: '#4DE1D2' },
  { key: 'VIOLET', color: '#4B3A8F' },
  { key: 'SCREEN', color: '#9BBC0F' },
  { key: 'SCREEN_DARK', color: '#306230' },
  { key: 'SCREEN_MID', color: '#8BAC0F' },
  { key: 'NEON_BG', color: '#130A1F' },
  { key: 'NEON_OUTER', color: '#43316D' },
  { key: 'NEON_INNER', color: '#00E5FF' },
  { key: 'NEON_FILL', color: '#FFF7D6' },
];

function baseInput(overrides: Partial<Parameters<typeof generateTextChart>[0]> = {}) {
  return {
    text: '绿色靓仔',
    atlas,
    direction: 'horizontal' as const,
    scale: 1 as const,
    letterSpacingCells: 1 as const,
    lineSpacingCells: 1 as const,
    styleId: 'minimal' as TextChartStyleId,
    colors: textChartStyles.minimal.defaultColorTargets,
    availablePalette: exactPalette,
    ...overrides,
  };
}

test('generates a complete 12-cell minimal chart with real background beads', () => {
  const chart = generateTextChart(baseInput());

  assert.equal(chart.valid, true);
  assert.equal(chart.dimensions.width, chart.glyphBounds.width + 6);
  assert.equal(chart.dimensions.height, chart.glyphBounds.height + 6);
  assert.equal(chart.contentBounds.x, 3);
  assert.equal(chart.contentBounds.y, 3);
  assert.equal(chart.stats.totalBeadCount, chart.dimensions.width * chart.dimensions.height);
  assert.equal(chart.breakdown.total, chart.stats.totalBeadCount);
  assert.equal(chart.breakdown.background + chart.breakdown.glyphFill, chart.breakdown.total);
  assert.ok(chart.semanticLayers.glyphFill.length > 0);
  assert.ok(chart.grid.flat().every((cell) => cell && cell.isExternal !== true));
});

test('uses a 6-cell outer margin for 24-cell text', () => {
  const chart = generateTextChart(baseInput({ scale: 2 }));

  assert.equal(chart.valid, true);
  assert.equal(chart.dimensions.width, chart.glyphBounds.width + 12);
  assert.equal(chart.dimensions.height, chart.glyphBounds.height + 12);
  assert.equal(chart.contentBounds.x, 6);
  assert.equal(chart.contentBounds.y, 6);
});

test('rejects missing glyphs without returning a partial grid', () => {
  const chart = generateTextChart(baseInput({ text: '🙂' }));

  assert.equal(chart.valid, false);
  assert.equal(chart.missingCharacters[0].grapheme, '🙂');
  assert.equal(chart.grid.length, 0);
  assert.equal(chart.stats.totalBeadCount, 0);
});

test('keeps all text chart styles deterministic', () => {
  for (const styleId of Object.keys(textChartStyles) as TextChartStyleId[]) {
    const first = generateTextChart(baseInput({ styleId, colors: textChartStyles[styleId].defaultColorTargets }));
    const second = generateTextChart(baseInput({ styleId, colors: textChartStyles[styleId].defaultColorTargets }));

    assert.equal(first.valid, true, `${styleId} should be valid`);
    assert.deepEqual(first.grid, second.grid, `${styleId} grid should be deterministic`);
    assert.deepEqual(first.semanticLayers, second.semanticLayers, `${styleId} layers should be deterministic`);
    assert.deepEqual(first.stats, second.stats, `${styleId} stats should be deterministic`);
  }
});

test('uses simplified 12-cell geometry for complex decorative styles', () => {
  const farm12 = generateTextChart(baseInput({ styleId: 'farm-sign', colors: textChartStyles['farm-sign'].defaultColorTargets }));
  const farm24 = generateTextChart(baseInput({ styleId: 'farm-sign', scale: 2, colors: textChartStyles['farm-sign'].defaultColorTargets }));
  const neon12 = generateTextChart(baseInput({ styleId: 'neon', colors: textChartStyles.neon.defaultColorTargets }));
  const neon24 = generateTextChart(baseInput({ styleId: 'neon', scale: 2, colors: textChartStyles.neon.defaultColorTargets }));

  assert.ok(farm12.semanticLayers.decoration.length > 0);
  assert.ok(farm24.semanticLayers.decoration.length > farm12.semanticLayers.decoration.length);
  assert.equal(neon12.semanticLayers.glyphShadow.length, 0);
  assert.ok(neon24.semanticLayers.glyphShadow.length > 0);
});

test('falls back to available palette colors and reports warnings', () => {
  const narrowPalette = [
    { key: 'BLACK', color: '#000000' },
    { key: 'WHITE', color: '#FFFFFF' },
  ];
  const chart = generateTextChart(baseInput({ availablePalette: narrowPalette }));

  assert.equal(chart.valid, true);
  assert.ok(chart.warnings.length > 0);
  const available = new Set(narrowPalette.map((color) => color.color));
  assert.ok(chart.grid.flat().every((cell) => available.has(cell.color)));
});
