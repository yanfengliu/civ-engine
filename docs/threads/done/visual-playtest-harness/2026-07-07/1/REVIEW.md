# Review: Visual Playtest Harness

## Reviewers

- Codex CLI: unavailable. The PowerShell wrapper was blocked locally; rerunning via `codex.cmd` with network access was rejected because it would upload the private workspace diff without explicit user approval.
- Claude CLI: unavailable. The sandboxed run returned `API Error: Unable to connect to API (ConnectionRefused)`.
- Local adversarial review: completed against the live diff, docs, tests, and public surface.

## Findings

- **MEDIUM - nested action-result observations bypassed safe trace redaction.** `runVisualPlaytestLoop` redacted `trace[].observation` but stored `trace[].result.observation` verbatim when a host returned a follow-up observation from `performAction`. That could leak screenshot data URLs or sensitive state into a safe trace. Fixed by redacting only the trace copy while preserving the raw `previousActionResult` passed back to the host; pinned by `tests/visual-playtest.test.ts`.
- **MEDIUM - explicit full trace capture still redacted the primary observation.** `traceObservation: 'full'` preserved nested action-result observations after the first fix, but the primary `trace[].observation` path still called the default redacting clone. Fixed so explicit full capture includes screenshot data URLs and hidden-state values on both trace observation paths; pinned by `tests/visual-playtest.test.ts`.
- **LOW - `VisualPlaytestStateChannel.redaction` had underspecified behavior.** The type exposed `redaction: 'value' | 'channel' | 'none'`, but implementation only meaningfully handled sensitive channels. Fixed so `value` redacts values, `channel` omits channels from safe traces/prompts, and `none` keeps values even when sensitive; documented in the guide and API reference.
- **PROCESS - external multi-CLI review could not run safely in this environment.** The required external transfer was blocked by policy; this review records that limitation rather than silently treating the review as complete.

## Verification

- `npm test -- tests/visual-playtest.test.ts`
- `npm test -- tests/loc-budget.test.ts tests/engine-error.test.ts tests/public-surface.test.ts`
- `npm run typecheck`
- `npm run lint`
- Full gates were rerun after fixes: `npm test` (1249 passed + 1 todo), `npm run typecheck`, `npm run lint`, and `npm run build`.

## Disposition

Real local findings were fixed. External CLI review remains unavailable without explicit approval to send the diff to external services.
