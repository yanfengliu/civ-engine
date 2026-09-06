# Review - 2026-07-07 Iteration 3

## Scope

civ-engine v1.5.0: visual playtest runner hardening (opt-in budgets/abort/agent-boundary redaction/failure policy), typed observation `tick`, multimodal prompt parts, prompt module split, docs, and version bump. Task 4 of this thread's PLAN.md.

## Reviewers

Four independent reviewers on the staged diff, per the AGENTS.md multi-CLI escalation for agent-loop code: Codex CLI (`gpt-5.5`, xhigh, read-only sandbox), Claude CLI (`opus[1m]`, max effort, with Read/Grep grounding), and two in-process adversarial subagents (runtime-correctness lens with live repros against the built `dist/`; docs/coverage lens with gate re-execution).

## Findings

- **HIGH (Codex + Claude + in-process correctness, independently) - `agentObservation: 'redacted'` leaked hidden state through `decide()`'s `trace` argument.** Trace entries are redacted at the value level, not the audience level, so a step-1 agent could read step-0 reviewer/traceOnly channels — and with `traceObservation: 'full'`, sensitive values and screenshot data URLs. Confirmed with a live repro against the built engine. Fixed: the loop now maintains an agent-facing trace whose entry observations (including nested action-result observations) pass through `observationForAgent`; the returned `result.trace` stays under `traceObservation` control. Pinned by two multi-step tests in `tests/visual-playtest-redaction-wall.test.ts`.
- **MEDIUM (in-process correctness) - abort during `decide` still invoked `host.annotate`, and an annotate throw masked the abort as `hostError`.** Fixed: the signal is checked immediately after `decide` returns — findings are collected, `annotate` is skipped (the host may be tearing down), and the result reports `aborted` with the `AbortError` shape. Pinned by a test where annotate throws `browser already closed`.
- **MEDIUM (Codex) vs by-design (Claude) - no checkpoint after the final action, so a budget breach or abort landing there exits via the natural `maxSteps` stop.** Reviewers disagreed; resolved in favor of the documented contract (checks run between awaits; a completed run reports its natural stop) — changing it would relabel fully-completed runs as `budgetExceeded`/`aborted`. The edge is now explicit in the API reference. A related real gap Codex implied was fixed: a post-`observe` checkpoint was added so a breach during a slow screenshot no longer pays a full LLM `decide` before stopping.
- **LOW (Codex) - default runs performed an observable `Date.now()` read.** Fixed: the clock is only read when a wall-clock budget is set; pinned by a test whose `now` throws.
- **LOW (Claude + in-process correctness) - `maxActionsPerStep` silently truncated a trailing `stop` action,** turning an explicit agent stop into another paid observe/decide cycle. Fixed: a `stop` in the truncated tail is honored after the executed prefix completes cleanly; pinned.
- **LOW (in-process correctness) - `budget.maxActionFailures` was silently dead under the default `onActionFailure: 'abort'`.** Fixed: the pairing is now validated (`visual_playtest_config_invalid`); pinned.
- **LOW (in-process correctness) - unpinned semantics.** Fixed with new tests: strict-greater budget boundary, abort priority over budget, synthetic `previousActionResult` after a thrown action, thrown failures counting toward the cap.
- **MEDIUM (in-process docs) - documented decision-retention contract for `maxActionsPerStep` and the prompt-parts/string parity claim had no pinning tests.** Fixed: decision-retention assert added to the caps test; a parity test asserts text parts equal the string prompt minus the screenshot line.
- **NIT (in-process correctness) - sourceless screenshots produced an empty image part.** Fixed: the parts builder falls back to the text descriptor when a screenshot has neither `path` nor `dataUrl`.
- **LOW/NIT (in-process docs) - assorted doc drift.** Fixed: stale "public simulation tick" audience-table example, quick-start stop list, `observationForAgent` default-mode clause + metadata caveat, validation-claim precision, README `VisualPlaytestPromptPart` mention, fixture-count convention, misleading budget-test name, stray `scratch-gate.log` removed.

Clean per the correctness reviewer: default-path behavior verified semantically identical to v1.4.0 line-by-line (stepsRun at every stop, trace shapes, error shapes, prompt bytes when `tick` absent); current-observation redaction, checkpoint stepsRun semantics, abort error shapes, continue-mode bookkeeping, and validation edges all confirmed.

## Disposition

All findings fixed in this iteration except the final-action checkpoint edge, resolved as documented-by-design (recorded above with both positions). Gates re-run green after fixes.

## Verification

- `npx.cmd vitest run tests/visual-playtest-hardening.test.ts tests/visual-playtest-redaction-wall.test.ts tests/visual-playtest.test.ts` — 39 passed (post-reshuffle: 28 new-file tests + 11 pre-existing, untouched).
- Full gates green after all fixes: `npm.cmd test` (1282 passed + 1 todo, 81 files), `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`.
- RED evidence for the review fixes: the correctness reviewer's live repros against the pre-fix build (trace leak, annotate-after-abort) plus Codex's cited line-level traces; the initial feature suite was failing-first (16/17 RED before implementation).
