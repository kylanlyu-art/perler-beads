import type { MappedPixel } from '../../utils/pixelation';
import type {
  LetterSpacingCells,
  LineSpacingCells,
  TextDirection,
  TextScale,
} from '../text-grid-core';
import type { TextChartColors, TextChartSemanticLayers, TextChartStyleId } from '../text-chart/types';

export type PatternKind = 'image' | 'text';

export interface GridDimensions {
  width: number;
  height: number;
  N: number;
  M: number;
}

export interface GridStats {
  colorCounts: Record<string, { count: number; color: string }>;
  totalBeadCount: number;
}

export interface SharedPatternDocument {
  schemaVersion: 1;
  id: string;
  kind: PatternKind;
  title: string;
  grid: MappedPixel[][];
  dimensions: GridDimensions;
  stats: GridStats;
  selectedColorSystem: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImagePatternSource {
  kind: 'image';
  originalImageSrc: string | null;
  granularity: number;
  similarityThreshold: number;
  pixelationMode: 'dominant' | 'average';
  excludedColorKeys: string[];
  customPaletteSelections: Record<string, boolean>;
}

export interface TextPatternSource {
  kind: 'text';
  text: string;
  atlasId: string;
  atlasVersion: string;
  direction: TextDirection;
  scale: TextScale;
  letterSpacingCells: LetterSpacingCells;
  lineSpacingCells: LineSpacingCells;
  styleId: TextChartStyleId;
  colors: TextChartColors;
  semanticLayers: TextChartSemanticLayers;
}

export type ImagePatternDocument = SharedPatternDocument & { source: ImagePatternSource };
export type TextPatternDocument = SharedPatternDocument & { source: TextPatternSource };
export type PatternDocument = ImagePatternDocument | TextPatternDocument;

export interface EditSnapshot {
  grid: MappedPixel[][];
  dimensions: GridDimensions;
  stats: GridStats;
  semanticLayers?: TextChartSemanticLayers;
}

