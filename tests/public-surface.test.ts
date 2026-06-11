// Public-surface pin (v1-surface objective, v0.8.23). Two levels:
// (1) runtime export names of the package entry, (2) ALL exported names —
// types included — parsed from src/index.ts, which the curation made fully
// explicit (no star-exports), so its brace blocks ARE the complete public
// name list; the no-star invariant below keeps it that way. Any surface
// change must update tests/fixtures/public-surface.json in the same
// reviewed diff. Deliberately NOT gated: signatures and type shapes
// (typecheck + suite + api-reference review own those; the 1.0 checklist
// adds a d.ts diff review step at the freeze).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const fixture = JSON.parse(
  readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'public-surface.json'), 'utf8'),
) as { runtime: string[]; declaration: string[] };

describe('public surface pin', () => {
  it('runtime export names match the committed allowlist', async () => {
    const mod = (await import('../src/index.js')) as Record<string, unknown>;
    expect(Object.keys(mod).sort()).toEqual(fixture.runtime);
  });

  it('declared export names (types included) match the committed allowlist', () => {
    const indexSrc = readFileSync(path.join(process.cwd(), 'src', 'index.ts'), 'utf8');
    // Curation invariant: no star-exports — they are how surface grows by
    // accident, and they would blind this name-level pin.
    expect(indexSrc).not.toMatch(/^export \*/m);
    const names = new Set<string>();
    for (const block of indexSrc.matchAll(/export\s*\{([^}]*)\}/gs)) {
      for (const raw of block[1].split(',')) {
        let n = raw.trim();
        if (!n) continue;
        n = n.replace(/^type\s+/, '');
        const asMatch = /^\S+\s+as\s+(\S+)$/.exec(n);
        if (asMatch) n = asMatch[1];
        names.add(n);
      }
    }
    expect([...names].sort()).toEqual(fixture.declaration);
  });

  it('the load-bearing side-effect import survives curation', () => {
    // session-internals.js declaration-merges the recorder mutex slot onto
    // World; dropping it breaks SessionRecorder.connect at runtime.
    const indexSrc = readFileSync(path.join(process.cwd(), 'src', 'index.ts'), 'utf8');
    expect(indexSrc).toContain("import './session-internals.js';");
  });
});
