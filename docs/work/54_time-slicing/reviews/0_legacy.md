# time-slicing — deliverables review, iteration 1 (docs transcription)

**Reviewed:** the combined docs-only diff (guide section, determinism-contract item 10, roadmap Post-1.0 + Spec 10 row, changelog 0.8.21) — shared round with the lockstep objective's roadmap parts. **Reviewers:** two independent Gemini (3.1-pro plan) instances per the quota protocol (Codex exhausted until 2026-07-10; Claude CLI session-limited): lens A = technical accuracy against the live codebase, lens B = documentation/teaching quality.

## Verdicts

**BOTH CONVERGED.**

- Lens A verified: the worked cursor-in-component example compiles against the real World API (signatures grepped); PathRequestQueue claims (private pending/head/nextId, monotonic nextId not reset by clearPending, FIFO count semantics); openAt/forkAt/selfCheck nearest-snapshot anchoring; `serialize()` → `assertJsonCompatible` → `json_incompatible` on non-plain prototypes; contract items 1–9 exist as cited and item 10 extends them; DESIGN v3 ↔ guide/roadmap text consistency; version numbering (Spec 10 v0.8.21 / Spec 11 v0.8.22) consistent with changelog and version.ts.
- Lens B verified: error model taught correctly; item 10's cache-exemption rule ("results identical with or without the cache" vs "changes WHEN effects land") crisp enough to apply; roadmap triggers and work lists unambiguous; no contradiction with surrounding guides.

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| Lens A note 6 | — | Roadmap/changelog reference `docs/threads/done/...` while threads still sit under `current/` | As planned — threads relocate to done/ in the ship commits (this commit for time-slicing) |

## Disposition

Objective complete: reviewed design (2 iterations) + transcribed deliverables (this round). Ship as v0.8.21.
