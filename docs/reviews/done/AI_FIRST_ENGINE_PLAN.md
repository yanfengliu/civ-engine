# AI-First Engine Plan

Review date: 2026-04-11

Status: DONE

## Goal

Make the engine easier for a text-based AI agent to use in a closed implementation-debug-iteration loop without depending on human-only tooling.

The engine already had deterministic simulation, snapshots, diffs, and structured debug output. The missing pieces were the machine-facing control and diagnosis surfaces around command submission, issue reporting, and short-horizon history.

## Scope

This plan focuses on engine-native machine interfaces and their documentation:

1. Structured command submission outcomes in core `World` APIs
2. Structured command transport outcomes in `ClientAdapter`
3. Machine-readable debug issues in `WorldDebugger`
4. A ring-buffered history recorder for recent command outcomes and tick traces
5. Documentation for AI-facing usage patterns and recovery loops

## Done

- [x] Add `world.submitWithResult()` with stable outcome codes, messages, and JSON-compatible details.
- [x] Keep `world.submit()` as a boolean compatibility wrapper over the structured result API.
- [x] Allow validators to return structured rejection objects instead of only `boolean`.
- [x] Add command-result listeners so external tooling can observe accepted and rejected submissions.
- [x] Add `WorldHistoryRecorder` for recent command outcomes and tick history with optional debug payload capture.
- [x] Add `runScenario()` so setup, stepping, assertions, and recorder output can be executed through one headless harness.
- [x] Add machine-readable `issues` to `WorldDebugger` while preserving the older `warnings` field for compatibility.
- [x] Extend `ClientAdapter` to emit structured command outcome messages, including positive acknowledgement for accepted commands.
- [x] Document the AI-facing APIs and the recommended closed-loop workflow.
- [x] Add tests covering structured command outcomes, transport integration, debugger issues, and history recording.

## Design Notes

- The engine remains the source of truth. MCP or other wrappers can expose these APIs later, but the semantics must live in the engine first.
- The structured outcomes use stable codes such as `accepted`, `validation_failed`, and `missing_handler`.
- Debug payloads remain JSON-compatible so they work over transports, workers, tests, and future MCP adapters without translation layers.
- The history recorder is intentionally short-horizon and in-memory. It is for fast diagnosis, not long-term persistence or replay storage.
- The scenario runner resets recorded history after setup so the baseline snapshot reflects the prepared scenario state.

## Follow-up Candidates

- Add richer built-in issue codes for common RTS failures such as blocked move targets or stale selection refs.
- Add diff/tick comparison helpers on top of the history recorder.
- Add a thin MCP adapter only after the engine-native schemas settle.
