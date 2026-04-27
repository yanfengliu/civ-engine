import { assertJsonCompatible, jsonFingerprint } from './json.js';

export interface LayerOptions<T> {
  worldWidth: number;
  worldHeight: number;
  blockSize?: number;
  defaultValue: T;
}

export interface LayerState<T> {
  worldWidth: number;
  worldHeight: number;
  blockSize: number;
  defaultValue: T;
  cells: Array<[number, T]>;
}

function isImmutablePrimitive(value: unknown): boolean {
  if (value === null) return true;
  const t = typeof value;
  return t === 'number' || t === 'string' || t === 'boolean';
}

function cloneIfNeeded<T>(value: T): T {
  return isImmutablePrimitive(value) ? value : structuredClone(value);
}

export class Layer<T> {
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly blockSize: number;
  readonly width: number;
  readonly height: number;
  private readonly _defaultValue: T;
  private readonly _defaultFingerprint: string;
  private readonly _defaultIsPrimitive: boolean;
  private cells = new Map<number, T>();

  constructor(options: LayerOptions<T>) {
    assertSafePositiveInteger(options.worldWidth, 'worldWidth');
    assertSafePositiveInteger(options.worldHeight, 'worldHeight');
    const blockSize = options.blockSize ?? 1;
    assertSafePositiveInteger(blockSize, 'blockSize');
    assertJsonCompatible(options.defaultValue, 'Layer.defaultValue');

    this.worldWidth = options.worldWidth;
    this.worldHeight = options.worldHeight;
    this.blockSize = blockSize;
    this.width = Math.ceil(options.worldWidth / blockSize);
    this.height = Math.ceil(options.worldHeight / blockSize);
    if (!Number.isSafeInteger(this.width * this.height)) {
      throw new RangeError(
        `Layer dimensions ${this.width} x ${this.height} exceed Number.MAX_SAFE_INTEGER`,
      );
    }
    this._defaultIsPrimitive = isImmutablePrimitive(options.defaultValue);
    this._defaultValue = cloneIfNeeded(options.defaultValue);
    this._defaultFingerprint = jsonFingerprint(this._defaultValue);
  }

  get defaultValue(): T {
    return cloneIfNeeded(this._defaultValue);
  }

  getCell(cx: number, cy: number): T {
    this.assertCellInBounds(cx, cy);
    const stored = this.cells.get(this.cellIndex(cx, cy));
    return stored === undefined ? cloneIfNeeded(this._defaultValue) : cloneIfNeeded(stored);
  }

  setCell(cx: number, cy: number, value: T): void {
    this.assertCellInBounds(cx, cy);
    const idx = this.cellIndex(cx, cy);
    if (this.matchesDefault(value)) {
      this.cells.delete(idx);
      return;
    }
    // For object T, jsonFingerprint inside matchesDefault already validated
    // via assertJsonCompatible (json.ts:60). For primitive T, matchesDefault
    // short-circuited before validating, so validate explicitly here.
    if (this._defaultIsPrimitive) {
      assertJsonCompatible(value, 'Layer cell value');
    }
    this.cells.set(idx, cloneIfNeeded(value));
  }

  getAt(wx: number, wy: number): T {
    this.assertWorldInBounds(wx, wy);
    const cx = Math.floor(wx / this.blockSize);
    const cy = Math.floor(wy / this.blockSize);
    const stored = this.cells.get(this.cellIndex(cx, cy));
    return stored === undefined ? cloneIfNeeded(this._defaultValue) : cloneIfNeeded(stored);
  }

  setAt(wx: number, wy: number, value: T): void {
    this.assertWorldInBounds(wx, wy);
    const cx = Math.floor(wx / this.blockSize);
    const cy = Math.floor(wy / this.blockSize);
    const idx = this.cellIndex(cx, cy);
    if (this.matchesDefault(value)) {
      this.cells.delete(idx);
      return;
    }
    if (this._defaultIsPrimitive) {
      assertJsonCompatible(value, 'Layer cell value');
    }
    this.cells.set(idx, cloneIfNeeded(value));
  }

  clear(cx: number, cy: number): void {
    this.assertCellInBounds(cx, cy);
    this.cells.delete(this.cellIndex(cx, cy));
  }

  clearAt(wx: number, wy: number): void {
    this.assertWorldInBounds(wx, wy);
    const cx = Math.floor(wx / this.blockSize);
    const cy = Math.floor(wy / this.blockSize);
    this.cells.delete(this.cellIndex(cx, cy));
  }

  fill(value: T): void {
    if (this.matchesDefault(value)) {
      this.cells.clear();
      return;
    }
    if (this._defaultIsPrimitive) {
      assertJsonCompatible(value, 'Layer fill value');
    }
    for (let cy = 0; cy < this.height; cy++) {
      for (let cx = 0; cx < this.width; cx++) {
        this.cells.set(this.cellIndex(cx, cy), cloneIfNeeded(value));
      }
    }
  }

  forEach(cb: (value: T, cx: number, cy: number) => void): void {
    for (let cy = 0; cy < this.height; cy++) {
      for (let cx = 0; cx < this.width; cx++) {
        const stored = this.cells.get(this.cellIndex(cx, cy));
        const out =
          stored === undefined ? cloneIfNeeded(this._defaultValue) : cloneIfNeeded(stored);
        cb(out, cx, cy);
      }
    }
  }

