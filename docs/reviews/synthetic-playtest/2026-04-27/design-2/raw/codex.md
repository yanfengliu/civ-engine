[HIGH] `docs/design/2026-04-27-synthetic-playtest-harness-design.md` §6.4 / ADR 6 describes a public “composition observation property” that does not actually exist on the current engine surface. The spec says later policies can observe earlier submissions via `world.commandQueue` and `nextCommandResultSequence`, but both are private in `src/world.ts:252,277`, and the architecture boundary explicitly says “Do not access the queue directly” in `docs/architecture/ARCHITECTURE.md:88`. Because handlers do not run until `world.step()`, policy N+1 has no typed public way to observe policy N’s queued work. That makes ADR 6 inaccurate as written, and the planned §12 “composition observation” test is not testable against the public API.

[HIGH] The `sinkError` category is the right addition, but the lifecycle around it is still underspecified and does not line up with the current recorder contract. §7.2/§12 say the harness returns `{ ok: false, stopReason: 'sinkError' }`, but §7.1’s tick loop never says to stop once `recorder.lastError` is set, so the world can keep advancing after recording has already terminated. More importantly, `SessionRecorder.connect()` can terminate after `open()` / initial-snapshot failure and still marks itself connected (`src/session-recorder.ts:133-143`), while `disconnect()` later unconditionally reads `this._sink.metadata` (`src/session-recorder.ts:210`). Unless T2 hardens that path, the spec cannot promise a clean returned bundle on early sink failure.

[MED] The T1/T2/T3 split still plans to ship an under-documented public release. T1 (v0.7.20) introduces exported API surface and behavior (`Policy`, built-in policies, `RandomPolicyConfig`, `ScriptedPolicyEntry`, sub-RNG semantics), but §14 says T1 only updates `docs/api-reference.md` “policy types only” and defers broader user-facing docs to T2/T3. That conflicts with this repo’s doc-discipline rule that each released API surface lands with its canonical docs.

[LOW] §7.2 overstates the diagnostic value of `commands.length - executions.length`. The spec says that gap “signals the partial submission,” but validator-rejected commands already produce recorded commands with no execution in the current engine (`src/world.ts:733-760`). That shape means “unexecuted commands,” not specifically “policy threw after partial submit.”

[NIT] Iter-1 N1 is only partially fixed. §4 and §18 still say “eleven” exported symbols while listing twelve.

Everything else looks good. The B1 sub-RNG fix is sound, including the single pre-`connect()` `world.random()` default-seed capture. H1 now matches the recorder/FileSink path cleanly. H2’s `policyError` / `sinkError` split is the right semantic direction. M1/M2/M3/M4/M5, L1/L4/L5/L6, and N3 are addressed cleanly. `StopContext` being separate from `PolicyContext` is useful, not YAGNI.

Must land before acceptance:
1. Reframe ADR 6 / §6.4 / §12 so composition semantics match an actual public observation surface, or add one.
2. Define and test a real `sinkError` control flow, including immediate abort and connect-time failure behavior.
3. Bring the T1 docs plan into AGENTS compliance.
4. Tighten the partial-submit diagnostic wording and fix the remaining 11-vs-12 count.
