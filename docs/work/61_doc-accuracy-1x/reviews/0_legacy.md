# Doc-accuracy pass (v1.1.1) — multi-CLI review, iteration 1

**Diff:** doc-only + `ENGINE_VERSION`/version bump (1.1.0 → 1.1.1), 246-line diff across README, api-reference, the architecture trio, concepts, roadmap, rts-primitives, changelog, devlog.
**Reviewers:** Codex (gpt-5.5, xhigh) + Claude (opus[1m], max). **Gemini unreachable** — persistent `ERR_SSL_SSLV3_ALERT_BAD_RECORD_MAC` on the streaming endpoint, retried once per protocol, failed again; proceeded with two converging reviewers.
**Prompt:** codebase-grounding directive (verify every changed doc claim against live source, not diff text).

## Findings & disposition

| # | Sev | Reviewer | Finding | Disposition |
|---|-----|----------|---------|-------------|
| 1 | HIGH | Claude | **Tick-lifecycle fix was incomplete.** The reorder (increment before notify) landed in concepts.md + ARCHITECTURE.md but TWO more *current* copies still showed the old order: `api-reference.md:1476-1477` (the `step()` method docs — itself edited by this diff) and `systems-and-simulation.md:86-87`. The diff thus introduced a four-way contradiction on the point it claimed to fix; changelog/devlog said "corrected in both" (an undercount). | **FIXED.** Grepped all current docs for the lifecycle; reordered both flagged copies. `getting-started.md:31` is an abbreviated flow (stops at `tick++`, no listener step) — correctly left. Historical copies under `superpowers/` and `threads/done/` left as intentional context. Changelog/devlog wording corrected. |
| 2 | MEDIUM | Codex | **`snapshotAtTick` overclaimed** as "any in-range tick" in concepts.md:227 — it throws `replay_across_failure` for ticks at/after a recorded failure (`session-bundle-diff.ts:376-381`; api-reference already documents the caveat). | **FIXED.** Qualified: "an in-range tick … it refuses ticks that would cross a recorded failure." |
| 3 | MEDIUM | Codex | **Lockfile stale after the version bump** — `package-lock.json` still recorded 1.1.0. | **FIXED.** `npm install --package-lock-only`; diff is version-only (1.1.0→1.1.1), no dep-tree churn. `mcp/package-lock.json` parent `file:..` ref (1.0.2) left as pre-existing cosmetic drift — npm resolves `file:` deps by path, not the recorded version. |
| 4 | LOW | Claude | **Changelog mis-anchored the explicit-sync migration to v0.8.17** — the scan-metric removal was v0.5.0; v0.8.17 only stopped the benchmark renderer emitting the dead field. | **FIXED.** Reworded: "field that v0.8.17 stopped emitting (the underlying scan metrics were removed back in v0.5.0)." |
| 5 | LOW | Codex | **Validation status internally inconsistent** — changelog/summary claimed review complete while the detailed devlog kept `Reviews/Result` placeholders. | **FIXED.** Placeholders filled with the actual outcomes; changelog Validation corrected to name the two reachable reviewers + the runtime/dev audit split (no false "Gemini" or "0 high" claims). |
| 6 | LOW | Codex | **Devlog filename date range stale** — `2026-06-09_2026-06-11.md` held 06-12 and a new 06-13 entry. | **FIXED.** `git mv` → `2026-06-09_2026-06-13.md`. |
| 7 | NIT | Claude | `query.membershipChecks` labelled "the churn-scenario tier-1 counter" — it is reported in both standard and churn scenarios. | **FIXED.** Softened to "a tier-1 exact counter, stressed hardest by the churn scenario." |
| 8 | minor | Claude | ADR 49 called `snapshotAtTick` "the previously module-private `hydrateAtTick`"; `hydrateAtTick` still exists privately and `snapshotAtTick` *wraps* it. | **FIXED.** Reworded to "wrapping the still-module-private `hydrateAtTick` with range/failure-crossing guards." |

## Verified accurate by both reviewers (no action)

Tick-ordering claim true (`world-tick.ts:101/190/200-202`, `game-loop.ts:48`); `getAiContractVersions()` 9 fields + `SYSTEM_PHASES` (`ai-contract.ts`, `world-internal.ts`); MCP claims — 14 tools, read-only, never constructs World, never writes files (stdio), private 0.1.0, sole SDK owner, core zero runtime-deps (`mcp/`); benchmark fields `spatial.explicitSyncs` + `query.membershipChecks` real and "Spatial sync scan counts" gone; `VisibilityMap.getMetrics()/resetMetrics()` fields; README MCP version + all three roadmap shipped-items; no broken cross-references.

## Out-of-scope finding surfaced (flagged, not fixed here)

The lockfile sync surfaced **5 pre-existing HIGH dev-tree advisories** (esbuild 0.17–0.28 via vite via vitest; `GHSA-gv7w-rqvm-qjhr`, `GHSA-g7r4-m6w7-qqqr`). Runtime audit (`--omit=dev`) is **0** — the shipped package is unaffected. The fix requires a breaking **vitest 3→4** upgrade, which needs its own suite validation + review; it predates this change and does not belong in a doc-accuracy pass. **Follow-up objective recommended.**

## Convergence

Iteration 1 reached substantive convergence: one HIGH (incompleteness, not a wrong claim) + correctness nits, all fixed; both reviewers independently confirmed the underlying engine facts. No second iteration needed — remaining items were nits, and the HIGH's fix is mechanical (verified by re-grep). Re-review folded into the devlog per convention.
