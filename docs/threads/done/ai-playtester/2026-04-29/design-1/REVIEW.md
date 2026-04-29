# AI Playtester — Design Iteration 1 Review (2026-04-29)

**Disposition:** Iterate (substantive). Codex CLI exec timed out / blocked by sandbox (PowerShell call rejected); Claude returned 3 majors + 4 low + 6 nits. Per AGENTS.md "If a CLI is unreachable" rule, proceeding with Claude as the substantive reviewer; Codex unreachable noted.

Reviewer: Claude (`claude-opus-4-7[1m]` max).

## Findings + dispositions

### Claude MAJOR M1 — Missing `sinkError` stop reason

`runSynthPlaytest` checks `recorder.lastError !== null` after each tick. Without this, FileSink mid-run failures silently drop writes while `world.step()` keeps succeeding — the loop burns LLM budget on a broken recording.

**v2:** added per-tick `recorder.lastError` check between `world.step()` and `stopWhen`. Sets `stopReason = 'sinkError'` and captures the error in `agentError`.

### Claude MAJOR M2 — `agent_threw` discards error context

Spec 3's `policyError` returns `{ policyIndex, tick, error: { name, message, stack } }`. v1 exposed only the stop reason.

**v2:** added `agentError?: { tick, error: { name, message, stack } }` to `AgentPlaytestResult`. Captures both `decide()` throws and `stopWhen` throws (also a behavior-driver failure mode).

### Claude MAJOR M3 — `stopReason` naming convention diverges from Spec 3

v1 used `'max_ticks' | 'predicate_stopped' | 'world_poisoned' | 'agent_threw'`. Spec 3 uses camelCase: `'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError' | 'sinkError'`.

**v2:** matched Spec 3's camelCase. `AgentStopReason = 'maxTicks' | 'stopWhen' | 'poisoned' | 'agentError' | 'sinkError'`. ADR 41 documents the alignment.

### Claude LOW L2 — No upfront poisoned-world guard

**v2:** added `if (config.world.isPoisoned()) throw` in lifecycle step 1.

### Claude LOW L1, L3, L4 + nits N1-N6

Accepted as known items. L1 (stopWhen ctx tick semantics) — runner builds a fresh ctx after step. L3 (snapshotInterval `null`) — implementation accepts `null` per type union. L4 (`bundleSummary` vs `runMetrics` overlap) — documented as intentional in DESIGN §3 (single-bundle, LLM-shaped, JSON-flat).

## Codex unreachable

Codex CLI exec terminated without output. `tmp/review-runs/ai-playtester/2026-04-29/design-1/codex.stderr.log` shows a sandbox-blocked PowerShell call. Per AGENTS.md, proceeding with the remaining reviewer (Claude). If Codex becomes reachable in iter-2, it will catch up.

## Disposition

ACCEPT after v2 fixes. Move to plan + implementation.
