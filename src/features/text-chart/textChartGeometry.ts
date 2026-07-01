import type { GridCoordinate, Rect, TextChartLayer } from './types';

export function coordKey(cell: GridCoordinate): string {
  return `${cell.x}:${cell.y}`;
}

export function uniqueCells(cells: GridCoordinate[]): GridCoordinate[] {
  return Array.from(
    cells.reduce((map, cell) => map.set(coordKey(cell), { x: cell.x, y: cell.y }), new Map<string, GridCoordinate>()).values(),
  ).sort((a, b) => a.y - b.y || a.x - b.x);
}

export function getBounds(cells: GridCoordinate[]): Rect {
  if (cells.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const xs = cells.map((cell) => cell.x);
  const ys = cells.map((cell) => cell.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function inflateRect(rect: Rect, padding: number): Rect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

export function createRect(rect: Rect): GridCoordinate[] {
  const cells: GridCoordinate[] = [];
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      cells.push({ x, y });
    }
  }
  return cells;
}

export function createRectRing(rect: Rect, thickness = 1): GridCoordinate[] {
  const cells: GridCoordinate[] = [];
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      const edgeDistance = Math.min(
        x - rect.x,
        y - rect.y,
        rect.x + rect.width - 1 - x,
        rect.y + rect.height - 1 - y,
      );
      if (edgeDistance < thickness) cells.push({ x, y });
    }
  }
  return cells;
}

export function translate(cells: GridCoordinate[], dx: number, dy: number): GridCoordinate[] {
  return uniqueCells(cells.map((cell) => ({ x: cell.x + dx, y: cell.y + dy })));
}

export function union(...sets: GridCoordinate[][]): GridCoordinate[] {
  return uniqueCells(sets.flat());
}

export function subtract(a: GridCoordinate[], b: GridCoordinate[]): GridCoordinate[] {
  const bKeys = new Set(b.map(coordKey));
  return uniqueCells(a.filter((cell) => !bKeys.has(coordKey(cell))));
}

export function dilate4(cells: GridCoordinate[], radius: number): GridCoordinate[] {
  const out: GridCoordinate[] = [];
  for (const cell of cells) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= radius) {
          out.push({ x: cell.x + dx, y: cell.y + dy });
        }
      }
    }
  }
  return uniqueCells(out);
}

export function dilate8(cells: GridCoordinate[], radius: number): GridCoordinate[] {
  const out: GridCoordinate[] = [];
  for (const cell of cells) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        out.push({ x: cell.x + dx, y: cell.y + dy });
      }
    }
  }
  return uniqueCells(out);
}

export function normalizeLayersToOrigin(layers: TextChartLayer[]): {
  layers: TextChartLayer[];
  contentBounds: Rect;
} {
  const allCells = layers.flatMap((layer) => layer.cells);
  const bounds = getBounds(allCells);
  const normalized = layers.map((layer) => ({
    ...layer,
    cells: translate(layer.cells, -bounds.x, -bounds.y),
  }));
  return {
    layers: normalized,
    contentBounds: { x: 0, y: 0, width: bounds.width, height: bounds.height },
  };
}

export function cornerLeafTemplates(rect: Rect, scale: 1 | 2): GridCoordinate[] {
  const size = scale === 1 ? 3 : 5;
  const template = scale === 1
    ? [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ]
    : [
        { x: 2, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ];

  const anchors = [
    { x: rect.x + 1, y: rect.y + 1 },
    { x: rect.x + rect.width - size - 1, y: rect.y + 1 },
    { x: rect.x + 1, y: rect.y + rect.height - size - 1 },
    { x: rect.x + rect.width - size - 1, y: rect.y + rect.height - size - 1 },
  ];
  return uniqueCells(anchors.flatMap((anchor) => template.map((cell) => ({ x: anchor.x + cell.x, y: anchor.y + cell.y }))));
}

