import { describe, it, expect } from 'vitest';
import { createNoise2D, octaveNoise2D } from '../src/noise.js';

describe('createNoise2D', () => {
  it('returns a function', () => {
    const noise = createNoise2D(42);
    expect(typeof noise).toBe('function');
  });

  it('is deterministic — same seed produces same values', () => {
    const a = createNoise2D(42);
    const b = createNoise2D(42);
    expect(a(1.5, 2.3)).toBe(b(1.5, 2.3));
    expect(a(0, 0)).toBe(b(0, 0));
    expect(a(100.7, -50.2)).toBe(b(100.7, -50.2));
  });

  it('different seeds produce different values', () => {
    const a = createNoise2D(1);
    const b = createNoise2D(2);
    const sameCount = [
      a(1, 1) === b(1, 1),
      a(5.5, 3.2) === b(5.5, 3.2),
      a(10, 20) === b(10, 20),
    ].filter(Boolean).length;
    expect(sameCount).toBeLessThan(3);
  });

  it('output is always in [-1, 1]', () => {
    const noise = createNoise2D(123);
    for (let x = -50; x <= 50; x += 0.73) {
      for (let y = -50; y <= 50; y += 0.73) {
        const v = noise(x, y);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('nearby coordinates produce different values (not degenerate)', () => {
    const noise = createNoise2D(99);
    const values = new Set<number>();
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        values.add(noise(x * 0.5, y * 0.5));
      }
    }
    expect(values.size).toBeGreaterThan(1);
  });
});

describe('octaveNoise2D', () => {
  it('output is always in [-1, 1]', () => {
    const noise = createNoise2D(42);
    for (let x = -20; x <= 20; x += 1.3) {
      for (let y = -20; y <= 20; y += 1.3) {
        const v = octaveNoise2D(noise, x, y, 6);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('result differs from single-octave noise', () => {
    const noise = createNoise2D(42);
    let same = 0;
    for (let i = 0; i < 10; i++) {
      const x = i * 1.1;
      const y = i * 0.7;
      if (noise(x, y) === octaveNoise2D(noise, x, y, 4)) same++;
    }
    expect(same).toBeLessThan(10);
  });

  it('respects persistence and lacunarity parameters', () => {
    const noise = createNoise2D(42);
    const a = octaveNoise2D(noise, 5, 5, 4, 0.3, 3.0);
    const b = octaveNoise2D(noise, 5, 5, 4, 0.7, 1.5);
    expect(a).not.toBe(b);
  });

  it('single octave matches base noise', () => {
    const noise = createNoise2D(42);
    expect(octaveNoise2D(noise, 3.5, 7.2, 1)).toBe(noise(3.5, 7.2));
  });

  it('rejects octaves <= 0 (L1 iter-7)', () => {
    const noise = createNoise2D(42);
    expect(() => octaveNoise2D(noise, 0, 0, 0)).toThrow(RangeError);
    expect(() => octaveNoise2D(noise, 0, 0, -1)).toThrow(RangeError);
  });

  it('rejects fractional octaves (L1 iter-7)', () => {
    const noise = createNoise2D(42);
    expect(() => octaveNoise2D(noise, 0, 0, 1.5)).toThrow(RangeError);
  });

  it('rejects negative persistence (L1 iter-7)', () => {
    const noise = createNoise2D(42);
    expect(() => octaveNoise2D(noise, 0, 0, 4, -0.1)).toThrow(RangeError);
  });

  it('rejects non-positive lacunarity (L1 iter-7)', () => {
    const noise = createNoise2D(42);
    expect(() => octaveNoise2D(noise, 0, 0, 4, 0.5, 0)).toThrow(RangeError);
    expect(() => octaveNoise2D(noise, 0, 0, 4, 0.5, -1)).toThrow(RangeError);
  });

  it('rejects non-finite parameters (L1 iter-7)', () => {
    const noise = createNoise2D(42);
    expect(() => octaveNoise2D(noise, 0, 0, 4, NaN)).toThrow(RangeError);
    expect(() => octaveNoise2D(noise, 0, 0, 4, 0.5, Infinity)).toThrow(RangeError);
  });

  it('persistence=0 yields finite output (single octave dominates) (L1 iter-7)', () => {
    const noise = createNoise2D(42);
    const v = octaveNoise2D(noise, 1, 2, 4, 0);
    expect(Number.isFinite(v)).toBe(true);
  });
});
