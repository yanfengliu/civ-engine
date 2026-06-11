import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EngineError,
  EngineRangeError,
  EngineTypeError,
  isEngineError,
} from '../src/engine-error.js';
import { Layer, World } from '../src/index.js';
import type { JsonValue } from '../src/json.js';

function captureEngineError(fn: () => unknown): EngineError | EngineRangeError | EngineTypeError {
  try {
    fn();
  } catch (e) {
    if (isEngineError(e)) return e;
    throw new Error(`expected an engine error, got: ${String(e)}`);
  }
  throw new Error('expected fn to throw');
}

describe('EngineError classes', () => {
  it('carries first-class code and optional details', () => {
    const plain = new EngineError('entity_not_alive', 'Entity 3 is not alive');
    expect(plain.code).toBe('entity_not_alive');
    expect(plain.details).toBeNull();
    expect(plain.name).toBe('EngineError');
    expect(plain).toBeInstanceOf(Error);

    const detailed = new EngineError('component_not_registered', "Component 'hp' is not registered", {
      details: { key: 'hp' },
    });
    expect(detailed.details).toEqual({ key: 'hp' });
  });

  it('EngineRangeError preserves instanceof RangeError; EngineTypeError preserves instanceof TypeError', () => {
    const r = new EngineRangeError('position_out_of_bounds', 'out of bounds', { details: { x: 99, y: 0 } });
    expect(r).toBeInstanceOf(RangeError);
    expect(r).toBeInstanceOf(Error);
    expect(r.code).toBe('position_out_of_bounds');
    const t = new EngineTypeError('layer_state_invalid', 'Layer.fromState requires a non-null object');
    expect(t).toBeInstanceOf(TypeError);
    expect(t.code).toBe('layer_state_invalid');
  });

  it('details are sanitized to strict JSON at construction (impl-1 Codex HIGH)', () => {
    const e = new EngineError('x', 'm', {
      details: {
        cx: NaN,
        arr: [Infinity, -Infinity],
        nested: { dropped: undefined as never, kept: 1 },
      },
    });
    expect(e.details).toEqual({
      cx: 'NaN',
      arr: ['Infinity', '-Infinity'],
      nested: { kept: 1 },
    });

    // Sparse holes must become null (Array.from), not survive (.map skips
    // holes) — a surviving hole breaks the JSON-asserted TickFailure path.
    const sparse = new Array(3) as unknown[];
    sparse[0] = 1;
    sparse[2] = 3;
    const s = new EngineError('x', 'm', { details: { sparse: sparse as JsonValue } });
    expect(s.details).toEqual({ sparse: [1, null, 3] });
    expect(0 in (s.details as { sparse: unknown[] }).sparse).toBe(true);
    expect(1 in (s.details as { sparse: unknown[] }).sparse).toBe(true);

    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    const c = new EngineError('x', 'm', { details: circular as never });
    expect(c.details).toEqual({ a: 1, self: '[Circular]' });
  });

  it('isEngineError is instanceof-based: matches all three classes, rejects errno-style duck types', () => {
    expect(isEngineError(new EngineError('x', 'm'))).toBe(true);
    expect(isEngineError(new EngineRangeError('x', 'm'))).toBe(true);
    expect(isEngineError(new EngineTypeError('x', 'm'))).toBe(true);
    const errnoLike = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' });
    expect(isEngineError(errnoLike)).toBe(false);
    expect(isEngineError(new Error('plain'))).toBe(false);
    expect(isEngineError(null)).toBe(false);
    expect(isEngineError({ code: 'fake', message: 'm' })).toBe(false);
  });
});

