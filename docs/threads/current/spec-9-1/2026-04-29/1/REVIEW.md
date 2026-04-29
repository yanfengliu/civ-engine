# Spec 9.1 — Code Review Iteration 1 (2026-04-29)

**Disposition:** Iterate (4 paragraph-level fixes). Convergent across 3 reviewers. Codex 1 HIGH + 1 MEDIUM + 1 LOW; Gemini 1 finding (overlaps Codex MEDIUM); Claude 1 MEDIUM + 1 LOW/NIT. All findings are paragraph-level — no architectural rework.

Reviewers: Codex (`gpt-5.5` xhigh), Gemini (`gemini-3.1-pro-preview` plan), Claude (`claude-opus-4-7[1m]` max).

Context: civ-engine v0.8.11 — additive `AgentDriverContext.addMarker / attach` + default-sink change to `MemorySink({ allowSidecar: true })`. PHASE 1 of the coordinated drop with aoe2 v0.1.5 annotation-ui (cross-repo ADR 9 in `aoe2/docs/threads/current/annotation-ui/DESIGN.md`).

Anti-regression checklist (verified by all 3 reviewers): all 7 implementation/test claims hold in the diff. TDD test correctness verified end-to-end. Backward compatibility verified — no shipping consumer constructs `AgentDriverContext` directly (grep over `civ-engine/src/` and `civ-engine/tests/` confirmed only the runner constructs it).

## Convergent findings

### N1 — HIGH (Codex): Oversize default-sink attachments unreachable

`runAgentPlaytest` constructs a local `MemorySink({ allowSidecar: true })` when `config.sink` is omitted. `MemorySink` stores sidecar bytes in a private `_sidecars` map; `toBundle()` returns only descriptors. Without a public path to the sink, default-sink callers who emit oversize attachments via `ctx.attach` get `bundle.attachments[i].ref = { sidecar: true }` descriptors with no public way to reach the bytes. The new test (test 2) only checked the descriptor, would pass for an unusable screenshot.

**Fix applied (iter-1):** Added `AgentPlaytestResult.source: SessionSink & SessionSource` field. Runner sets `result.source = sink` before returning. Test 2 extended with `result.source.readSidecar(emittedAttachmentId)` returning the bytes; PNG magic preserved end-to-end. Docs updated (changelog, api-reference, README, decisions ADR 42).

### N2 — MEDIUM (Codex/Gemini/Claude convergent): Canonical guide gap

`docs/guides/ai-playtester.md` is the canonical user-facing guide; AGENTS.md doc discipline mandates updates for every guide whose subject overlaps the change. Spec 9.1 changes `AgentDriver.decide(ctx)` semantics — guide was untouched in the diff. README Feature Overview row + Public Surface bullet also missing marker emission.

**Fix applied (iter-1):** New "Emitting markers and attachments from `decide` (v0.8.11)" section in the guide covering default-tick semantics (`input.tick` defaults to `world.tick`, the just-completed tick), the future-tick error code (`'6.1.tick_future'`), the default-sink change to `allowSidecar: true`, and the `result.source.readSidecar(id)` recovery loop. README rows updated.

### N3 — LOW (Codex): Future-tick test rule-code rigor

Test 3 only checked `agentError.error.name` (= `'MarkerValidationError'`) and message (regex matched literal text from `session-recorder.ts:278`). The `'6.1.tick_future'` rule code lives on `MarkerValidationError.referencesValidationRule`, but `runAgentPlaytest`'s `errorShape` flattens to `{ name, message, stack }` — drops the rule code. A regression that renamed the rule code while keeping the message would still pass.

**Fix applied (iter-1):** Added test 6 that bypasses `runAgentPlaytest` by calling `recorder.addMarker` directly, asserting `e instanceof MarkerValidationError && e.referencesValidationRule === '6.1.tick_future'`. Test 3 also gained `expect(result.bundle.markers.length).toBe(0)` to verify the recorder rejects BEFORE `writeMarker` (defensive guard against a future regression that reordered validation after the write).

### N4 — LOW/NIT (Claude): ADR row warranted

Spec 9.1 made the explicit (a)/(b)/(c) tradeoff between extending ctx, separate marker channel, and `agent.report` merge. Decisions log had no Spec 9.1 entry.

**Fix applied (iter-1):** ADR 42 added documenting the tradeoff, the default-sink-pairing rationale, the `result.source` exposure rationale, and the cross-repo coordination context (aoe2's annotation-ui ADR 9 path).

## Items considered, not flagged

- TDD test correctness — Claude end-to-end verified each assertion ties to a real contract.
- Test 2 sidecar threshold (`Uint8Array(100 * 1024)` = 102400 bytes > 64 KiB) — Gemini confirmed correct.
- `ctxAfter` spread `...ctx` carries the new closures as own enumerable properties — Claude confirmed.
- Closure scoping: `recorder` const captured from outer scope; no shadowing in try/finally.
- Backward compatibility: making `addMarker` / `attach` required is safe because no shipping consumer constructs the ctx directly.
- Default-sink change "strictly more permissive" — Codex grepped tests for `oversize_attachment`; only the new test mentions it (in a comment). No regression risk.

## Disposition

**ITERATE → iter-2 verification.** All 4 fixes applied to the same commit before merge; iter-2 verifies the fixes landed correctly.
