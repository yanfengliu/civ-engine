# Pre-1.0 full-codebase review — iteration 1 (owner-requested release gate)

**Scope:** entire tree at v0.8.24 (HEAD 7252460 + CI-actions bump f3a52bc). **Reviewer pool per the unreachable-CLI protocol:** Codex quota-exhausted until 2026-07-10; the Claude CLI session-limited mid-batch (two parallel max-effort full-codebase reads exhausted the fresh window) — completed lenses ran as independent Gemini (3.1-pro plan) instances. Post-batch contamination audits run after every batch: working tree clean each time.

## Lens status

| Lens | Instance | Status |
|---|---|---|
| Architecture / 1.0-readiness | Gemini | COMPLETE |
| Tests / documentation accuracy | Gemini | COMPLETE |
| Clean code / efficiency / memory / security | Gemini | COMPLETE |
| Correctness / bugs (new-code weighted) | Gemini ×3 attempts | FAILED (empty output ×2; one run burned on a policy-BLOCKED write_file attempt — plan-mode write-blocking confirmed active but per-tool/path variant, consistent with the 2026-06-11 lesson) — **re-runs with Claude at window reset; 1.0 remains gated on this lens** |

## Verdicts (completed lenses)

- **Architecture:** layer-chain boundaries CLEAN (no internal leaked into the 106-export surface); API coherence CLEAN incl. the tri-family error story and sync/async split; ARCHITECTURE.md accurate; determinism contract items 1–10 coherent. "Is this surface ready to freeze? Yes."
- **Tests/docs:** suite pins contracts (LOC ratchet, surface pin, error families, manifest); docs for v0.8.17–0.8.24 accurate; ready to freeze once the approved trims land.
- **Clean/perf/security:** FileSink path hardening + JSON discipline verified CLEAN; no leak-prone listener registries found beyond the parity nit below.

## Findings and dispositions

| ID | Sev (as filed) | Finding | Disposition |
|---|---|---|---|
| tests-1 / clean-1..3 | MEDIUM/BLOCKER | Approved 1.0 decisions not yet landed (trims, strict flip, snapshot v6) | **NOT A FINDING** — sequencing misread by both instances: those decisions are deliberately gated to the 1.0 work this review precedes (v1-checklist). Later lens prompts carried an explicit sequencing note; dispositions recorded so iteration 2 does not re-flag |
| tests-2 | LOW | api-reference still documents the to-be-trimmed exports | Folded into the 1.0 work's doc step (the trim's own checklist) |
| arch-1 | LOW | Constructor-shape inconsistency: spatial utilities take positional `(width, height)`; Layer/WorldConfig take options objects. 1.0 is the last free chance to unify | **Escalated to the owner as v1-checklist item 8** (recommend bless positional for pure-grid primitives; migrating four constructors is breaking-for-cosmetics) |
| arch-2 | LOW | `VisibilityMap` lacks `getMetrics()/resetMetrics()` parity with OccupancyGrid | Carried to the post-1.0 roadmap (additive, any 1.x) |
| clean-4 | MEDIUM | `session-recorder.ts` sits exactly at the 500-LOC cap — zero headroom for 1.x stability fixes | Fold a small extraction into the 1.0 work |
| clean-5 | LOW | `offDestroy` uses O(N) indexOf/splice; other registries use Sets | Carried to the roadmap small-items list |
| clean-6 | MEDIUM | Query-cache membership maintenance O(N) removal per signature change under churn | Known measured wall (benchmark-gated since v0.8.17); independently re-derived — named as Track A's first optimization candidate in the post-1.0 roadmap, demand-gated |

## Disposition

No blocking findings in the three completed lenses; two LOWs escalated/carried, one MEDIUM folded into the 1.0 work. **Iteration 2 = the correctness lens on Claude (window reset) + convergence pass; the 1.0 declaration stays gated on it.**
