import { describe, it, expect } from 'vitest';
import { Layer } from '../src/layer.js';

describe('Layer<T>', () => {
  describe('construction and basic shape', () => {
    it('blockSize=1 makes width and height equal to world dimensions', () => {
      const layer = new Layer<number>({
        worldWidth: 10,
        worldHeight: 8,
        defaultValue: 0,
      });
      expect(layer.worldWidth).toBe(10);
      expect(layer.worldHeight).toBe(8);
      expect(layer.blockSize).toBe(1);
      expect(layer.width).toBe(10);
      expect(layer.height).toBe(8);
    });

    it('blockSize=2 halves width and height (with rounding up for non-multiples)', () => {
      const layer = new Layer<number>({
        worldWidth: 10,
        worldHeight: 9,
        blockSize: 2,
        defaultValue: 0,
      });
      expect(layer.blockSize).toBe(2);
      expect(layer.width).toBe(5);
      expect(layer.height).toBe(5); // ceil(9 / 2)
    });

    it('blockSize=4 with non-divisible world rounds up', () => {
      const layer = new Layer<number>({
        worldWidth: 9,
        worldHeight: 9,
        blockSize: 4,
        defaultValue: 0,
      });
      expect(layer.width).toBe(3); // ceil(9 / 4)
      expect(layer.height).toBe(3);
    });

    it('rejects worldWidth <= 0', () => {
      expect(
        () =>
          new Layer<number>({ worldWidth: 0, worldHeight: 5, defaultValue: 0 }),
      ).toThrow(/worldWidth/);
    });

    it('rejects non-integer worldWidth', () => {
      expect(
        () =>
          new Layer<number>({
            worldWidth: 1.5,
            worldHeight: 5,
            defaultValue: 0,
          }),
      ).toThrow(/worldWidth/);
    });

    it('rejects blockSize <= 0', () => {
      expect(
        () =>
          new Layer<number>({
            worldWidth: 5,
            worldHeight: 5,
            blockSize: 0,
            defaultValue: 0,
          }),
      ).toThrow(/blockSize/);
    });

    it('rejects non-integer blockSize', () => {
      expect(
        () =>
          new Layer<number>({
            worldWidth: 5,
            worldHeight: 5,
            blockSize: 1.5,
            defaultValue: 0,
          }),
      ).toThrow(/blockSize/);
    });

    it('rejects non-JSON-compatible defaultValue', () => {
      expect(
        () =>
          new Layer<unknown>({
            worldWidth: 5,
            worldHeight: 5,
            defaultValue: () => 0,
          }),
      ).toThrow();
    });
  });

  describe('cell access (getCell/setCell)', () => {
    it('returns defaultValue for unset cells', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 7,
      });
      expect(layer.getCell(0, 0)).toBe(7);
      expect(layer.getCell(3, 3)).toBe(7);
    });

    it('setCell stores and getCell retrieves', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 0,
      });
      layer.setCell(1, 2, 42);
      expect(layer.getCell(1, 2)).toBe(42);
      expect(layer.getCell(0, 0)).toBe(0);
    });

    it('setCell with default value still stores the marker (round-trips)', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 0,
      });
      layer.setCell(1, 1, 5);
      layer.setCell(1, 1, 0);
      expect(layer.getCell(1, 1)).toBe(0);
    });

    it('rejects out-of-bounds cell coordinates', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 0,
      });
      expect(() => layer.setCell(-1, 0, 1)).toThrow();
      expect(() => layer.setCell(0, -1, 1)).toThrow();
      expect(() => layer.setCell(4, 0, 1)).toThrow();
      expect(() => layer.setCell(0, 4, 1)).toThrow();
      expect(() => layer.getCell(4, 0)).toThrow();
    });

    it('rejects non-integer cell coordinates', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 0,
      });
      expect(() => layer.setCell(1.5, 0, 1)).toThrow();
      expect(() => layer.getCell(0, 1.5)).toThrow();
    });

    it('rejects non-JSON-compatible value on setCell', () => {
      const layer = new Layer<unknown>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 0,
      });
      expect(() => layer.setCell(1, 1, () => 0)).toThrow();
    });
  });

  describe('world access (getAt/setAt) with downsampling', () => {
    it('blockSize=1 maps world coords to cell coords directly', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 0,
      });
      layer.setAt(2, 3, 99);
      expect(layer.getAt(2, 3)).toBe(99);
      expect(layer.getCell(2, 3)).toBe(99);
    });

    it('blockSize=2 buckets world coords into cells of 2x2', () => {
      const layer = new Layer<number>({
        worldWidth: 8,
        worldHeight: 8,
        blockSize: 2,
        defaultValue: 0,
      });
      layer.setAt(3, 5, 42); // → cell (1, 2)
      expect(layer.getAt(2, 4)).toBe(42); // same cell
      expect(layer.getAt(3, 5)).toBe(42);
      expect(layer.getCell(1, 2)).toBe(42);
      expect(layer.getAt(0, 0)).toBe(0); // different cell
    });

    it('blockSize=4 buckets a 16x16 world into 4x4 cells', () => {
      const layer = new Layer<string>({
        worldWidth: 16,
        worldHeight: 16,
        blockSize: 4,
        defaultValue: 'empty',
      });
      layer.setAt(7, 11, 'forest'); // → cell (1, 2)
      expect(layer.getAt(4, 8)).toBe('forest');
      expect(layer.getAt(7, 11)).toBe('forest');
      expect(layer.getCell(1, 2)).toBe('forest');
    });

    it('rejects out-of-bounds world coordinates', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 0,
      });
      expect(() => layer.setAt(-1, 0, 1)).toThrow();
      expect(() => layer.setAt(4, 0, 1)).toThrow();
      expect(() => layer.getAt(0, 4)).toThrow();
    });

    it('rejects non-integer world coordinates', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 0,
      });
      expect(() => layer.setAt(1.5, 0, 1)).toThrow();
      expect(() => layer.getAt(0, 1.5)).toThrow();
    });
  });

  describe('fill and forEach', () => {
    it('fill sets every cell to a value', () => {
      const layer = new Layer<number>({
        worldWidth: 3,
        worldHeight: 3,
        defaultValue: 0,
      });
      layer.fill(7);
      for (let cy = 0; cy < 3; cy++) {
        for (let cx = 0; cx < 3; cx++) {
          expect(layer.getCell(cx, cy)).toBe(7);
        }
      }
    });

    it('fill rejects non-JSON-compatible values', () => {
      const layer = new Layer<unknown>({
        worldWidth: 3,
        worldHeight: 3,
        defaultValue: 0,
      });
      expect(() => layer.fill(() => 1)).toThrow();
    });

    it('forEach visits every cell in row-major order', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        blockSize: 2,
        defaultValue: 0,
      });
      layer.setCell(0, 0, 1);
      layer.setCell(1, 1, 2);
      const visits: Array<[number, number, number]> = [];
      layer.forEach((value, cx, cy) => visits.push([cx, cy, value]));
      expect(visits).toHaveLength(4);
      expect(visits[0]).toEqual([0, 0, 1]);
      expect(visits[1]).toEqual([1, 0, 0]);
      expect(visits[2]).toEqual([0, 1, 0]);
      expect(visits[3]).toEqual([1, 1, 2]);
    });
  });

  describe('serialization', () => {
    it('round-trips through getState/fromState', () => {
      const layer = new Layer<number>({
        worldWidth: 8,
        worldHeight: 8,
        blockSize: 2,
        defaultValue: -1,
      });
      layer.setCell(0, 0, 5);
      layer.setCell(3, 2, 42);
      const state = layer.getState();
      const restored = Layer.fromState<number>(state);
      expect(restored.worldWidth).toBe(8);
      expect(restored.worldHeight).toBe(8);
      expect(restored.blockSize).toBe(2);
      expect(restored.width).toBe(4);
      expect(restored.height).toBe(4);
      expect(restored.getCell(0, 0)).toBe(5);
      expect(restored.getCell(3, 2)).toBe(42);
      expect(restored.getCell(1, 1)).toBe(-1);
    });

    it('getState only includes cells that differ from defaultValue', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 0,
      });
      layer.setCell(1, 1, 5);
      layer.setCell(2, 2, 0); // sets to default explicitly
      const state = layer.getState();
      // (2, 2) at default should not appear in sparse representation
      expect(state.cells).toHaveLength(1);
      expect(state.cells[0]).toEqual([5, 5]); // cellIndex=1*4+1=5, value=5
    });

    it('getState entries are sorted by cellIndex (deterministic)', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 0,
      });
      layer.setCell(2, 2, 1); // index 10
      layer.setCell(0, 0, 2); // index 0
      layer.setCell(3, 1, 3); // index 7
      const state = layer.getState();
      const indices = state.cells.map((c) => c[0]);
      expect(indices).toEqual([0, 7, 10]);
    });

    it('JSON round-trip preserves state', () => {
      const layer = new Layer<{ kind: string; value: number }>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: { kind: 'empty', value: 0 },
      });
      layer.setCell(1, 1, { kind: 'forest', value: 10 });
      const json = JSON.stringify(layer.getState());
      const restored = Layer.fromState<{ kind: string; value: number }>(
        JSON.parse(json),
      );
      expect(restored.getCell(1, 1)).toEqual({ kind: 'forest', value: 10 });
      expect(restored.getCell(0, 0)).toEqual({ kind: 'empty', value: 0 });
    });

    it('fromState rejects out-of-range cell index', () => {
      expect(() =>
        Layer.fromState<number>({
          worldWidth: 4,
          worldHeight: 4,
          blockSize: 1,
          defaultValue: 0,
          cells: [[100, 1]],
        }),
      ).toThrow();
    });

    it('fromState rejects negative cell index', () => {
      expect(() =>
        Layer.fromState<number>({
          worldWidth: 4,
          worldHeight: 4,
          blockSize: 1,
          defaultValue: 0,
          cells: [[-1, 1]],
        }),
      ).toThrow();
    });

    it('fromState rejects duplicate cell indices', () => {
      expect(() =>
        Layer.fromState<number>({
          worldWidth: 4,
          worldHeight: 4,
          blockSize: 1,
          defaultValue: 0,
          cells: [
            [1, 5],
            [1, 6],
          ],
        }),
      ).toThrow(/duplicate/i);
    });

    it('fromState rejects non-JSON-compatible defaultValue', () => {
      expect(() =>
        Layer.fromState<unknown>({
          worldWidth: 4,
          worldHeight: 4,
          blockSize: 1,
          defaultValue: () => 0,
          cells: [],
        }),
      ).toThrow();
    });
  });

  describe('clone', () => {
    it('clone produces independent storage', () => {
      const original = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 0,
      });
      original.setCell(1, 1, 5);
      const copy = original.clone();
      copy.setCell(1, 1, 99);
      expect(original.getCell(1, 1)).toBe(5);
      expect(copy.getCell(1, 1)).toBe(99);
    });

    it('clone deep-copies object values into independent storage', () => {
      const original = new Layer<{ value: number }>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: { value: 0 },
      });
      original.setCell(1, 1, { value: 5 });
      const copy = original.clone();
      // Replace the copy's cell — original must not change
      copy.setCell(1, 1, { value: 99 });
      expect(original.getCell(1, 1).value).toBe(5);
      expect(copy.getCell(1, 1).value).toBe(99);
    });
  });

  describe('defensive copies (engine contract)', () => {
    it('mutating a value after setCell does not affect stored state', () => {
      const layer = new Layer<{ n: number }>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: { n: 0 },
      });
      const input = { n: 5 };
      layer.setCell(1, 1, input);
      input.n = 999;
      expect(layer.getCell(1, 1).n).toBe(5);
    });

    it('mutating the result of getCell does not affect stored state', () => {
      const layer = new Layer<{ n: number }>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: { n: 0 },
      });
      layer.setCell(1, 1, { n: 5 });
      const got = layer.getCell(1, 1);
      got.n = 999;
      expect(layer.getCell(1, 1).n).toBe(5);
    });

    it('mutating an unset-cell read does not corrupt defaultValue for other cells', () => {
      const layer = new Layer<{ n: number }>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: { n: 0 },
      });
      const a = layer.getCell(0, 0);
      a.n = 999;
      expect(layer.getCell(2, 2).n).toBe(0);
    });

    it('mutating layer.defaultValue does not affect future reads', () => {
      const layer = new Layer<{ n: number }>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: { n: 0 },
      });
      const exposed = layer.defaultValue;
      exposed.n = 999;
      expect(layer.getCell(0, 0).n).toBe(0);
      expect(layer.defaultValue.n).toBe(0);
    });

    it('fill stores independent copies in each cell', () => {
      const layer = new Layer<{ n: number }>({
        worldWidth: 3,
        worldHeight: 3,
        defaultValue: { n: 0 },
      });
      layer.fill({ n: 7 });
      const a = layer.getCell(0, 0);
      a.n = 999;
      expect(layer.getCell(2, 2).n).toBe(7);
    });

    it('mutating a value after setAt does not affect stored state', () => {
      const layer = new Layer<{ n: number }>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: { n: 0 },
      });
      const input = { n: 5 };
      layer.setAt(2, 3, input);
      input.n = 999;
      expect(layer.getAt(2, 3).n).toBe(5);
    });

    it('forEach callback receives independent copies', () => {
      const layer = new Layer<{ n: number }>({
        worldWidth: 2,
        worldHeight: 2,
        defaultValue: { n: 0 },
      });
      layer.setCell(0, 0, { n: 5 });
      layer.forEach((value) => {
        value.n = 999;
      });
      expect(layer.getCell(0, 0).n).toBe(5);
    });
  });

  describe('strip-at-write sparsity (H2)', () => {
    it('setCell with defaultValue does not allocate a stored entry', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 0,
      });
      layer.setCell(1, 1, 5);
      expect(layer.getState().cells).toHaveLength(1);
      // Reverting cell back to default frees the entry.
      layer.setCell(1, 1, 0);
      expect(layer.getState().cells).toHaveLength(0);
    });

    it('setAt with defaultValue does not allocate a stored entry', () => {
      const layer = new Layer<number>({
        worldWidth: 8,
        worldHeight: 8,
        blockSize: 2,
        defaultValue: -1,
      });
      layer.setAt(2, 2, 5);
      expect(layer.getState().cells).toHaveLength(1);
      layer.setAt(2, 2, -1);
      expect(layer.getState().cells).toHaveLength(0);
    });

    it('fill(defaultValue) clears the sparse map entirely', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 0,
      });
      layer.fill(7);
      expect(layer.getState().cells).toHaveLength(16);
      layer.fill(0);
      expect(layer.getState().cells).toHaveLength(0);
    });

    it('fill(non-default) populates every cell', () => {
      const layer = new Layer<number>({
        worldWidth: 3,
        worldHeight: 3,
        defaultValue: 0,
      });
      layer.fill(7);
      expect(layer.getState().cells).toHaveLength(9);
      expect(layer.getCell(0, 0)).toBe(7);
      expect(layer.getCell(2, 2)).toBe(7);
    });
  });

  describe('clear / clearAt (L5)', () => {
    it('clear(cx, cy) drops the cell back to default', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: -1,
      });
      layer.setCell(2, 3, 42);
      expect(layer.getCell(2, 3)).toBe(42);
      layer.clear(2, 3);
      expect(layer.getCell(2, 3)).toBe(-1);
      expect(layer.getState().cells).toHaveLength(0);
    });

    it('clearAt(wx, wy) drops the bucketed cell back to default', () => {
      const layer = new Layer<number>({
        worldWidth: 8,
        worldHeight: 8,
        blockSize: 2,
        defaultValue: 0,
      });
      layer.setAt(4, 4, 99);
      layer.clearAt(4, 4);
      expect(layer.getAt(4, 4)).toBe(0);
      expect(layer.getState().cells).toHaveLength(0);
    });

    it('clear() on an already-default cell is a no-op', () => {
      const layer = new Layer<number>({
        worldWidth: 2,
        worldHeight: 2,
        defaultValue: 0,
      });
      expect(() => layer.clear(0, 0)).not.toThrow();
      expect(layer.getState().cells).toHaveLength(0);
    });

    it('clear() rejects out-of-bounds cell coordinates', () => {
      const layer = new Layer<number>({
        worldWidth: 2,
        worldHeight: 2,
        defaultValue: 0,
      });
      expect(() => layer.clear(5, 0)).toThrow();
      expect(() => layer.clearAt(99, 0)).toThrow();
    });
  });

  describe('primitive fast-path correctness (H4)', () => {
    it('Layer<number> reads return correct value (no clone needed for primitive)', () => {
      const layer = new Layer<number>({
        worldWidth: 4,
        worldHeight: 4,
        defaultValue: 0,
      });
      layer.setCell(1, 1, 42);
      expect(layer.getCell(1, 1)).toBe(42);
      expect(layer.getCell(0, 0)).toBe(0);
      let count = 0;
      layer.forEach((v) => {
        if (v === 42) count++;
      });
      expect(count).toBe(1);
    });

    it('Layer<boolean> reads return correct value', () => {
      const layer = new Layer<boolean>({
        worldWidth: 2,
        worldHeight: 2,
        defaultValue: false,
      });
      layer.setCell(0, 0, true);
      expect(layer.getCell(0, 0)).toBe(true);
      expect(layer.getCell(1, 1)).toBe(false);
    });

    it('forEachReadOnly returns live references for object T (caller must not mutate)', () => {
      const layer = new Layer<{ n: number }>({
        worldWidth: 2,
        worldHeight: 2,
        defaultValue: { n: 0 },
      });
      layer.setCell(0, 0, { n: 5 });
      let observedRef: { n: number } | null = null;
      layer.forEachReadOnly((value, cx, cy) => {
        if (cx === 0 && cy === 0) observedRef = value;
      });
      expect(observedRef).not.toBeNull();
      // Same object across iterations: live reference, no clone.
      let again: { n: number } | null = null;
      layer.forEachReadOnly((value, cx, cy) => {
        if (cx === 0 && cy === 0) again = value;
      });
      expect(again).toBe(observedRef);
    });
  });

  describe('safe-integer validation', () => {
    it('rejects worldWidth above MAX_SAFE_INTEGER', () => {
      expect(
        () =>
          new Layer<number>({
            worldWidth: Number.MAX_SAFE_INTEGER + 2,
            worldHeight: 4,
            defaultValue: 0,
          }),
      ).toThrow(/worldWidth/);
    });

    it('rejects blockSize above MAX_SAFE_INTEGER', () => {
      expect(
        () =>
          new Layer<number>({
            worldWidth: 4,
            worldHeight: 4,
            blockSize: Number.MAX_SAFE_INTEGER + 2,
            defaultValue: 0,
          }),
      ).toThrow(/blockSize/);
    });
  });

  describe('fromState input validation', () => {
    it('rejects null state', () => {
      expect(() =>
        Layer.fromState<number>(null as unknown as never),
      ).toThrow(/non-null object/);
    });

    it('rejects state without blockSize', () => {
      expect(() =>
        Layer.fromState<number>({
          worldWidth: 4,
          worldHeight: 4,
          defaultValue: 0,
          cells: [],
        } as unknown as never),
      ).toThrow(/blockSize/);
    });

    it('rejects state with cells: null', () => {
      expect(() =>
        Layer.fromState<number>({
          worldWidth: 4,
          worldHeight: 4,
          blockSize: 1,
          defaultValue: 0,
          cells: null as unknown as never,
        }),
      ).toThrow(/cells must be an array/);
    });

    it('rejects malformed tuple in cells', () => {
      expect(() =>
        Layer.fromState<number>({
          worldWidth: 4,
          worldHeight: 4,
          blockSize: 1,
          defaultValue: 0,
          cells: [42 as unknown as never],
        }),
      ).toThrow(/index, value/);
    });

    it('rejects tuple with non-array shape', () => {
      expect(() =>
        Layer.fromState<number>({
          worldWidth: 4,
          worldHeight: 4,
          blockSize: 1,
          defaultValue: 0,
          cells: [{ a: 1 } as unknown as never],
        }),
      ).toThrow(/index, value/);
    });

    it('strips default-valued entries on load (canonical sparse)', () => {
      const layer = Layer.fromState<number>({
        worldWidth: 4,
        worldHeight: 4,
        blockSize: 1,
        defaultValue: 0,
        cells: [
          [0, 0],
          [5, 7],
        ],
      });
      // Round-trip through getState — only the non-default entry should remain.
      const state = layer.getState();
      expect(state.cells).toEqual([[5, 7]]);
    });
  });

  describe('use cases', () => {
    it('models pollution at half-resolution of a 16x16 world', () => {
      const pollution = new Layer<number>({
        worldWidth: 16,
        worldHeight: 16,
        blockSize: 2,
        defaultValue: 0,
      });
      // A factory at (3, 5) increases pollution in its 2x2 cell
      pollution.setAt(3, 5, 80);
      // Anyone querying pollution at any world coord in that 2x2 block sees it
      expect(pollution.getAt(2, 4)).toBe(80);
      expect(pollution.getAt(3, 5)).toBe(80);
      expect(pollution.getAt(2, 5)).toBe(80);
      expect(pollution.getAt(3, 4)).toBe(80);
      // A neighboring block is unaffected
      expect(pollution.getAt(4, 5)).toBe(0);
    });

    it('models a tagged influence map that survives JSON round-trip', () => {
      const influence = new Layer<{ owner: number; weight: number }>({
        worldWidth: 12,
        worldHeight: 12,
        blockSize: 4,
        defaultValue: { owner: 0, weight: 0 },
      });
      // 12x12 world / blockSize 4 → 3x3 cells. (2,2) hits cell (0,0); (10,10) hits cell (2,2).
      // Cell (1,1) is left at default.
      influence.setAt(2, 2, { owner: 1, weight: 50 });
      influence.setAt(10, 10, { owner: 2, weight: 30 });
      const json = JSON.stringify(influence.getState());
      const loaded = Layer.fromState<{ owner: number; weight: number }>(
        JSON.parse(json),
      );
      expect(loaded.getAt(2, 2)).toEqual({ owner: 1, weight: 50 });
      expect(loaded.getAt(10, 10)).toEqual({ owner: 2, weight: 30 });
      expect(loaded.getAt(5, 5)).toEqual({ owner: 0, weight: 0 });
    });
  });
});
