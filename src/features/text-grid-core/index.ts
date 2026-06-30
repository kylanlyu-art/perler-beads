export type {
  GlyphAtlas,
  GlyphBitmap,
  LetterSpacingCells,
  LineSpacingCells,
  OverwritePolicy,
  TextDirection,
  TextGridCell,
  TextGridPatch,
  TextPatternSpec,
  TextPlacementResult,
  TextScale,
} from './types';

import type {
  GlyphAtlas,
  GlyphBitmap,
  TextGridCell,
  TextGridPatch,
  TextPatternSpec,
  TextPlacementCell,
  TextPlacementResult,
} from './types';

const MAX_GRAPHEMES = 48;
const MAX_LINES = 4;

function toGlyphKey(grapheme: string): string {
  const codePoint = grapheme.codePointAt(0);
  if (codePoint === undefined) return '';
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

function segmentLine(line: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(line), (item) => item.segment);
  }
  return Array.from(line);
}

function segmentText(text: string): string[][] {
  return text.normalize('NFC').split('\n').map(segmentLine);
}

function validateRows(glyph: GlyphBitmap): boolean {
  return (
    glyph.rows.length === glyph.height &&
    glyph.rows.every((row) => row.length === glyph.width && /^[01]+$/.test(row))
  );
}

export function validateGlyphAtlas(atlas: GlyphAtlas): string[] {
  const errors: string[] = [];
  for (const [key, glyph] of Object.entries(atlas.glyphs)) {
    if (!validateRows(glyph)) {
      errors.push(`${key} has invalid rows`);
    }
    if (glyph.advanceCells < 0) {
      errors.push(`${key} has negative advanceCells`);
    }
  }
  return errors;
}

function lookupGlyph(atlas: GlyphAtlas, grapheme: string): GlyphBitmap | null {
  if (Array.from(grapheme).length !== 1) return null;
  return atlas.glyphs[toGlyphKey(grapheme)] ?? null;
}

function isForbiddenControl(grapheme: string): boolean {
  return Array.from(grapheme).some((char) => {
    const codePoint = char.codePointAt(0);
    return codePoint !== undefined && codePoint < 32 && char !== '\n';
  });
}

function emitGlyphCells(
  glyph: GlyphBitmap,
  originX: number,
  originY: number,
  spec: TextPatternSpec,
  cellsByCoord: Map<string, TextPlacementCell>,
): void {
  for (let row = 0; row < glyph.rows.length; row++) {
    for (let col = 0; col < glyph.width; col++) {
      if (glyph.rows[row][col] !== '1') continue;

      const baseX = originX + (glyph.bearingXCells + col) * spec.scale;
      const baseY = originY + row * spec.scale;
      for (let scaleY = 0; scaleY < spec.scale; scaleY++) {
        for (let scaleX = 0; scaleX < spec.scale; scaleX++) {
          const x = baseX + scaleX;
          const y = baseY + scaleY;
          const coordKey = `${x}:${y}`;
          if (!cellsByCoord.has(coordKey)) {
            cellsByCoord.set(coordKey, {
              x,
              y,
              colorId: spec.fillColorId,
              colorHex: spec.fillColorHex,
            });
          }
        }
      }
    }
  }
}

