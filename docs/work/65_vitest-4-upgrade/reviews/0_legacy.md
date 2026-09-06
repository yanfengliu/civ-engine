# vitest 3 → 4 dev-tooling security upgrade (v1.1.2) — multi-CLI review, iteration 1

**Diff:** dev-dependency upgrade — vitest `^3` → `^4.1.8` in root + `mcp`, version 1.1.1 → 1.1.2, both lockfiles re-resolved, changelog/devlog/summary. Review fed the 114-line meaningful diff (lockfile churn excluded; reviewers inspected locks directly).
**Reviewers:** Codex (gpt-5.5 xhigh) + Claude (opus[1m] max). **Gemini unreachable** — same persistent `ERR_SSL_SSLV3_ALERT_BAD_RECORD_MAC` as the prior session; failed on launch, proceeded with two converging reviewers.
**Tooling note:** Codex captured via the new `codex exec -o <file>` flag — **1991-byte clean review vs a 193 KB polluted full log**, validating the AGENTS.md update in a real review.

## Findings & disposition

| # | Sev | Reviewer(s) | Finding | Disposition |
|---|-----|-------------|---------|-------------|
| 1 | MEDIUM (Claude) / LOW (Codex) | both, converged | **The esbuild-clearing *mechanism* was stated wrong.** changelog + devlog + summary said vitest 4 "resolves esbuild ≥ 0.28.1 (the fixed version)." False: esbuild is **absent** from both resolved trees (`npm ls esbuild` empty; no `node_modules/esbuild`). vite 8 bundles via **rolldown** and lists esbuild only as an optional peer — the advisories clear **by removal**, not by an esbuild upgrade. The *outcome* (audit 0) was correct and independently confirmed. | **FIXED** in all three surfaces (the exact cross-surface duplication trap the `eacaceb` lesson just recorded — caught here by the review). Enriched with the rolldown attribution. |

## Confirmed clean by both reviewers (no action)

- **Version consistency** — 1.1.2 across `package.json`, `src/version.ts` (`ENGINE_VERSION`), README badge, root lock top-level; mcp stays its own `0.1.0` (correct). No live surface still pins vitest 3 (the one hit is a frozen historical plan doc). The mcp `bin` reformat is cosmetic.
- **vitest 3→4 breaking changes — suite is immune (grep-verified, not assumed).** Both configs use only `test.include`/`testTimeout`; no `pool`/`environment`/`coverage`/`globals`/`setupFiles`/`snapshotFormat`/workspace config, and the tests use no fake timers, snapshots, mocks, or spies. Identical pass counts (1215+2 / 18) corroborate no silent behavior hit.
- **Node reasoning sound.** The binding constraint is actually **vite 8** (`^20.19 || >=22.12`); vitest 4's own engines are looser — the documented number is right (minor attribution nuance). Keeping the engine's `engines: >=20` is correct (it's the published zero-dep package's floor; the newer Node is a dev-tooling-only need). CI `node-version: [20, 22]` (latest patches) satisfies it.
- **No test-tooling leak** — `files` allowlist ships only dist + consumer docs; `npm pack --dry-run` is a CI backstop. **Patch level correct** — devDependency-only, zero API/behavior/engines delta; "breaking" refers to vitest's own semver, not civ-engine's.
- **Audits genuinely 0** — root full + `--omit=dev`, mcp full (Codex could re-verify only root `--omit=dev` from its sandbox; the rest run by the driver). mcp lock `file:..` parent ref now clean.
- Non-issue noted: `dist/version.d.ts` reads 1.1.1 locally but `dist/` is gitignored + rebuilt by `prepublishOnly` — never committed/published.

## Convergence

One substantive finding, both reviewers agreeing, fixed before commit; every other focus area independently confirmed accurate. No second iteration warranted.
