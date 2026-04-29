# AI Runtime Feedback Plan

Review date: 2026-04-11

Status: DONE

## Goal

Close the remaining runtime feedback gaps so an AI agent can observe command execution, runtime failures, and tick-level breakdowns through stable, machine-readable engine surfaces.

## Scope

1. Add command execution results after handlers run, not just queue-time submission results.
2. Add structured tick failure results and non-throwing tick stepping for AI-facing loops.
3. Surface runtime failures through debugger snapshots, history recording, and transport messages.
4. Update docs so the runtime feedback contract is explicit.

## Planned Work

- [x] Add `CommandExecutionResult`, execution listeners, and queue metadata linking execution back to submission sequence.
- [x] Add `TickFailure`, `WorldStepResult`, `WorldTickFailureError`, and `world.stepWithResult()`.
- [x] Emit runtime failures for command, system, resource, diff, and listener phases.
- [x] Extend `WorldDebugger` to expose last tick failure and convert it into machine-readable error issues.
- [x] Extend `WorldHistoryRecorder` and `summarizeWorldHistoryRange()` to capture execution results and tick failures.
- [x] Extend `ClientAdapter` with `commandExecuted`, `commandFailed`, and `tickFailed` messages.
- [x] Update scenario runner, guides, API reference, changelog, and docs index.
- [x] Add tests for execution results, structured tick failures, debugger/runtime integration, and client protocol streaming.