describe('migrated sites: unchanged message + (class, code, details) per domain', () => {
  const makeWorld = () => new World({ gridWidth: 4, gridHeight: 4, tps: 60 });

  it('entity: entity_not_alive', () => {
    const world = makeWorld();
    world.registerComponent<{ v: number }>('hp');
    const e = captureEngineError(() => world.addComponent(9999, 'hp', { v: 1 }));
    expect(e).toBeInstanceOf(EngineError);
    expect(e.code).toBe('entity_not_alive');
    expect(e.message).toBe('Entity 9999 is not alive');
    expect(e.details).toEqual({ entity: 9999 });
  });

  it('component: component_not_registered', () => {
    const world = makeWorld();
    const e = captureEngineError(() => [...world.query('nope')]);
    expect(e.code).toBe('component_not_registered');
    expect(e.message).toBe("Component 'nope' is not registered");
    expect(e.details).toEqual({ key: 'nope' });
  });

  it('system: system_cycle with the cycle in details', () => {
    const world = makeWorld();
    const e = captureEngineError(() => {
      world.registerSystem({ name: 'a', after: ['b'], execute: () => {} });
      world.registerSystem({ name: 'b', after: ['a'], execute: () => {} });
      world.step();
    });
    expect(e.code).toBe('system_cycle');
    expect(e.message).toMatch(/^Cycle detected in system ordering: /);
    expect(e.details).toEqual({ systems: expect.stringContaining('a') });
  });

  it('config: config_invalid keeps the RangeError class and names the field', () => {
    const e = captureEngineError(() => new World({ gridWidth: 0, gridHeight: 4, tps: 60 }));
    expect(e).toBeInstanceOf(EngineRangeError);
    expect(e).toBeInstanceOf(RangeError);
    expect(e.code).toBe('config_invalid');
    expect(e.message).toBe('gridWidth must be a positive integer');
    expect(e.details).toEqual({ field: 'gridWidth' });
  });

  it('layer: layer_state_invalid keeps the TypeError class', () => {
    const e = captureEngineError(() => Layer.fromState(null as never));
    expect(e).toBeInstanceOf(EngineTypeError);
    expect(e).toBeInstanceOf(TypeError);
    expect(e.code).toBe('layer_state_invalid');
    expect(e.message).toBe('Layer.fromState requires a non-null object');
  });

  it('json: json_incompatible carries the context path', () => {
    const world = makeWorld();
    const e = captureEngineError(() => world.setState('k', undefined as never));
    expect(e.code).toBe('json_incompatible');
    expect(e.details).toEqual({ context: expect.stringContaining('k') });
  });
});

describe('TickFailure propagation (createErrorDetails pass-through)', () => {
  it('failure.error gains code/details when a system throws an EngineError', () => {
    const world = new World({ gridWidth: 4, gridHeight: 4, tps: 60 });
    world.registerComponent<{ v: number }>('hp');
    world.registerSystem({
      name: 'boom',
      execute: (w) => {
        (w as World).addComponent(424242, 'hp', { v: 1 });
      },
    });
    const result = world.stepWithResult();
    expect(result.ok).toBe(false);
    // Two levels: failure.code classifies the failure; failure.error.code is
    // the thrown engine error. The docs teach exactly this pair.
    expect(result.failure?.code).toBe('system_threw');
    const err = result.failure?.error;
    expect(err?.name).toBe('EngineError');
    expect(err?.message).toBe('Entity 424242 is not alive');
    expect(err?.code).toBe('entity_not_alive');
    expect(err?.details).toEqual({ entity: 424242 });
  });

  it('an engine error ABOUT non-finite input still produces a TickFailure (impl-1 Codex HIGH repro)', () => {
    const world = new World({ gridWidth: 4, gridHeight: 4, tps: 60 });
    world.registerComponent<{ v: number }>('hp');
    world.registerSystem({
      name: 'boom',
      execute: (w) => {
        (w as World).findNearest(NaN, 0, 'hp');
      },
    });
    const result = world.stepWithResult();
    expect(result.ok).toBe(false);
    expect(result.failure?.error?.code).toBe('query_coords_not_integer');
    expect(result.failure?.error?.details).toEqual({ cx: 'NaN', cy: 0 });
  });

  it('failure.error stays {name, message, stack} for plain user-thrown errors', () => {
    const world = new World({ gridWidth: 4, gridHeight: 4, tps: 60 });
    world.registerSystem({
      name: 'boom',
      execute: () => {
        throw new Error('plain boom');
      },
    });
    const result = world.stepWithResult();
    expect(result.ok).toBe(false);
    const err = result.failure?.error;
    expect(err?.name).toBe('Error');
    expect(err && 'code' in err).toBe(false);
    expect(err && 'details' in err).toBe(false);
  });
});

describe('no uncoded throws in the core engine (completeness gate)', () => {
  // Modules with their own established coded-error families (details.code).
  const EXCLUDED = [
    /^session-/, /^bundle-/, /^world-strict-mode\.ts$/, /^engine-error\.ts$/,
  ];

  it('src/ contains no plain Error/RangeError/TypeError throws outside excluded modules', () => {
    const srcDir = path.join(process.cwd(), 'src');
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir).sort()) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) { walk(full); continue; }
        if (!entry.endsWith('.ts')) continue;
        const rel = path.relative(srcDir, full).replace(/\\/g, '/');
        if (EXCLUDED.some((re) => re.test(rel))) continue;
        const content = readFileSync(full, 'utf8');
        const lines = content.split(/\r?\n/);
        lines.forEach((line, i) => {
          if (/throw new (Error|RangeError|TypeError)\(/.test(line)) {
            offenders.push(`${rel}:${i + 1}`);
          }
        });
      }
    };
    walk(srcDir);
    expect(
      offenders,
      `uncoded throws (use EngineError/EngineRangeError/EngineTypeError with a stable code): ${offenders.join(', ')}`,
    ).toEqual([]);
  });
});
