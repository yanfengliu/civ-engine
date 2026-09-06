# v1-surface — design review, iteration 1

**Reviewed:** DESIGN.md v1. **Reviewers:** two independent Gemini (3.1-pro plan) instances per the quota protocol (Codex exhausted until 2026-07-10; Claude CLI session-limited): lens A = senior API-design, lens B = adversarial release-engineering. Driver pre-verification (per the verify-reviewer-claims rule) independently confirmed the two sharpest findings before the reviews returned.

## Verdicts

| Lens | Verdict | Substantive findings |
|---|---|---|
| A (API design) | CONVERGED | 1 gap (type surface ungated), 4 freeze-list omissions |
| B (release engineering) | NOT CONVERGED | 5 real implementation-layer risks |

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| B1 / A-gap | MAJOR | Runtime-names pin cannot see type-only exports or barrel-chain symbol loss (world.ts / occupancy-grid.ts re-export chains; `SYSTEM_PHASES`, `SubcellPlacement` cited); side-effect import `./session-internals.js` must be preserved explicitly | FIXED in v2 — two-level pin (runtime names + ALL `dist/index.d.ts` exported names, reading dist so the full re-export closure is visible); side-effect import called out with the existing session suite as behavioral backstop; `export type` hygiene adopted |
| B2 (+ driver pre-verification) | MEDIUM | §2 said "subclass constructors already receive it" — false; `SessionRecordingError` is `(message, details?)` and the code lives only inside the details bag, and not every site carries one | FIXED in v2 — extraction-based mirror `readonly code: string \| null` (null fallback, no invented sentinel); construction asymmetry documented as permanent (read-side unification only) |
| B3 (+ driver pre-verification) | MAJOR | §5 "breaking-lite" classification wrong: `applySnapshot` explicitly clears poison and replay tooling relies on clean restores — naive restore changes the openAt contract | FIXED in v2 — reclassified: v6 carries poison for inspection; clearing stays default; `{ restorePoison: true }` opt-in for fidelity tooling |
| B4 | MAJOR | Strict-default trap: legacy snapshots carry `strict: undefined`, which a flipped default would silently promote to strict-on-load, breaking old replays | FIXED in v2 — snapshot-compatibility clause added to the §4 recommendation (absent strict deserializes as false, snapshot-versioned) |
| B5 | MEDIUM | Pin test oversold: names-equality gates neither signatures nor type shapes | FIXED in v2 — anti-oversell paragraph states exactly what is and is not gated; 1.0 checklist gains a human d.ts diff review step |
| B6 | LOW | `clearRunningState` is a guide-documented escape hatch — cutting it is a documented-API break | FIXED in v2 — reclassified to bless-by-default in the §6 menu |
| A omissions | LOW | Freeze list should declare Node>=20 floor, ESM-only, zero-runtime-deps as policy, export-type hygiene | FIXED in v2 — §7 freeze list added |
| A count | nit | 24 star-exports → actually 25 | FIXED in v2 |

## Disposition

All findings folded into v2. The non-breaking implementation (curation + pin test + error mirror + policy docs + checklist) proceeds; implementation review will re-verify the v2 corrections in situ.
