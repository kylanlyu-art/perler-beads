import type { GridStats } from '../pattern-draft/types';
import type { MappedPixel } from '../../utils/pixelation';

const TRANSPARENT_KEY = 'ERASE';

export function calculateGridStats(grid: MappedPixel[][]): GridStats {
  const colorCounts: GridStats['colorCounts'] = {};
  let totalBeadCount = 0;

  for (const row of grid) {
    for (const cell of row) {
      if (!cell || cell.isExternal || cell.key === TRANSPARENT_KEY) continue;
      const hex = cell.color.toUpperCase();
      if (!colorCounts[hex]) {
        colorCounts[hex] = { count: 0, color: hex };
      }
      colorCounts[hex].count++;
      totalBeadCount++;
    }
  }

  return { colorCounts, totalBeadCount };
}
