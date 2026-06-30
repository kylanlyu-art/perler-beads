import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  applyTextGridPatch,
  createBlankTextGrid,
  createTextGridPatch,
  layoutTextPattern,
  validateGlyphAtlas,
} from './index.ts';
import type { GlyphAtlas, TextPatternSpec } from './types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const atlas = JSON.parse(
  readFileSync(join(here, 'generated/fusion-12-zh-hans-mono.v2026.05.07.json'), 'utf8'),
) as GlyphAtlas;

const baseSpec: TextPatternSpec = {
  text: '绿色靓仔',
  atlasId: atlas.atlasId,
  atlasVersion: atlas.fontVersion,
  direction: 'horizontal',
  scale: 1,
  letterSpacingCells: 1,
  lineSpacingCells: 1,
  fillColorId: 'H07',
  fillColorHex: '#1F9D8A',
  anchor: { x: 1, y: 1 },
  overwritePolicy: 'empty-only',
};

test('validates the generated Fusion glyph atlas', () => {
  assert.deepEqual(validateGlyphAtlas(atlas), []);
  for (const char of '绿色靓仔拼豆图纸') {
    const key = `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;
    assert.ok(atlas.glyphs[key], `${char} should exist`);
  }
});

test('lays out Chinese text into deterministic occupied cells', () => {
  const grid = createBlankTextGrid(80, 24, { key: 'ERASE', color: '#FFFFFF', isExternal: true });
  const first = layoutTextPattern(baseSpec, atlas, { width: 80, height: 24, cells: grid });
  const second = layoutTextPattern(baseSpec, atlas, { width: 80, height: 24, cells: grid });

  assert.equal(first.valid, true);
  assert.equal(first.bounds.x, 1);
  assert.equal(first.bounds.y, 2);
  assert.equal(first.bounds.width, 50);
  assert.equal(first.bounds.height, 11);
  assert.equal(first.cells.length, second.cells.length);
  assert.deepEqual(first.cells, second.cells);
});

test('supports vertical text and explicit line breaks', () => {
  const grid = createBlankTextGrid(40, 40, { key: 'ERASE', color: '#FFFFFF', isExternal: true });
  const result = layoutTextPattern(
    {
      ...baseSpec,
      text: 'A\nB',
      direction: 'vertical',
      anchor: { x: 2, y: 3 },
    },
    atlas,
    { width: 40, height: 40, cells: grid },
  );

  assert.equal(result.valid, true);
  assert.equal(result.bounds.x, 2);
  assert.equal(result.bounds.y, 5);
  assert.ok(result.bounds.width > 12);
  assert.ok(result.cells.length > 0);
});

test('rejects missing glyphs and out-of-bounds placements without patching', () => {
  const grid = createBlankTextGrid(8, 8, { key: 'ERASE', color: '#FFFFFF', isExternal: true });
  const missing = layoutTextPattern({ ...baseSpec, text: '🙂' }, atlas, { width: 8, height: 8, cells: grid });
  assert.equal(missing.valid, false);
  assert.equal(missing.missingCharacters[0].grapheme, '🙂');
  assert.equal(createTextGridPatch(grid, missing, baseSpec), null);

  const outOfBounds = layoutTextPattern(baseSpec, atlas, { width: 8, height: 8, cells: grid });
  assert.equal(outOfBounds.valid, false);
  assert.ok(outOfBounds.outOfBounds.length > 0);
});

test('detects collisions in empty-only mode and allows overwrite mode', () => {
  const grid = createBlankTextGrid(80, 24, { key: 'ERASE', color: '#FFFFFF', isExternal: true });
  const probe = layoutTextPattern({ ...baseSpec, overwritePolicy: 'overwrite' }, atlas, {
    width: 80,
    height: 24,
    cells: grid,
  });
  const occupied = probe.cells[0];
  grid[occupied.y][occupied.x] = { key: 'H01', color: '#000000', isExternal: false };

  const blocked = layoutTextPattern(baseSpec, atlas, { width: 80, height: 24, cells: grid });
  assert.equal(blocked.valid, false);
  assert.equal(blocked.collisions.length, 1);

  const overwrite = layoutTextPattern(
    { ...baseSpec, overwritePolicy: 'overwrite' },
    atlas,
    { width: 80, height: 24, cells: grid },
  );
  assert.equal(overwrite.valid, true);
});

test('creates one atomic patch that can redo and undo text placement', () => {
  const grid = createBlankTextGrid(80, 24, { key: 'ERASE', color: '#FFFFFF', isExternal: true });
  const placement = layoutTextPattern(baseSpec, atlas, { width: 80, height: 24, cells: grid });
  const patch = createTextGridPatch(grid, placement, baseSpec);
  assert.ok(patch);
  assert.equal(patch.type, 'apply-text-placement');
  assert.equal(patch.after.length, placement.cells.length);

  const applied = applyTextGridPatch(grid, patch, 'redo');
  assert.equal(applied[placement.cells[0].y][placement.cells[0].x].key, 'H07');
  const undone = applyTextGridPatch(applied, patch, 'undo');
  assert.deepEqual(undone, grid);
});