  /**
   * Iterate every cell with the live stored reference (or `defaultValue` for
   * unset cells). Caller must NOT mutate the value — for object `T` the
   * reference is shared with internal storage. Use `forEach` if you need a
   * defensive copy. Provides zero-allocation traversal for hot paths.
   */
  forEachReadOnly(cb: (value: T, cx: number, cy: number) => void): void {
    for (let cy = 0; cy < this.height; cy++) {
      for (let cx = 0; cx < this.width; cx++) {
        const stored = this.cells.get(this.cellIndex(cx, cy));
        cb(stored === undefined ? this._defaultValue : stored, cx, cy);
      }
    }
  }

  getState(): LayerState<T> {
    // Strip-at-write means stored entries are never default. `cells` is
    // private and every public path that inserts strips defaults, so no
    // post-hoc filter is needed here.
    const entries: Array<[number, T]> = [];
    for (const [index, value] of this.cells) {
      entries.push([index, cloneIfNeeded(value)]);
    }
    entries.sort((a, b) => a[0] - b[0]);
    return {
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      blockSize: this.blockSize,
      defaultValue: cloneIfNeeded(this._defaultValue),
      cells: entries,
    };
  }

  static fromState<T>(state: LayerState<T>): Layer<T> {
    if (state === null || typeof state !== 'object') {
      throw new TypeError('Layer.fromState requires a non-null object');
    }
    const {
      worldWidth,
      worldHeight,
      blockSize,
      defaultValue,
      cells,
    } = state as Partial<LayerState<T>>;
    if (blockSize === undefined || blockSize === null) {
      throw new Error(
        'Layer.fromState state.blockSize is required (cannot be omitted)',
      );
    }
    if (!Array.isArray(cells)) {
      throw new TypeError('Layer.fromState state.cells must be an array');
    }
    const layer = new Layer<T>({
      worldWidth: worldWidth as number,
      worldHeight: worldHeight as number,
      blockSize,
      defaultValue: defaultValue as T,
    });
    const seen = new Set<number>();
    const total = layer.width * layer.height;
    for (const entry of cells) {
      if (!Array.isArray(entry) || entry.length !== 2) {
        throw new TypeError(
          'Layer.fromState each cell entry must be a [index, value] tuple',
        );
      }
      const [index, value] = entry as [unknown, T];
      if (typeof index !== 'number' || !Number.isSafeInteger(index) || index < 0 || index >= total) {
        throw new RangeError(
          `Layer cell index ${String(index)} is out of range [0, ${total})`,
        );
      }
      if (seen.has(index)) {
        throw new Error(`Layer state contains duplicate cell index ${index}`);
      }
      seen.add(index);
      // Canonicalize: drop entries that already match the default. For
      // primitive T use direct equality; for object T jsonFingerprint
      // validates JSON-compat internally (json.ts:60). For primitive T
      // validate explicitly since we skip the fingerprint walk.
      if (layer._defaultIsPrimitive) {
        assertJsonCompatible(value, 'Layer cell value');
        if (value === layer._defaultValue) continue;
      } else {
        if (jsonFingerprint(value) === layer._defaultFingerprint) continue;
      }
      layer.cells.set(index, cloneIfNeeded(value));
    }
    return layer;
  }

  clone(): Layer<T> {
    const copy = new Layer<T>({
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      blockSize: this.blockSize,
      // Pass _defaultValue by reference; the constructor clones once.
      defaultValue: this._defaultValue,
    });
    for (const [index, value] of this.cells) {
      copy.cells.set(index, cloneIfNeeded(value));
    }
    return copy;
  }

  private matchesDefault(value: T): boolean {
    if (this._defaultIsPrimitive) {
      // Per-value primitive check is fine here too; if a Layer<unknown> with
      // primitive default later receives an object that happens to fingerprint
      // equal to the default, that's still meaningful — but we use === for
      // primitive defaults so non-primitive values never match.
      return value === this._defaultValue;
    }
    // jsonFingerprint validates JSON-compat internally.
    return jsonFingerprint(value) === this._defaultFingerprint;
  }

  private cellIndex(cx: number, cy: number): number {
    return cy * this.width + cx;
  }

  private assertCellInBounds(cx: number, cy: number): void {
    if (!Number.isInteger(cx) || !Number.isInteger(cy)) {
      throw new RangeError(
        `Layer cell coordinates must be integers (got ${cx}, ${cy})`,
      );
    }
    if (cx < 0 || cx >= this.width || cy < 0 || cy >= this.height) {
      throw new RangeError(
        `Layer cell (${cx}, ${cy}) out of bounds [0, ${this.width}) x [0, ${this.height})`,
      );
    }
  }

  private assertWorldInBounds(wx: number, wy: number): void {
    if (!Number.isInteger(wx) || !Number.isInteger(wy)) {
      throw new RangeError(
        `Layer world coordinates must be integers (got ${wx}, ${wy})`,
      );
    }
    if (wx < 0 || wx >= this.worldWidth || wy < 0 || wy >= this.worldHeight) {
      throw new RangeError(
        `Layer world coord (${wx}, ${wy}) out of bounds [0, ${this.worldWidth}) x [0, ${this.worldHeight})`,
      );
    }
  }
}

function assertSafePositiveInteger(value: number, label: string): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `${label} must be a safe positive integer (got ${String(value)})`,
    );
  }
}
