export type TextDirection = 'horizontal' | 'vertical';

export type TextScale = 1 | 2;

export type LetterSpacingCells = -1 | 0 | 1 | 2;

export type LineSpacingCells = 0 | 1 | 2;

export type OverwritePolicy = 'empty-only' | 'overwrite';

export interface GlyphBitmap {
  codePoint: number;
  glyphName?: string;
  width: number;
  height: number;
  advanceCells: number;
  bearingXCells: number;
  bearingYCells: number;
  rows: string[];
}

export interface GlyphAtlas {
  atlasId: 'fusion-12-zh-hans-mono';
  fontFamily: 'Fusion Pixel Font';
  fontVersion: string;
  locale: 'zh_hans';
  sourceFormat: 'bdf';
  baseCellHeight: 12;
  defaultLineHeightCells: number;
  license: 'OFL-1.1';
  glyphs: Record<string, GlyphBitmap>;
  sourceDigest: string;
  generatedDigest: string;
}

export interface TextPatternSpec {
  text: string;
  atlasId: string;
  atlasVersion: string;
  direction: TextDirection;
  scale: TextScale;
  letterSpacingCells: LetterSpacingCells;
  lineSpacingCells: LineSpacingCells;
  fillColorId: string;
  fillColorHex: string;
  anchor: { x: number; y: number };
  overwritePolicy: OverwritePolicy;
}

export interface TextPlacementCell {
  x: number;
  y: number;
  colorId: string;
  colorHex: string;
}

export interface TextPlacementResult {
  bounds: { x: number; y: number; width: number; height: number };
  cells: TextPlacementCell[];
  occupiedIndices: number[];
  missingCharacters: Array<{ grapheme: string; codePoint: string }>;
  invalidCharacters: Array<{ grapheme: string; reason: string }>;
  outOfBounds: Array<{ x: number; y: number }>;
  collisions: Array<{ x: number; y: number; existingColorId: string }>;
  valid: boolean;
}

export interface TextGridCell {
  key: string;
  color: string;
  isExternal?: boolean;
}

export interface TextGridPatchCell {
  x: number;
  y: number;
  before: TextGridCell;
  after: TextGridCell;
}

export interface TextGridPatch {
  type: 'apply-text-placement';
  before: TextGridPatchCell[];
  after: TextGridPatchCell[];
  metadata: {
    text: string;
    atlasId: string;
    atlasVersion: string;
    timestamp: string;
  };
}
