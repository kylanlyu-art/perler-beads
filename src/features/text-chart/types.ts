import type {
  GlyphAtlas,
  LetterSpacingCells,
  LineSpacingCells,
  TextDirection,
  TextScale,
} from '../text-grid-core';
import type { GridDimensions, GridStats } from '../pattern-draft/types';
import type { MappedPixel } from '../../utils/pixelation';

export type TextChartStyleId = 'minimal' | 'farm-sign' | 'arcade' | 'handheld' | 'neon';

export type TextChartRole =
  | 'background'
  | 'glyph-fill'
  | 'glyph-outline'
  | 'glyph-shadow'
  | 'frame'
  | 'decoration'
  | 'manual';

export interface TextChartColors {
  background: string;
  glyphFill: string;
  glyphOutline?: string;
  glyphShadow?: string;
  frame?: string;
  decoration?: string;
}

export interface GridCoordinate {
  x: number;
  y: number;
}

export interface TextChartSemanticLayers {
  background: GridCoordinate[];
  glyphFill: GridCoordinate[];
  glyphOutline: GridCoordinate[];
  glyphShadow: GridCoordinate[];
  frame: GridCoordinate[];
  decoration: GridCoordinate[];
  manual: GridCoordinate[];
}

export interface TextChartLayer {
  role: Exclude<TextChartRole, 'background' | 'manual'>;
  cells: GridCoordinate[];
}

export interface TextChartStyleBuildInput {
  glyphCells: GridCoordinate[];
  glyphBounds: Rect;
  scale: TextScale;
}

export interface TextChartStyleDefinition {
  id: TextChartStyleId;
  name: string;
  description: string;
  access: 'free' | 'premium';
  recommendedScales: TextScale[];
  defaultColorTargets: TextChartColors;
  buildLayers: (input: TextChartStyleBuildInput) => TextChartLayer[];
}

export interface GenerateTextChartInput {
  text: string;
  atlas: GlyphAtlas;
  direction: TextDirection;
  scale: TextScale;
  letterSpacingCells: LetterSpacingCells;
  lineSpacingCells: LineSpacingCells;
  styleId: TextChartStyleId;
  colors: TextChartColors;
  availablePalette: Array<{ key: string; color: string }>;
}

export interface GeneratedTextChart {
  valid: boolean;
  missingCharacters: Array<{ grapheme: string; codePoint: string }>;
  invalidCharacters: Array<{ grapheme: string; reason: string }>;
  warnings: string[];
  grid: MappedPixel[][];
  dimensions: GridDimensions;
  stats: GridStats;
  glyphBounds: Rect;
  contentBounds: Rect;
  semanticLayers: TextChartSemanticLayers;
  breakdown: {
    total: number;
    background: number;
    glyphStructure: number;
    glyphFill: number;
    glyphOutline: number;
    glyphShadow: number;
    frame: number;
    decoration: number;
  };
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

