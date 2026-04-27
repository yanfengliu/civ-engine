**Closure**

- `H3-1 Yes`, `H3-2 Partially`, `H3-3 Partially`, `H3-4 Partially`
- `M3-1 Yes`, `M3-2 Yes`, `M3-3 Yes`
- `L3-1 Yes`, `L3-2 Yes`, `L3-3 Yes`, `L3-4 Yes`, `L3-5 Yes`
- `N3-1 Yes` (deferred-by-design but now explicitly documented), `N3-2 Yes`
- `H-new-1 Yes`, `H-new-2 Yes`, `H-new-3 Partially`, `H-new-6 Yes`
- `M-new-1 Yes`, `M-new-4 Yes`
- `N1 Partially`

**Remaining Issues**

- Mixed-recorder mutual exclusion is not fully converged in the prose. The operative sections now correctly enforce “one payload-capturing recorder per world,” but ADR 1 still says both recorders can attach simultaneously without interference, and the error table still narrows `recorder_already_attached` to another `SessionRecorder` instead of any payload-capturing recorder. See [spec line 775](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-26-session-recording-and-replay-design.md:775>) and [spec line 648](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-26-session-recording-and-replay-design.md:648>). This keeps `H3-2` and `H-new-3` only partially closed.
- The additive `recordedCommands` fix is not fully reflected in the overview table. Section 10.2/A18 correctly preserve `WorldHistoryState.commands` and add `recordedCommands?`, but the architecture table still says `captureCommandPayloads` records `RecordedCommand` “instead of” `CommandSubmissionResult`, which reintroduces the old type-widening/replacement implication. See [spec line 59](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-26-session-recording-and-replay-design.md:59>). This keeps `H3-4` partially closed.
- Incomplete-bundle range semantics are fixed in A9.1, but the error table still documents `BundleRangeError` against `[startTick, endTick]` universally, instead of using `persistedEndTick` for incomplete bundles. See [spec line 651](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-26-session-recording-and-replay-design.md:651>). This keeps `H3-3` and the iter-2 `N1` holdover only partially closed.

Overall assessment: ship after fixing 3 remaining spec contradictions.
