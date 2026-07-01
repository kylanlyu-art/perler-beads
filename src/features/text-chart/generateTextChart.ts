import { checkGridSize } from '../../utils/limits.ts';
import type { MappedPixel } from '../../utils/pixelation';
import { calculateGridStats } from '../grid-core/gridStats.ts';
import { layoutTextPattern, type TextPatternSpec } from '../text-grid-core/index.ts';
import type { GeneratedTextChart, GenerateTextChartInput, GridCoordinate, Rect, TextChartLayer, TextChartRole, TextChartSemanticLayers } from './types';
import { resolveTextColor, toMappedPixel } from './textChartColorResolver.ts';
import { getTextChartStyle } from './textChartStyles.ts';
import { coordKey, getBounds, normalizeLayersToOrigin, translate, uniqueCells } from './textChartGeometry.ts';

const emptyDimensions = { width: 0, height: 0, N: 0, M: 0 };
const emptyLayers: TextChartSemanticLayers = {
  background: [],
  glyphFill: [],
  glyphOutline: [],
  glyphShadow: [],
  frame: [],
  decoration: [],
  manual: [],
};

function emptyResult(overrides: Partial<GeneratedTextChart>): GeneratedTextChart {
  return {
    valid: false,
    missingCharacters: [],
    invalidCharacters: [],
    warnings: [],
    grid: [],
    dimensions: emptyDimensions,
    stats: { colorCounts: {}, totalBeadCount: 0 },
    glyphBounds: { x: 0, y: 0, width: 0, height: 0 },
    contentBounds: { x: 0, y: 0, width: 0, height: 0 },
    semanticLayers: { ...emptyLayers },
    breakdown: {
      total: 0,
      background: 0,
      glyphStructure: 0,
      glyphFill: 0,
      glyphOutline: 0,
      glyphShadow: 0,
      frame: 0,
      decoration: 0,
    },
    ...overrides,
  };
}

function normalizeRole(role: TextChartRole): keyof TextChartSemanticLayers {
  if (role === 'glyph-fill') return 'glyphFill';
  if (role === 'glyph-outline') return 'glyphOutline';
  if (role === 'glyph-shadow') return 'glyphShadow';
  return role;
}

function layerCellColorRole(role: TextChartLayer['role']): keyof GenerateTextChartInput['colors'] {
  if (role === 'glyph-fill') return 'glyphFill';
  if (role === 'glyph-outline') return 'glyphOutline';
  if (role === 'glyph-shadow') return 'glyphShadow';
  return role;
}

function buildSpec(input: GenerateTextChartInput): TextPatternSpec {
  return {
    text: input.text,
    atlasId: input.atlas.atlasId,
    atlasVersion: input.atlas.fontVersion,
    direction: input.direction,
    scale: input.scale,
    letterSpacingCells: input.letterSpacingCells,
    lineSpacingCells: input.lineSpacingCells,
    fillColorId: 'glyph-fill',
    fillColorHex: input.colors.glyphFill,
    anchor: { x: 0, y: 0 },
    overwritePolicy: 'overwrite',
  };
}

function placeLayers(layers: TextChartLayer[], margin: number): {
  placedLayers: TextChartLayer[];
  contentBounds: Rect;
  finalBounds: Rect;
} {
  const normalized = normalizeLayersToOrigin(layers);
  return {
    contentBounds: { x: margin, y: margin, width: normalized.contentBounds.width, height: normalized.contentBounds.height },
    finalBounds: {
      x: 0,
      y: 0,
      width: normalized.contentBounds.width + margin * 2,
      height: normalized.contentBounds.height + margin * 2,
    },
    placedLayers: normalized.layers.map((layer) => ({
      ...layer,
      cells: translate(layer.cells, margin, margin),
    })),
  };
}

function writeLayer(
  grid: MappedPixel[][],
  semanticLayers: TextChartSemanticLayers,
  layer: TextChartLayer,
  pixel: MappedPixel,
) {
  const role = normalizeRole(layer.role);
  const nextCells: GridCoordinate[] = [];

  for (const cell of layer.cells) {
    if (!grid[cell.y]?.[cell.x]) continue;
    for (const key of Object.keys(semanticLayers) as Array<keyof TextChartSemanticLayers>) {
      if (key === 'manual') continue;
      semanticLayers[key] = semanticLayers[key].filter((existing) => coordKey(existing) !== coordKey(cell));
    }
    grid[cell.y][cell.x] = { ...pixel };
    nextCells.push(cell);
  }

  semanticLayers[role] = uniqueCells([...semanticLayers[role], ...nextCells]);
}

