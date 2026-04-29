# AI Final Form Plan

Review date: 2026-04-11

Status: DONE

## Goal

Finish the engine's AI-native core boundary so a text-based agent can operate it through stable, machine-readable contracts without inventing its own wrapper semantics.

The engine is already AI-first in practice. The remaining work is to make that surface explicit, versioned, and easier to compare across iterations.

## Scope

1. Add explicit AI contract version exports and embed schema markers in the main machine-facing result shapes.
2. Strengthen built-in diagnostics with budget-aware performance issues and clearer last-tick command context.
3. Add a history range summary helper so agents can answer "what changed between tick A and tick B?" without custom analysis code.
4. Update the AI, debugging, scenario, protocol, and API docs to describe the stabilized final-form surface.

## Out of Scope

- MCP server implementation inside the engine repo
- Game-specific rules, renderers, or UI
- Long-term replay persistence beyond the existing short-horizon recorder

## Planned Work

- [x] Add exported AI contract version constants and a version-report helper.
- [x] Add `schemaVersion` markers to structured command outcomes, debugger snapshots, history state, and scenario results.
- [x] Add transport protocol version markers to `ClientAdapter` server messages.
- [x] Extend `WorldMetrics` with simulation budget and last-tick command stats.
- [x] Add a `tick-budget-exceeded` debugger issue with slow-system context.
- [x] Add a history range summary helper that aggregates command outcomes, diff changes, events, and issues across a tick range.
- [x] Cover the new contract and diagnostic surfaces with tests.
- [x] Update docs and examples to reflect the stabilized AI-native interface.

## Landed Files

- `src/ai-contract.ts`
- `src/world.ts`
- `src/world-debugger.ts`
- `src/history-recorder.ts`
- `src/scenario-runner.ts`
- `src/client-adapter.ts`
- `tests/world.test.ts`
- `tests/world-commands.test.ts`
- `tests/world-debugger.test.ts`
- `tests/history-recorder.test.ts`
- `tests/scenario-runner.test.ts`
- `tests/client-adapter.test.ts`
- `docs/guides/ai-integration.md`
- `docs/guides/client-protocol.md`
- `docs/guides/commands-and-events.md`
- `docs/guides/debugging.md`
- `docs/guides/scenario-runner.md`
- `docs/tutorials/getting-started.md`
- `docs/api-reference.md`
- `README.md`

## Verification

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run lint`
- `npm.cmd run build`
