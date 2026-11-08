// E23/E12 claim guard. Behavioral predicates accompany the prose pins; these
// do not promote internal helpers or promise rollback from live-reference writes.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as engine from '../src/index.js';
import * as browser from '../src/index.browser.js';
import { ComponentStore } from '../src/component-store.js';

const read = (path: string) => readFileSync(path, 'utf8');

describe('component publication documentation claims', () => {
  it('pins the explicit-publication claim against actual strict and semantic stores', () => {
    for (const diffMode of ['strict', 'semantic'] as const) {
      const store = new ComponentStore<{ hp: number }>({ diffMode });
      store.set(1, { hp: 10 });
      store.clearDirty();
      const held = store.get(1)!;
      held.hp = 9;
      expect(store.getDirty().set).toEqual([]);
      store.set(1, held);
      expect(store.getDirty().set).toEqual([[1, { hp: 9 }]]);
    }
    for (const path of ['docs/api-reference.md', 'docs/guides/entities-and-components.md', 'docs/guides/public-api-and-invariants.md']) {
      expect(read(path), path).toContain('Direct component-reference mutations are not automatically tracked for diffs.');
      expect(read(path), path).not.toContain('Direct mutations are detected for diffs');
    }
  });

  it('keeps callback-void identity distinct from the method return and no-rollback boundary', () => {
    const api = read('docs/api-reference.md');
    const section = api.split('#### `patchComponent<T>(entity, key, fn)`')[1].split('#### `setPosition')[0];
    expect(section).toContain('): T');
    expect(section).toContain('returns the published value');
    expect(section).toContain('does not roll back');
    expect(section).toContain('before invoking the callback');
  });

  it('names all three position publication APIs without an exclusive setPosition claim', () => {
    const guide = read('docs/guides/spatial-grid.md');
    expect(guide).toContain('`setPosition`, `setComponent`, and `patchComponent`');
    expect(guide).not.toContain('`setPosition` is the only supported write path');
  });

  it('labels the error-table helper as internal and keeps it out of both package barrels', () => {
    expect(engine).not.toHaveProperty('applyTickDiff');
    expect(browser).not.toHaveProperty('applyTickDiff');
    expect(read('src/apply-tick-diff.ts')).toContain("new EngineError('snapshot_unsupported_version'");
    const row = read('docs/api-reference.md').split('\n').find(line => line.startsWith('| `snapshot_unsupported_version` |'));
    expect(row).toContain('`applyTickDiff` (internal; not a package export)');
  });
});
