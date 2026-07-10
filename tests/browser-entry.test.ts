import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Browser-safe entry pin (browser-safe-entry objective, v2.2.0). The package
// ships two curated barrels: src/index.ts (full surface, what Node resolves)
// and src/index.browser.ts (everything except the node-only FileSink and
// BundleCorpus, served to bundlers via the exports-map `browser` condition
// and the explicit `./browser` subpath). A mixed barrel served un-prebundled
// killed townscaper's boot at civ-engine's FileSink re-export (node:path in
// Vite's browser-external stub throws at module evaluation), so the split and
// its non-drift invariants are pinned here; rationale in
// docs/threads/done/browser-safe-entry/DESIGN.md.

const NODE_ONLY = ['BundleCorpus', 'FileSink'];

const root = process.cwd();
const srcDir = path.join(root, 'src');

// Same brace-block parse as tests/public-surface.test.ts: with the no-star
// invariant holding on both barrels, `export {...}` blocks ARE the complete
// declared-name list, types included.
function declaredNames(source: string): Set<string> {
  const names = new Set<string>();
  for (const block of source.matchAll(/export\s*\{([^}]*)\}/gs)) {
    for (const raw of block[1].split(',')) {
      let n = raw.trim();
      if (!n) continue;
      n = n.replace(/^type\s+/, '');
      const asMatch = /^\S+\s+as\s+(\S+)$/.exec(n);
      if (asMatch) n = asMatch[1];
      names.add(n);
    }
  }
  return names;
}

// Module specifiers that survive into the emitted JS of one source file:
// import/export ... from, side-effect imports, dynamic import(). Each
// statement is matched independently, anchored at a statement boundary
// (start-of-file, newline, or `;`) with a middle that excludes quotes and
// semicolons — so a match can never span from one statement into the next
// one's specifier, and a missing semicolon (valid via ASI) cannot blind the
// walk (regression BT-1). A leading `type` keyword is captured, so statement-
// level `import type` / `export type` (erased by tsc) are skipped; inline
// `{ type X, Y }` specifiers are conservatively KEPT (their statement is a
// value import). That may over-approximate emit for an all-inline-type import
// of a node builtin, but over-approximation is loud/safe — the walk may only
// ever see MORE reachability than a bundler, never less. Template-literal
// dynamic imports are not resolved (there are none — the graph is fully
// static and relative).
function runtimeSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const fromStatements = [
    /(?:^|[\n;])[ \t]*import\s+(type\s+)?[^'";]*?from\s*['"]([^'"]+)['"]/g,
    /(?:^|[\n;])[ \t]*export\s+(type\s+)?[^'";]*?from\s*['"]([^'"]+)['"]/g,
  ];
  for (const pattern of fromStatements) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) continue; // `import type` / `export type` — erased at emit
      specifiers.push(match[2]);
    }
  }
  const sideEffect = /(?:^|[\n;])[ \t]*import\s*['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(sideEffect)) specifiers.push(match[1]);
  const dynamic = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const match of source.matchAll(dynamic)) specifiers.push(match[1]);
  return specifiers;
}

interface GraphViolation {
  specifier: string;
  chain: string[];
}

// Transitive runtime module graph from a barrel: follows relative specifiers
// (the only kind a zero-dependency package may contain); records every
// non-relative specifier — node: builtins included — as a violation with its
// import chain. This is the same reachability computation an
// `esbuild --bundle --platform=browser` smoke would do, without adding a
// devDependency whose only job is this walk.
function walkRuntimeGraph(entryRelPath: string): { visited: string[]; violations: GraphViolation[] } {
  const visited = new Set<string>();
  const violations: GraphViolation[] = [];
  const queue: { file: string; chain: string[] }[] = [
    { file: path.join(root, entryRelPath), chain: [entryRelPath] },
  ];
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    if (visited.has(next.file)) continue;
    visited.add(next.file);
    const source = readFileSync(next.file, 'utf8');
    for (const specifier of runtimeSpecifiers(source)) {
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
        violations.push({ specifier, chain: next.chain });
        continue;
      }
      const resolved = path.resolve(path.dirname(next.file), specifier.replace(/\.js$/, '.ts'));
      const rel = path.relative(root, resolved).replace(/\\/g, '/');
      queue.push({ file: resolved, chain: [...next.chain, rel] });
    }
  }
  return { visited: [...visited], violations };
}

