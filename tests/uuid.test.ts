import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { portableRandomUUID } from '../src/uuid.js';

describe('portableRandomUUID', () => {
  it('produces v4-shaped, unique ids', () => {
    const a = portableRandomUUID();
    const b = portableRandomUUID();
    const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(a).toMatch(v4);
    expect(b).toMatch(v4);
    expect(a).not.toBe(b);
  });
});

describe('browser-reachable session modules avoid node builtins', () => {
  // FileSink and the disk corpus are node-only by design; the recorder and
  // scenario-bundle helpers must load in browsers/workers, where a
  // node:crypto import fails module resolution and takes the whole game
  // bundle down with it (surfaced by farm's in-page recorder, 2026-07-08).
  it.each(['session-recorder.ts', 'session-scenario-bundle.ts'])('%s', (file) => {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    expect(source).not.toContain("from 'node:");
  });
});
