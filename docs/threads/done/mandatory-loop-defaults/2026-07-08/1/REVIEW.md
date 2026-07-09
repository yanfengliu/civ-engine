# Review — engine 2.0.0 mandatory loop defaults (iteration 1)

Diff: default flips for `agentObservation` ('redacted') and `assertImprovementFinding` (`requireVerificationEvidence` true), lenient marker reads, docs/changelog/ADR 58, version 2.0.0. Reviewers: Codex (gpt-5.5, xhigh, read-only sandbox) + Claude (opus[1m], max effort, read tools). Both instructed to verify claims against the live codebase.

## Findings

- **BLOCKER (Claude):** `tests/session-replayer.test.ts:202` hardcoded `'2.0.0'` as its cross-major fixture; the 2.0.0 version bump made it same-major, so the forged bundle no longer threw and `npm test` was red (1 failed / 1305) while the changelog claimed green — my gates had run BEFORE the version bump. Reviewer verified by running the suite. **Fixed:** added `crossMajorVersion()` helper (mirrors the file's existing `crossMinorVersion()` convention) so the fixture survives all future major bumps; full suite re-run green (1306 + 1 todo) AFTER the bump.
- **MEDIUM (Codex):** README public-surface bullet (line ~165) still described `assertImprovementFinding` as having "an opt-in strict verification-evidence mode" — stale current-surface documentation contradicting 2.0.0. **Fixed:** both README occurrences now read "the default since 2.0.0".
- **MINOR (Claude):** changelog's strict-enforcement list read as exhaustive but omitted `improvementFindingToVisualPlaytestFinding` (also strict via `cloneImprovementFinding`). **Fixed:** changelog now says "every path through `assertImprovementFinding`".

## Verified clean by both reviewers

Both default flips implemented correctly (`!== 'raw'` boundary; `?? true` strictness); write-strict/read-lenient split real and consistent across all internal call sites; agentTrace aliasing correct under both defaults; validation unchanged; version consistency (package.json / version.ts / badge); public-surface fixture unaffected (no surface change — major bump is for behavior); api-reference/guides/ADR 58 accurate; ADR 58 correctly supersedes rather than deletes ADR 55.

## Disposition

All three findings fixed pre-commit; full gates re-run green after every fix. Fleet pre-validation against the 2.0.0 dist: farm 135/135, townscaper 452/452 (the two repos that inherit the wall flip). Ship.
