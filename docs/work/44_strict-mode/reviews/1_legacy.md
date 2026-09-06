# Strict Mode — Code Review Iteration 2 (2026-04-29)

**Disposition:** Iterate (cosmetic doc-drift). Codex flagged 3 majors (all doc-drift, no code/test issues); Claude flagged 1 fail + 1 pass-with-correction (same doc-drift cluster). v3 fixes applied to the same staged diff.

Reviewers: Codex (gpt-5.5 xhigh), Claude (`claude-opus-4-7[1m]` max).

## v3 fixes folded into staged diff

### `'idle'` phase still in public docs

Codex MAJOR + Claude FAIL on Finding 5 verification. I dropped `'idle'` from the type / tests in v2 but missed three doc surfaces.

**v3:** updated `docs/api-reference.md`, `docs/guides/strict-mode.md` (both type signature AND prose), `docs/changelog.md`, and `docs/threads/current/strict-mode/DESIGN.md` (which becomes the historical record once moved to done/).

### `submitWithResult` caller-phase clarification not delivered

Claude FAIL on Finding 5 (different finding numbering). v2 promised the doc note but didn't add it to `docs/guides/strict-mode.md`. `docs/guides/systems-and-simulation.md` still claimed command-result listeners run in-tick, which contradicts how submission-time listeners actually fire.

**v3:** added a "Submit-time callbacks" subsection to `docs/guides/strict-mode.md` explaining caller-phase semantics (validators read-only; command-result listeners inherit caller phase; between-tick callers see `_inTickPhase === false`; recommended pattern is to wrap in `runMaintenance` if mutation is needed). Updated `docs/guides/systems-and-simulation.md` to drop the "command-result listeners also run in-tick" wording and point at the new strict-mode subsection.

### "Byte-identical" claim now stale after `config.strict` serialization

Codex MAJOR. v2 added `config.strict` to the snapshot config to preserve the flag through `World.deserialize`. The "byte-identical bundles" wording in changelog and current DESIGN no longer holds verbatim.

**v3:** changelog updated to "byte-identical modulo `config.strict`" with the rationale (added so `deserialize` preserves the flag). DESIGN §7 and §11 acceptance criteria similarly updated. The strict-vs-non-strict determinism-parity test 23 already strips `config.strict` before comparing.

## Iter-1 finding dispositions (per Claude verification)

| # | Finding | Status |
| --- | --- | --- |
| 1 | Codex `toBeOneOf` false positive | PASS |
| 2 | `'idle'` phase unreachable | PASS in v3 (doc surfaces fixed) |
| 3 | `World.deserialize` drops strict | PASS |
| 4 | Test coverage gaps | PASS |
| 5 | `submitWithResult` listener phase | PASS in v3 (subsection added) |
| 6 | Missing canonical guide cross-references | PASS |

## Disposition

ACCEPT after v3 doc fixes. Move to commit.
