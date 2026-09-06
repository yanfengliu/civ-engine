# Full-codebase review — 2026-07-10, iteration 2 (adversarial verification of the iter-1 fixes)

**Reviewers:** 2 independent in-process adversarial verifiers (Opus 4.8), each instructed to try to REFUTE the iter-1 fixes against live code (grep symbols/call sites, runtime repro where useful) — not to trust the diff's comments. Considered iter-1 `REVIEW.md` + the working-tree diff. (CLIs still quota-down; retry next full review.)

## Verdict: CONVERGED after one real catch

- **verify-low (LOC refactor + all LOW fixes): SOLID, no issues.** Verified the `assertContiguousTickEntries` and `validateBundleMarkers` extractions are behaviorally identical to their former inline forms (same guards, same error codes/details, same `result.ok` flips, `this` preserved via the arrow closure), both new modules browser-safe, no dangling refs (`execListener` cleanup intact), and each LOW fix correct + regression-pinned. 208 targeted tests + tsc green.
- **verify-high (H1 + M1): H1 SOLID; M1 ISSUE-FOUND → fixed this iteration.**

### H1 (command payload isolation): SOLID
Both defects closed (queue clone == recording clone within one synchronous submit; sole `commandQueue.push` path; no sequence consumed on a non-JSON throw; behavior change documented). One **theoretical NIT, not patched**: the recorder re-clones `data` *after* `original()` fires command-result listeners, so a command-result listener holding an external closure ref to the submitted object could mutate it in the narrow window between the queue clone and the recording clone. Command-result listeners receive the *result*, not `data`, so this requires a contrived external-aliasing setup; it is strictly narrower than the pre-fix bug and astronomically unlikely. Acknowledged as an accepted edge (documented, not patched) rather than adding recorder complexity for a non-reachable-in-practice case.

### M1 (scenario truncation): real bug found and fixed
**Root cause:** the iter-1 truncation-tracking wiring was incomplete. The `replace_all` that routed `pushBounded(this.…)` through the `_truncated`-setting `_pushBounded` helper matched only the **single-line** call in `recordTick` (tickEntries); the four **multi-line** calls (`recordedCommandEntries`, `commandEntries`, `executionEntries`, `failureEntries`) kept the raw `pushBounded` and never set `_truncated`. So **command-only eviction was invisible to `getState().truncated`**, and the adapter guard did not fire → `scenarioResultToBundle` still built a "replayable" bundle with a complete `ticks` stream but a gapped `commands` stream; `openAt`'s tick-entry continuity guard passed → silently wrong state. verify-high reproduced it at runtime (20 ticks, `commandCapacity: 5`: `truncated` undefined, no throw, `openAt(10)` silently wrong). The iter-1 test only exercised tick-entry eviction, so it passed anyway — a coverage gap.

**Fix:** routed all four multi-line record calls through `this._pushBounded` (history-recorder.ts), so every bounded stream feeds `_truncated`. Added `tests/replay-truncation-guard.test.ts` command-only case (high `capacity`, low `commandCapacity`) asserting `result.history.truncated === true` and `scenarioResultToBundle` throwing `history_truncated` — fails pre-fix, passes post-fix. Full suite 1344 + 1 todo, tsc/lint/build green.

### Other M1 sub-questions (verify-high, all clean)
No false-positive on healthy bundles (diff listener records every successful tick → contiguous entries; empty-range no-ops); failed-ticks guard runs before the continuity guard in both `openAt` and `snapshotAtTick`; the `snapshotAtTick` refactor is behavior-preserving (base selection + range + code unchanged; only the message string changed, no test pins it); `pushBounded` return-value change is correct and non-recursive; the adapter never over-throws and correctly exempts diagnostic (no-payload) bundles.

## Disposition

iter-1 correctness/regression findings: all SOLID. iter-2 caught one real completeness bug in the M1 fix (command-stream truncation untracked) — fixed + test-pinned in the same batch. H1's theoretical listener-window NIT accepted as documented, not patched. No outstanding correctness issue. **H2 (fixed/regressed honesty gate) remains an owner-ruling item — not a code defect.** Ready to ship v2.3.0.
