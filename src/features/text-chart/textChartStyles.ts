import type { TextChartStyleDefinition } from './types';
import {
  cornerLeafTemplates,
  createRect,
  createRectRing,
  dilate8,
  inflateRect,
  subtract,
  translate,
} from './textChartGeometry.ts';

export const textChartStyles: Record<string, TextChartStyleDefinition> = {
  minimal: {
    id: 'minimal',
    name: '极简文字',
    description: '省豆、干净，适合名字和短句。',
    access: 'free',
    recommendedScales: [1, 2],
    defaultColorTargets: {
      background: '#FFFFFF',
      glyphFill: '#1F9D8A',
    },
    buildLayers: ({ glyphCells }) => [
      { role: 'glyph-fill', cells: glyphCells },
    ],
  },
  'farm-sign': {
    id: 'farm-sign',
    name: '田园木牌',
    description: '像手作名字牌，24 格会出现角标叶片。',
    access: 'premium',
    recommendedScales: [2],
    defaultColorTargets: {
      background: '#F7E8C8',
      glyphFill: '#7A4F2A',
      frame: '#7A4F2A',
      decoration: '#3F8F4E',
    },
    buildLayers: ({ glyphCells, glyphBounds, scale }) => {
      const boardRect = inflateRect(glyphBounds, scale === 1 ? 2 : 4);
      const layers = [
        { role: 'decoration' as const, cells: subtract(createRect(boardRect), createRectRing(boardRect)) },
        { role: 'frame' as const, cells: createRectRing(boardRect) },
        { role: 'glyph-fill' as const, cells: glyphCells },
      ];
      if (scale === 2) {
        layers.splice(1, 0, { role: 'decoration' as const, cells: cornerLeafTemplates(boardRect, scale) });
      }
      return layers;
    },
  },
  arcade: {
    id: 'arcade',
    name: '8-bit 街机',
    description: '高对比昵称和队名，带硬边描边和右下阴影。',
    access: 'premium',
    recommendedScales: [1, 2],
    defaultColorTargets: {
      background: '#101826',
      glyphFill: '#F8D84A',
      glyphOutline: '#4DE1D2',
      glyphShadow: '#4B3A8F',
    },
    buildLayers: ({ glyphCells, scale }) => {
      const radius = scale === 1 ? 1 : 2;
      return [
        { role: 'glyph-shadow', cells: translate(dilate8(glyphCells, radius), 1, 1) },
        { role: 'glyph-outline', cells: subtract(dilate8(glyphCells, radius), glyphCells) },
        { role: 'glyph-fill', cells: glyphCells },
      ];
    },
  },
  handheld: {
    id: 'handheld',
    name: '掌机绿屏',
    description: '低色数、复古、省颜色，适合 12 格。',
    access: 'premium',
    recommendedScales: [1, 2],
    defaultColorTargets: {
      background: '#9BBC0F',
      glyphFill: '#306230',
      frame: '#306230',
      decoration: '#8BAC0F',
    },
    buildLayers: ({ glyphCells, glyphBounds, scale }) => {
      const screenRect = inflateRect(glyphBounds, scale === 1 ? 2 : 4);
      return [
        { role: 'decoration', cells: subtract(createRect(screenRect), createRectRing(screenRect)) },
        { role: 'frame', cells: createRectRing(screenRect) },
        { role: 'glyph-fill', cells: glyphCells },
      ];
    },
  },
  neon: {
    id: 'neon',
    name: '霓虹招牌',
    description: '离散色环表现夜间招牌感，不使用渐变。',
    access: 'premium',
    recommendedScales: [2],
    defaultColorTargets: {
      background: '#130A1F',
      glyphFill: '#FFF7D6',
      glyphOutline: '#00E5FF',
      glyphShadow: '#43316D',
    },
    buildLayers: ({ glyphCells, scale }) => {
      const innerRing = subtract(dilate8(glyphCells, 1), glyphCells);
      if (scale === 1) {
        return [
          { role: 'glyph-outline', cells: innerRing },
          { role: 'glyph-fill', cells: glyphCells },
        ];
      }
      const outer = dilate8(glyphCells, 2);
      return [
        { role: 'glyph-shadow', cells: subtract(outer, dilate8(glyphCells, 1)) },
        { role: 'glyph-outline', cells: innerRing },
        { role: 'glyph-fill', cells: glyphCells },
      ];
    },
  },
};

export function getTextChartStyle(styleId: string): TextChartStyleDefinition {
  return textChartStyles[styleId] ?? textChartStyles.minimal;
}
