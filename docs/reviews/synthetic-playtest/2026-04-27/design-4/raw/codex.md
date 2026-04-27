**Findings**
- `MED` [docs/design/2026-04-27-synthetic-playtest-harness-design.md:539-561, AGENTS.md:150-152] The versioning plan is not consistent with repo policy. The spec explicitly says the `sourceKind` widening can break downstream exhaustive switches, then still plans a `c` bump. Under this repo’s rules, a breaking change must bump `b`. Until the spec either removes the claimed downstream breakage or updates the release plan to a `b` bump for that surface change, it is not implementation-ready.

- `MED` [docs/design/2026-04-27-synthetic-playtest-harness-design.md:19,334-337,441; src/session-replayer.ts:278-300] The determinism/self-check guarantee is overstated while `snapshotInterval` and `terminalSnapshot` remain unrestricted pass-throughs. `selfCheck()` only validates between snapshots; if a caller sets `terminalSnapshot: false` and produces no periodic snapshot after the initial one, the replay loop checks zero segments and returns `ok: true` vacuously. The spec needs to either constrain these options for synthetic playtests or narrow the guarantee/CI guidance to snapshot-producing configurations only.

**Status**
The iter-3 issues you called out do look cleanly addressed. The connect-time sink-error path now matches the current recorder contract (`docs/design/...:382`, `src/session-recorder.ts:100-143`), the public policy surface now mirrors `World<TEventMap, TCommandMap, TComponents, TState>` (`docs/design/...:111-144, 235-370`, `src/world.ts:229,233`), and the `ticksRun` placement is corrected (`docs/design/...:350-351,390`).

Not ready for implementation until the two `MED` items above are resolved.
