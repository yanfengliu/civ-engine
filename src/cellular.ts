export type CellGrid = {
  readonly width: number;
  readonly height: number;
  readonly cells: number[];
};

export type CellRule = (current: number, neighbors: number[]) => number;

export function createCellGrid(
  width: number,
  height: number,
  fill: (x: number, y: number) => number,
): CellGrid {
  const cells = new Array<number>(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells[y * width + x] = fill(x, y);
    }
  }
  return { width, height, cells };
}

export const MOORE_OFFSETS: ReadonlyArray<[number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
];

export const VON_NEUMANN_OFFSETS: ReadonlyArray<[number, number]> = [
  [0, -1],
  [-1, 0], [1, 0],
  [0,  1],
];

function getNeighbors(
  cells: number[],
  width: number,
  height: number,
  x: number,
  y: number,
  offsets: ReadonlyArray<[number, number]>,
): number[] {
  const result: number[] = [];
  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      result.push(cells[ny * width + nx]);
    }
  }
  return result;
}

export function stepCellGrid(
  grid: CellGrid,
  rule: CellRule,
  offsets: ReadonlyArray<[number, number]> = MOORE_OFFSETS,
): CellGrid {
  const { width, height, cells } = grid;
  const next = new Array<number>(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const neighbors = getNeighbors(cells, width, height, x, y, offsets);
      next[idx] = rule(cells[idx], neighbors);
    }
  }
  return { width, height, cells: next };
}