export function generateTextChart(input: GenerateTextChartInput): GeneratedTextChart {
  const trimmedText = input.text.trim();
  if (!trimmedText) {
    return emptyResult({
      invalidCharacters: [{ grapheme: input.text, reason: '请输入文字内容' }],
    });
  }
  if (input.availablePalette.length === 0) {
    return emptyResult({
      invalidCharacters: [{ grapheme: input.text, reason: '当前没有可用颜色' }],
    });
  }

  const placement = layoutTextPattern(buildSpec(input), input.atlas);
  if (!placement.valid) {
    return emptyResult({
      missingCharacters: placement.missingCharacters,
      invalidCharacters: placement.invalidCharacters,
      glyphBounds: placement.bounds,
    });
  }

  const glyphCells = uniqueCells(placement.cells.map((cell) => ({
    x: cell.x - placement.bounds.x,
    y: cell.y - placement.bounds.y,
  })));
  const glyphBounds = getBounds(glyphCells);
  const style = getTextChartStyle(input.styleId);
  const layers = style.buildLayers({ glyphCells, glyphBounds, scale: input.scale });
  const margin = input.scale === 1 ? 3 : 6;
  const { placedLayers, contentBounds, finalBounds } = placeLayers(layers, margin);
  const limit = checkGridSize(finalBounds.width, finalBounds.height);
  if (!limit.ok) {
    return emptyResult({
      invalidCharacters: [{
        grapheme: input.text,
        reason: `当前文字与风格将生成 ${finalBounds.width} × ${finalBounds.height} 格，超过图纸上限。请缩短文字、改为多行、切换 12 格，或选择更简洁的风格。`,
      }],
      glyphBounds,
      contentBounds,
    });
  }

  const warnings: string[] = [];
  const resolvedColors = {
    background: resolveTextColor('背景', input.colors.background, input.availablePalette),
    glyphFill: resolveTextColor('文字', input.colors.glyphFill, input.availablePalette),
    glyphOutline: resolveTextColor('描边', input.colors.glyphOutline ?? input.colors.glyphFill, input.availablePalette),
    glyphShadow: resolveTextColor('阴影', input.colors.glyphShadow ?? input.colors.glyphFill, input.availablePalette),
    frame: resolveTextColor('边框', input.colors.frame ?? input.colors.glyphFill, input.availablePalette),
    decoration: resolveTextColor('装饰', input.colors.decoration ?? input.colors.glyphFill, input.availablePalette),
  };
  for (const color of Object.values(resolvedColors)) {
    if (color.warning) warnings.push(color.warning);
  }

  const backgroundPixel = toMappedPixel(resolvedColors.background);
  const grid: MappedPixel[][] = Array.from({ length: finalBounds.height }, () =>
    Array.from({ length: finalBounds.width }, () => ({ ...backgroundPixel })),
  );
  const semanticLayers: TextChartSemanticLayers = {
    background: [],
    glyphFill: [],
    glyphOutline: [],
    glyphShadow: [],
    frame: [],
    decoration: [],
    manual: [],
  };
  for (let y = 0; y < finalBounds.height; y++) {
    for (let x = 0; x < finalBounds.width; x++) {
      semanticLayers.background.push({ x, y });
    }
  }

  for (const role of ['frame', 'decoration', 'glyph-shadow', 'glyph-outline', 'glyph-fill'] as const) {
    const roleLayers = placedLayers.filter((layer) => layer.role === role);
    for (const layer of roleLayers) {
      const colorKey = layerCellColorRole(role);
      writeLayer(grid, semanticLayers, layer, toMappedPixel(resolvedColors[colorKey]));
    }
  }

  const stats = calculateGridStats(grid);
  const dimensions = { width: finalBounds.width, height: finalBounds.height, N: finalBounds.width, M: finalBounds.height };
  const breakdown = {
    total: stats.totalBeadCount,
    background: semanticLayers.background.length,
    glyphFill: semanticLayers.glyphFill.length,
    glyphOutline: semanticLayers.glyphOutline.length,
    glyphShadow: semanticLayers.glyphShadow.length,
    frame: semanticLayers.frame.length,
    decoration: semanticLayers.decoration.length,
    glyphStructure:
      semanticLayers.glyphFill.length +
      semanticLayers.glyphOutline.length +
      semanticLayers.glyphShadow.length +
      semanticLayers.frame.length +
      semanticLayers.decoration.length,
  };

  return {
    valid: true,
    missingCharacters: [],
    invalidCharacters: [],
    warnings: [...new Set(warnings)],
    grid,
    dimensions,
    stats,
    glyphBounds: { x: contentBounds.x, y: contentBounds.y, width: glyphBounds.width, height: glyphBounds.height },
    contentBounds,
    semanticLayers,
    breakdown,
  };
}