describe('browser entry', () => {
  it('module graph reachable from src/index.browser.ts has no node builtins or bare imports', () => {
    const { violations } = walkRuntimeGraph('src/index.browser.ts');
    const rendered = violations.map((v) => `${v.specifier} (via ${v.chain.join(' -> ')})`);
    expect(rendered).toEqual([]);
  });

  it('negative control: the walker sees the node builtins behind the full barrel', () => {
    // If this stops finding node:fs/node:path via src/index.ts, the purity
    // scan above is blind, not the tree clean — fix the walker.
    const { violations } = walkRuntimeGraph('src/index.ts');
    const specifiers = new Set(violations.map((v) => v.specifier));
    expect(specifiers).toContain('node:fs');
    expect(specifiers).toContain('node:path');
  });

  it('runtime surface is the full surface minus exactly the node-only names', async () => {
    const nodeBarrel = (await import('../src/index.js')) as Record<string, unknown>;
    const browserBarrel = (await import('../src/index.browser.js')) as Record<string, unknown>;
    const nodeKeys = new Set(Object.keys(nodeBarrel));
    const browserKeys = new Set(Object.keys(browserBarrel));
    expect([...nodeKeys].filter((k) => !browserKeys.has(k)).sort()).toEqual(NODE_ONLY);
    expect([...browserKeys].filter((k) => !nodeKeys.has(k))).toEqual([]);
  });

  it('every shared export is the identical object through both entries', async () => {
    // The browser barrel re-exports the same underlying modules — it can
    // never fork an implementation. Pins in particular CorpusIndexError,
    // which the two barrels reach via different re-export paths.
    const nodeBarrel = (await import('../src/index.js')) as Record<string, unknown>;
    const browserBarrel = (await import('../src/index.browser.js')) as Record<string, unknown>;
    for (const key of Object.keys(browserBarrel)) {
      expect(browserBarrel[key], `export ${key} diverged between barrels`).toBe(nodeBarrel[key]);
    }
  });

  it('declared surface (types included) is the full surface minus exactly the node-only names', () => {
    const nodeDeclared = declaredNames(readFileSync(path.join(srcDir, 'index.ts'), 'utf8'));
    const browserDeclared = declaredNames(readFileSync(path.join(srcDir, 'index.browser.ts'), 'utf8'));
    expect([...nodeDeclared].filter((n) => !browserDeclared.has(n)).sort()).toEqual(NODE_ONLY);
    expect([...browserDeclared].filter((n) => !nodeDeclared.has(n))).toEqual([]);
  });

  it('walker classifies statements independently of semicolons (regression: BT-1/BT-5)', () => {
    // A semicolon-less `import type` (valid via ASI; nothing in eslint
    // enforces semis) must not swallow the runtime import below it, or a
    // node: builtin would hide behind the ASI typo and pass the purity scan.
    const src = [
      "import type { Foo } from './foo.js'", // no semicolon
      "import { readFileSync } from 'node:fs';",
      "export type { Bar } from './bar.js'", // no semicolon
      "export { baz } from './baz.js';",
      "export {};import quux from 'node:path';", // two statements, one line
    ].join('\n');
    const specs = runtimeSpecifiers(src);
    expect(specs).toContain('node:fs');
    expect(specs).toContain('node:path');
    expect(specs).toContain('./baz.js');
    // type-only statements are erased at emit and must be ignored:
    expect(specs).not.toContain('./foo.js');
    expect(specs).not.toContain('./bar.js');
  });

  it('both barrels keep the curation invariants', () => {
    for (const file of ['index.ts', 'index.browser.ts']) {
      const source = readFileSync(path.join(srcDir, file), 'utf8');
      // No star-exports and no statement-level `export type` forms
      // (`export type { X } from`, `export type * from`, `export type Foo =`):
      // both are invisible to the brace-block declaredNames parser that the
      // parity pin and the public-surface fixture rely on, so a barrel that
      // used them could ship un-mirrored surface silently (BT-2). Forcing the
      // inline `export { type X }` form keeps every name parser-visible.
      expect(source, `${file} must not star-export`).not.toMatch(/^export\s+\*/m);
      expect(source, `${file} must not use statement-level export type`).not.toMatch(/^export\s+type[\s{*]/m);
    }
    // Load-bearing zero-runtime declaration merge (recorder mutex slot); both
    // entries must present the same World typing. Line-anchored so a
    // commented-out import does not satisfy the pin (BT-4).
    const browserSource = readFileSync(path.join(srcDir, 'index.browser.ts'), 'utf8');
    expect(browserSource).toMatch(/^import '\.\/session-internals\.js';[ \t\r]*$/m);
  });

  it('exports map serves the browser barrel via the browser condition and ./browser subpath', () => {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      main: string;
      types: string;
      exports: Record<string, Record<string, unknown> | string>;
    };
    const dot = pkg.exports['.'] as Record<string, unknown>;
    // Condition order is semantic in exports maps: browser must precede
    // types/import so bundlers match it; Node's condition set has neither
    // browser nor types and falls through to import (full barrel, unchanged).
    expect(Object.keys(dot)).toEqual(['browser', 'types', 'import']);
    expect(dot.browser).toEqual({ types: './dist/index.browser.d.ts', default: './dist/index.browser.js' });
    expect(dot.types).toBe('./dist/index.d.ts');
    expect(dot.import).toBe('./dist/index.js');
    // `default` (not a browser-only condition) on the subpath is deliberate:
    // the barrel is browser-SAFE, not browser-only — it loads under Node too.
    const browserSubpath = pkg.exports['./browser'];
    expect(browserSubpath).toEqual({ types: './dist/index.browser.d.ts', default: './dist/index.browser.js' });
    // Order is semantic in the nested condition maps too — types must precede
    // default so TS resolves .d.ts before falling back to adjacent-file lookup
    // (toEqual above is key-order-insensitive; these Object.keys pins are not).
    expect(Object.keys(dot.browser as Record<string, unknown>)).toEqual(['types', 'default']);
    expect(Object.keys(browserSubpath as Record<string, unknown>)).toEqual(['types', 'default']);
    // Legacy top-level fields stay on the full barrel for node consumers.
    expect(pkg.main).toBe('./dist/index.js');
    expect(pkg.types).toBe('./dist/index.d.ts');
  });
});
