**Closure list**
- `CR1`: Yes — `FileSink` now hydrates `metadata` and `attachments` from `manifest.json` in the constructor, so `toBundle()` / `readSidecar()` can work on an existing bundle directory without a prior `open()`.
- `CR2`: Yes — `World.applySnapshot()` now preserves pre-registered empty component stores/options/bits, and `world.grid` now dereferences the current `spatialGrid` instead of the constructor-time one.
- `H1`: Partially — the fix resolved the `FileSink` side of the problem, but the recorder still does not truly “defer to sink defaults” (details below).
- `H2`: Yes — `addMarker()` now rejects out-of-bounds `refs.cells` and unknown attachment ids.
- `H3`: Yes — marker payloads and recorded command payloads are now cloned on capture, so caller-side mutation no longer rewrites recorded history.
- `H4`: Yes — `selfCheck()` now strips `submissionSequence` before comparing execution streams, which removes the false-positive multi-segment divergence.
- `M1`: Yes — `SessionReplayer` now rejects unsupported `schemaVersion` before engine-version checks.
- `L1`: Yes — the stale `ENGINE_VERSION` literal drift is gone from the API docs.
- `Doc/cleanup notes`: Partially — the public docs/API surface is now present and aligned, but the fix-pass still does not pin some of the highest-risk regression paths with targeted tests.

**Remaining issues**
- High: `SessionRecorder.attach()` still hard-codes the default path instead of actually deferring to sink policy. In `src/session-recorder.ts`, omitted `options.sidecar` becomes `{ sidecar: true }`; in `src/session-sink.ts`, `MemorySink.writeAttachment()` treats that as an explicit sidecar request. So the default `SessionRecorder` + default `MemorySink` now stores even tiny attachments as sidecars, bypasses the documented oversize guard, and can produce non-self-contained bundles whose attachment bytes live only in the sink instance. This closes the original `FileSink` symptom but not the underlying API bug.

**Overall assessment**
Approve after fixing the remaining `SessionRecorder.attach()` default-semantics bug.
