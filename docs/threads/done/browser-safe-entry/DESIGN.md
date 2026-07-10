# Browser-safe package entry (dual barrel)

## Problem

The package barrel `src/index.ts` mixes node-only exports with browser-safe ones: `FileSink` (`session-file-sink.ts`, module-scope `node:fs`/`node:path`) and `BundleCorpus` (`bundle-corpus.ts`, module-scope `node:fs`/`node:path`, plus `bundle-corpus-manifest.ts`). Browser apps that consume the package as a symlinked `file:` dependency die at boot when the barrel is served un-prebundled, because the `node:path` named import throws inside Vite's browser-external stub at module evaluation — even though the app never uses the node-only exports. Townscaper hit this live (two `run-failed` recursive-pass manifests, 2026-07-10; lesson in `townscaper/docs/learning/lessons.md` "2026-07-09 — Dev-only module graphs can make boots flaky") and worked around it with `optimizeDeps.include: ['civ-engine']` (commit b09389f). aoe2 carries `node:fs`/`node:path` Vite alias shims for the same reason — its vite.config comment states aoe2 does not use `FileSink`/`BundleCorpus` at runtime; the shims exist only because the barrel drags the modules into the graph. The townscaper lesson filed the fleet follow-up: the real fix belongs in the engine.

## Decision

Ship a second curated barrel, `src/index.browser.ts`, containing every public export except the two node-only runtime names, and expose it two ways in the `exports` map:

1. A `browser` condition on the main `"."` entry, ordered before `types`/`import`. Bundlers that resolve with the browser condition (Vite dev + build, esbuild `platform: 'browser'`, webpack) transparently get the browser-safe barrel with zero import churn in consumer repos; Node ignores the condition and keeps resolving `./dist/index.js` (full barrel), so aoe2 scripts and scenario runners are untouched.
2. An explicit `./browser` subpath (`civ-engine/browser`) with `types` + `default` conditions, for consumers or tooling that do not apply the browser condition. `default` (not a browser-only condition) is deliberate: the barrel is browser-SAFE, not browser-only — it loads fine under Node too.

Condition ordering on `"."` is `browser`, `types`, `import` — order is semantic in exports maps. Node's condition set has no `browser`/`types`, so it matches `import`; Vite matches `browser` first and takes its nested `default`; TS under node16 resolution skips `browser` and matches top-level `types` (full surface); TS under bundler resolution with `customConditions: ['browser']` gets the nested browser `types` (exact browser surface). A browser-bundled consumer whose TS does not set the custom condition typechecks against the full surface while runtime serves the subset — that mismatch only bites if the app actually imports `FileSink`/`BundleCorpus` into browser code, where a missing-export error at build/boot is the honest failure (before this change the whole app died at boot without importing them at all).

### Node-only set

Exactly two runtime names: `FileSink` and `BundleCorpus`. `CorpusIndexError` and all 11 corpus types live in `bundle-corpus-types.ts`, whose only runtime import is `session-errors.js` (browser-safe), so the browser barrel re-exports them from there — same class identity as the `bundle-corpus.js` re-export in the full barrel (pinned by test). No node-only type names exist (`session-file-sink.ts` exports only the class).

### Barrel structure: duplicate curated list, not a sanctioned star

`index.ts` stays byte-identical; `index.browser.ts` is a second explicit list. The alternative — `index.ts` = `export * from './index.browser.js'` + node-only block — was rejected because `tests/public-surface.test.ts` pins the no-star-export invariant on `index.ts` and parses its brace blocks as THE complete public name list; a sanctioned star would rewrite the repo's most load-bearing surface convention to save one file of mechanical duplication. Drift between the two lists is made impossible by tests instead (see Invariants): the runtime and declared diffs must equal exactly `['BundleCorpus', 'FileSink']`, so a name added to one barrel and not the other fails the suite with instructions.

### Invariants (pinned by `tests/browser-entry.test.ts`)

1. Browser-graph purity: a transitive module-graph walk from `src/index.browser.ts` (following runtime `import`/`export ... from`/side-effect/dynamic imports, skipping `import type`/`export type`) finds only relative specifiers — no `node:` builtins and, since the package is zero-dependency, no bare specifiers at all. Failure message includes the import chain. This is the regression check for the townscaper boot failure, without adding an esbuild devDependency to a zero-dep repo (the graph walk is the same reachability computation `esbuild --bundle --platform=browser` would do).
2. Runtime parity: `Object.keys(index) − Object.keys(index.browser) === ['BundleCorpus', 'FileSink']`, and no browser-only extras.
3. Identity: every shared runtime export is the same object in both barrels (`toBe`), including `CorpusIndexError` across its two re-export paths — the browser barrel can never fork an implementation.
4. Declared parity: the same brace-block parse the public-surface pin uses, applied to both barrels — declared-name diff (types included) is exactly `['BundleCorpus', 'FileSink']`. Catches type-only drift that runtime parity cannot see.
5. Exports-map shape: `"."` key order `['browser', 'types', 'import']`, browser condition and `./browser` subpath both pointing at `dist/index.browser.*`, top-level `main`/`types` unchanged.
6. `index.browser.ts` keeps the no-star invariant and the load-bearing `import './session-internals.js';` side-effect import (zero-runtime declaration merge, needed for identical `World` typing through either entry).

## Alternatives rejected

- `./node` entry moving `FileSink`/`BundleCorpus` out of `"."`: breaking for aoe2 scripts and every node consumer; removals must go through the deprecation policy for no gain over the additive shape.
- Lazy `import()` of node builtins inside `FileSink`/`BundleCorpus` methods: keeps one barrel but makes the sinks async or lazily-failing, still leaves the modules in every browser graph, and hides the platform boundary instead of expressing it.
- Consumer-side workarounds as the permanent answer (townscaper `optimizeDeps.include`, aoe2 alias shims): every future browser consumer rediscovers the landmine; the fleet already paid twice.
- esbuild-based smoke test: equivalent check, but adds the first devDependency whose only job duplicates a ~60-line pure-node graph walk; vitest 4 no longer ships esbuild in the tree.

## Compatibility

Node consumers: `"."` resolves exactly as before (`main`/`types`/`import` untouched); the full barrel is byte-identical. Vite consumers: resolution of `'civ-engine'` changes from `dist/index.js` to `dist/index.browser.js` — verified safe for the fleet because no sibling's browser-served code imports the node-only names (aoe2's vite.config comment states it; per-repo import inventory re-verified in this thread's review). Townscaper may drop its `optimizeDeps.include` workaround and aoe2 its `node:fs`/`node:path` alias shims at their leisure; both keep working unchanged in the meantime. Additive surface → minor bump 2.1.0 → 2.2.0.
