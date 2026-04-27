Converged.

T5 is closed. The v4 plan now captures `this._startTick = world.tick` in `connect()` and uses it in the periodic snapshot guard, so the initial snapshot is no longer re-emitted when recording starts on a nonzero interval boundary. That matches the real engine ordering in `src/world.ts`: `currentDiff.tick` is built as `gameLoop.tick + 1`, `gameLoop.advance()` happens before diff listeners, and `onDiff` fires after that advance.

T8 is closed. The v4 plan no longer relies on `World.deserialize(snapshot)` followed by re-registration. It adds an explicit `World.applySnapshot(snapshot)` path and updates the `worldFactory` pattern to register first, then apply the snapshot in place. That is consistent with the current engine, where `registerComponent` and `registerHandler` reject duplicates.

Overall assessment: v4 closes the two outstanding correctness gaps; no remaining real issues surfaced in this convergence pass.