function computeBounds(cells: TextPlacementCell[], anchor: { x: number; y: number }) {
  if (cells.length === 0) {
    return { x: anchor.x, y: anchor.y, width: 0, height: 0 };
  }
  const xs = cells.map((cell) => cell.x);
  const ys = cells.map((cell) => cell.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function layoutTextPattern(
  spec: TextPatternSpec,
  atlas: GlyphAtlas,
  grid?: { width: number; height: number; cells?: TextGridCell[][] },
): TextPlacementResult {
  const normalizedText = spec.text.normalize('NFC');
  const lines = segmentText(normalizedText);
  const missingCharacters: TextPlacementResult['missingCharacters'] = [];
  const invalidCharacters: TextPlacementResult['invalidCharacters'] = [];
  const cellsByCoord = new Map<string, TextPlacementCell>();

  if (lines.length > MAX_LINES) {
    invalidCharacters.push({ grapheme: normalizedText, reason: `最多支持 ${MAX_LINES} 行文字` });
  }

  const allGraphemes = lines.flat();
  if (allGraphemes.length > MAX_GRAPHEMES) {
    invalidCharacters.push({ grapheme: normalizedText, reason: `最多支持 ${MAX_GRAPHEMES} 个字符` });
  }

  for (const grapheme of allGraphemes) {
    if (isForbiddenControl(grapheme)) {
      invalidCharacters.push({ grapheme, reason: '不支持不可见控制字符' });
      continue;
    }
    if (!lookupGlyph(atlas, grapheme)) {
      missingCharacters.push({ grapheme, codePoint: toGlyphKey(grapheme) });
    }
  }

  if (missingCharacters.length === 0 && invalidCharacters.length === 0) {
    if (spec.direction === 'horizontal') {
      let y = spec.anchor.y;
      for (const line of lines) {
        let x = spec.anchor.x;
        for (const grapheme of line) {
          const glyph = lookupGlyph(atlas, grapheme);
          if (!glyph) continue;
          emitGlyphCells(glyph, x, y, spec, cellsByCoord);
          x += glyph.advanceCells * spec.scale + spec.letterSpacingCells;
        }
        y += atlas.defaultLineHeightCells * spec.scale + spec.lineSpacingCells;
      }
    } else {
      let x = spec.anchor.x;
      for (const line of lines) {
        let y = spec.anchor.y;
        for (const grapheme of line) {
          const glyph = lookupGlyph(atlas, grapheme);
          if (!glyph) continue;
          emitGlyphCells(glyph, x, y, spec, cellsByCoord);
          y += atlas.defaultLineHeightCells * spec.scale + spec.letterSpacingCells;
        }
        x += atlas.defaultLineHeightCells * spec.scale + spec.lineSpacingCells;
      }
    }
  }

  const cells = Array.from(cellsByCoord.values()).sort((a, b) => a.y - b.y || a.x - b.x);
  const outOfBounds: TextPlacementResult['outOfBounds'] = [];
  const collisions: TextPlacementResult['collisions'] = [];
  const occupiedIndices: number[] = [];

  if (grid) {
    for (const cell of cells) {
      if (cell.x < 0 || cell.y < 0 || cell.x >= grid.width || cell.y >= grid.height) {
        outOfBounds.push({ x: cell.x, y: cell.y });
        continue;
      }
      occupiedIndices.push(cell.y * grid.width + cell.x);
      const existing = grid.cells?.[cell.y]?.[cell.x];
      if (spec.overwritePolicy === 'empty-only' && existing && !existing.isExternal) {
        collisions.push({ x: cell.x, y: cell.y, existingColorId: existing.key });
      }
    }
  }

  return {
    bounds: computeBounds(cells, spec.anchor),
    cells,
    occupiedIndices,
    missingCharacters,
    invalidCharacters,
    outOfBounds,
    collisions,
    valid:
      cells.length > 0 &&
      missingCharacters.length === 0 &&
      invalidCharacters.length === 0 &&
      outOfBounds.length === 0 &&
      collisions.length === 0,
  };
}

export function createTextGridPatch(
  grid: TextGridCell[][],
  placement: TextPlacementResult,
  spec: TextPatternSpec,
): TextGridPatch | null {
  if (!placement.valid) return null;

  const before = placement.cells.map((cell) => ({
    x: cell.x,
    y: cell.y,
    before: { ...grid[cell.y][cell.x] },
    after: { key: cell.colorId, color: cell.colorHex, isExternal: false },
  }));

  return {
    type: 'apply-text-placement',
    before,
    after: before.map((item) => ({ ...item, before: { ...item.before }, after: { ...item.after } })),
    metadata: {
      text: spec.text,
      atlasId: spec.atlasId,
      atlasVersion: spec.atlasVersion,
      timestamp: new Date().toISOString(),
    },
  };
}

export function applyTextGridPatch(grid: TextGridCell[][], patch: TextGridPatch, mode: 'redo' | 'undo'): TextGridCell[][] {
  const next = grid.map((row) => row.map((cell) => ({ ...cell })));
  const entries = mode === 'redo' ? patch.after : patch.before;
  for (const entry of entries) {
    next[entry.y][entry.x] = { ...(mode === 'redo' ? entry.after : entry.before) };
  }
  return next;
}

export function createBlankTextGrid(width: number, height: number, emptyCell: TextGridCell): TextGridCell[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ ...emptyCell })),
  );
}
