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

const MOORE_OFFSETS: [number, number][] = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
];

function getNeighbors(
  cells: number[],
  width: number,
  height: number,
  x: number,
  y: number,
): number[] {
  const result: number[] = [];
  for (const [dx, dy] of MOORE_OFFSETS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      result.push(cells[ny * width + nx]);
    }
  }
  return result;
}

export function stepCellGrid(grid: CellGrid, rule: CellRule): CellGrid {
  const { width, height, cells } = grid;
  const next = new Array<number>(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const neighbors = getNeighbors(cells, width, height, x, y);
      next[idx] = rule(cells[idx], neighbors);
    }
  }
  return { width, height, cells: next };
}
