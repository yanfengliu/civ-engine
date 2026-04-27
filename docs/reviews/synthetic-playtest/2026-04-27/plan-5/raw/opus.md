V5 verified against iter-4 findings:

**Codex HIGH (CommandExecutionResult.sequence doesn't exist):** Fixed. T2 step 9 line 1215 and T3 step 2 line 1458 both use `expect(r1.bundle.executions).toEqual(r2.bundle.executions)` — whole-array deep-equality, no schema assumption. Confirmed against `world.ts:145-156` (only `submissionSequence`, `executed`, `commandType`, `code`, `message`, `details`, `tick`).

**Codex MED (dual-run partial coverage):** Fixed. Both dual-run blocks now deep-equal commands, executions, ticks, initialSnapshot, snapshots, failures, plus metadata-minus-{sessionId,recordedAt} via destructure-rest. The strip pattern correctly targets the two volatile fields (`session-bundle.ts:84,87`) and future-proofs: any new `SessionMetadata` field (including v0.8.0's `policySeed`) is compared automatically.

Sanity checks:
- Line 1162's `bundle.commands[0].sequence` is valid — `RecordedCommand.sequence` exists at `session-bundle.ts:43` (distinct from `CommandExecutionResult`).
- T3 step 2's `PolicyContext` is imported (line 1385).
- No remaining `.executions[].sequence` cherry-picks.

ACCEPT.
