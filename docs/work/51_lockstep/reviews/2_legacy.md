# lockstep — design review, iteration 2 (confirmation round)

**Reviewed:** DESIGN.md v2. **Reviewers:** Codex (gpt-5.5 xhigh — completed before its quota exhausted), Gemini (3.1-pro plan), Claude (fable-5 1m max).

## Verdicts

| Reviewer | Verdict | Substantive findings |
|---|---|---|
| Codex | NOT CONVERGED | 2 IMPORTANT (wording-contract precision) |
| Gemini | CONVERGED | none |
| Claude | CONVERGED | 1 MINOR (digest canonicality attribution) |

All seven design-1 adoptions verified by all three (membership epochs + empty frames, determinism wording, version envelope, session-owns-submission with FIFO substrate verified at command-queue/world-commands, digest preconditions incl. explicit freeList and the in-repo FNV-1a precedent, test-plan additions incl. the deepEqualWithPath key-order-insensitivity confirmation, strengthened rollback rejection — Claude: ground (b) is stronger than stated since SessionRecorder itself subscribes via onDiff).

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| Codex 1 | IMPORTANT | Membership off-by-one ambiguity: "effective at a named future tick" + "removes for ticks > L" + test plan's "shrinks at the declared tick" don't pick one contract | FIXED in v3 — half-open exact contract: a change with `effectiveTick = T` applies to tick T and later; a leaving player's last required InputFrame is T−1; one rule for joins and leaves; test plan aligned |
| Codex 2 / Claude nit | IMPORTANT | Version envelope overstated the precedent (replayer's Node-major handling is WARN-only) and "same Node major ⇒ same V8" is not a valid guarantee | FIXED in v3 — handshake exchanges Node full version + `process.versions.v8` exact-match; the spec OWNS the runtime check as a deliberate tightening of the warn-only precedent; opt-down to warn-only documented as at-own-risk |
| Claude MINOR | MINOR | §3 attributed component-key iteration order to the manifest check — components are checked extras-only (unordered); order is an ADR-4 factory contract. Two correct peers differing in registerComponent call order would digest-desync while diffBundles reports equivalent | FIXED in v3 — attribution corrected; `stateDigest` spec now requires canonicalizing by sorting component keys before hashing; gaps-inventory item 1 updated with the rationale |

## Disposition

CONVERGED at v3 — all three findings were wording-contract precision on an architecture all reviewers verified sound; every fix is in the design text that the roadmap entry references. Proceed to doc deliverable (roadmap entry; no engine code per gating).
