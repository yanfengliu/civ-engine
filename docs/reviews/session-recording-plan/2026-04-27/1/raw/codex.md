**Summary**

The plan is close on scope and ordering, and I did not find nonexistent existing file paths in the repo. The main problems are contract drift between T2/T5/T6/T7/T8 and several direct AGENTS-process violations that would make the 9 commits non-self-contained.

**Findings**

- **Critical** `docs/design/2026-04-27-session-recording-implementation-plan.md:577-585,653,785-889,1205-1211` vs `docs/design/2026-04-26-session-recording-and-replay-design.md:187-188,292,296`  
  The sink contract is internally inconsistent. T2’s tests expect `MemorySink.toBundle()` to work immediately after `open()` with no snapshots and to show one snapshot after a single `writeSnapshot()`, but the T2 skeleton later throws when `_snapshots.length === 0` and strips the first snapshot into `initialSnapshot` with `snapshots: this._snapshots.slice(1)`. More importantly, T2 copies metadata on `open()` (`this._metadata = { ...metadata }`), while T5 expects `disconnect()` to finalize metadata and then rely on `sink.close()` to persist it. With `close(): void` and a copied metadata object, a generic sink never sees finalized `endTick`, `durationTicks`, or `incomplete` values.

- **High** `docs/design/2026-04-27-session-recording-implementation-plan.md:996-1009,1043` vs `docs/design/2026-04-26-session-recording-and-replay-design.md:295,668`  
  The FileSink attachment policy contradicts the converged spec. The plan makes small attachments embed as `dataUrl` by default and only sidecar large blobs, but the spec says FileSink defaults to sidecar for any blob and only embeds `dataUrl` when the caller explicitly forces `{ sidecar: false }`. Reusing “MemorySinkOptions-shaped” config for FileSink is part of the same drift.

- **High** `docs/design/2026-04-27-session-recording-implementation-plan.md:1083-1163` vs `src/world.ts:299`  
  T4’s test scaffold does not compile against the current engine. The plan repeatedly uses `new World()` even though `World` requires a `WorldConfig`. The same task also includes a placeholder “mutex with SessionRecorder” test with no assertion (`...:1157-1160`), so the red step is not executable even before implementation starts.

- **High** `docs/design/2026-04-27-session-recording-implementation-plan.md:26,1250-1279,1297-1321` vs `docs/design/2026-04-26-session-recording-and-replay-design.md:555,599,654,708`  
  T6/T7 leave two spec-mandated replay paths unplanned. The plan introduces `ReplayHandlerMissingError` in T1, but T6 never allocates behavior or tests for handler drift. T7 intentionally emits `commands: result.history.recordedCommands ?? []`, but T6 never plans the required `no_replay_payloads` behavior: `openAt(tick > startTick)` should throw and `selfCheck()` should warn with `checkedSegments: 0` for diagnostic-only bundles.

- **High** `docs/design/2026-04-27-session-recording-implementation-plan.md:1342-1353` with current test shape at `tests/scenario-runner.test.ts:9,25-29,114-118,150-154,191-192`; spec context at `docs/design/2026-04-26-session-recording-and-replay-design.md:553,623,709-712,809,823`  
  T8 punts the hardest part of the CI gate. The plan uses `worldFactory: (snap) => /* construct an equivalent World */` as a placeholder, but current scenarios put the replay-relevant registrations inside per-test `setup` closures. ADR 4 explicitly says replay depends on reusable factory/setup code. The same section also mis-specifies clause 9: it says every A11.1 violation should produce `check.ok === false` plus a divergence category, but clause 9 is version/runtime compatibility, where cross-`b` should throw `BundleVersionError` and cross-Node-major only warns.

- **High** `docs/design/2026-04-27-session-recording-implementation-plan.md:13,53-64,1365-1407` vs `AGENTS.md:7,78,96-113,122`  
  The plan is not AGENTS-compliant per commit. It puts all 9 tasks on one long-lived branch, defers API/architecture/topical doc updates to T9 even though T1-T8 add public surface and a new subsystem, and schedules multi-CLI review only once on the final full diff. AGENTS requires a short-lived branch per task, doc updates in the same task that changes the API/architecture, and review before each behavior/code change is considered done.

- **Medium** `docs/design/2026-04-27-session-recording-implementation-plan.md:120,356,559,709` vs `...:939,1072,1200,1248,1295,1330`  
  The TDD workflow stops being operationalized after T2/T4. T1/T2 include explicit “run and expect failure” steps, but T3-T8 mostly jump from prose test descriptions to implementation summaries, so the red-step verification is no longer explicit. For a repo with AGENTS-mandated TDD, that is too loose for an implementation plan this large.

- **Note** Existing path claims look fine. The referenced current files (`src/world.ts`, `src/history-recorder.ts`, `src/scenario-runner.ts`, `src/serializer.ts`, `src/index.ts`, the docs targets under `docs/guides/`, `docs/api-reference.md`, `README.md`, and `docs/README.md`) are present in the repo. The issues are contract/process drift, not bad paths.

Overall assessment: **needs rework on the sink contract, the T8 replay-factory/CI-gate plan, and per-task AGENTS compliance before implementation starts.**
