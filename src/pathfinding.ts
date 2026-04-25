export interface PathConfig<T> {
  start: T;
  goal: T;
  neighbors: (node: T) => T[];
  cost: (from: T, to: T) => number;
  heuristic: (node: T, goal: T) => number;
  hash: (node: T) => string | number;
  maxCost?: number;
  maxIterations?: number;
  trackExplored?: boolean;
}

export interface PathResult<T> {
  path: T[];
  cost: number;
  explored?: number;
}

interface HeapEntry<T> {
  node: T;
  f: number;
  g: number;
}

function heapPush<T>(heap: HeapEntry<T>[], entry: HeapEntry<T>): void {
  heap.push(entry);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (heap[parent].f <= heap[i].f) break;
    [heap[parent], heap[i]] = [heap[i], heap[parent]];
    i = parent;
  }
}

function heapPop<T>(heap: HeapEntry<T>[]): HeapEntry<T> {
  const top = heap[0];
  const last = heap.pop()!;
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < heap.length && heap[left].f < heap[smallest].f) {
        smallest = left;
      }
      if (right < heap.length && heap[right].f < heap[smallest].f) {
        smallest = right;
      }
      if (smallest === i) break;
      [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
      i = smallest;
    }
  }
  return top;
}

function reconstructPath<T>(
  cameFrom: Map<string | number, T>,
  hash: (node: T) => string | number,
  current: T,
): T[] {
  const path: T[] = [current];
  let key = hash(current);
  while (cameFrom.has(key)) {
    current = cameFrom.get(key)!;
    key = hash(current);
    path.push(current);
  }
  path.reverse();
  return path;
}

export function findPath<T>(config: PathConfig<T>): PathResult<T> | null {
  const {
    start,
    goal,
    neighbors,
    cost,
    heuristic,
    hash,
    maxCost = Infinity,
    maxIterations = 10_000,
    trackExplored = false,
  } = config;

  const startHash = hash(start);
  const goalHash = hash(goal);

  if (startHash === goalHash) {
    const result: PathResult<T> = { path: [start], cost: 0 };
    if (trackExplored) result.explored = 0;
    return result;
  }

  const open: HeapEntry<T>[] = [];
  const bestG = new Map<string | number, number>();
  const cameFrom = new Map<string | number, T>();

  bestG.set(startHash, 0);
  heapPush(open, { node: start, f: heuristic(start, goal), g: 0 });

  let iterations = 0;
  let explored = 0;

  while (open.length > 0) {
    if (iterations >= maxIterations) return null;
    iterations++;

    const current = heapPop(open);
    const currentHash = hash(current.node);

    const recorded = bestG.get(currentHash);
    if (recorded !== undefined && current.g > recorded) continue;

    explored++;

    if (current.g > maxCost) continue;

    if (currentHash === goalHash) {
      const path = reconstructPath(cameFrom, hash, current.node);
      const result: PathResult<T> = { path, cost: current.g };
      if (trackExplored) result.explored = explored;
      return result;
    }

    for (const neighbor of neighbors(current.node)) {
      const edgeCost = cost(current.node, neighbor);
      if (!isFinite(edgeCost) || edgeCost < 0) continue;

      const newG = current.g + edgeCost;
      const neighborHash = hash(neighbor);
      const prevG = bestG.get(neighborHash);

      if (prevG === undefined || newG < prevG) {
        bestG.set(neighborHash, newG);
        cameFrom.set(neighborHash, current.node);
        const f = newG + heuristic(neighbor, goal);
        heapPush(open, { node: neighbor, f, g: newG });
      }
    }
  }

  return null;
}
