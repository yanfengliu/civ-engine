# Engine Hardening Plan

Date: 2026-04-10

Status: DONE

Goal: fix the high-priority issues from `docs/ENGINE_DESIGN_REVIEW.md` while preserving the headless simulation boundary.

## Scope

This pass focuses on engine invariants and state fidelity. It does not add renderer code, UI, combat rules, diplomacy, tech trees, or other game-specific systems.

## Plan

1. Harden the write model.
   - Add explicit `setComponent`, `patchComponent`, and `setPosition` APIs.
   - Keep `addComponent` as a compatibility alias.
   - Detect in-place component mutations for diffs so existing systems continue to work while safer APIs are adopted.

2. Harden entity safety.
   - Validate liveness before component and resource writes.
   - Add generation-aware `EntityRef`, `getEntityRef`, and `isCurrent` helpers for commands and external clients.

3. Make resources JSON-safe and serializable.
   - Replace unbounded resource max `Infinity` in public resource state with `null`.
   - Validate resource amounts, rates, and maxima.
   - Add resource registrations, pools, rates, transfers, and transfer IDs to snapshots.
   - Introduce snapshot version 2 while continuing to load version 1 snapshots.

4. Harden spatial and loop boundaries.
   - Expose `world.grid` as a read-only view while keeping `SpatialGrid` usable as a standalone class.
   - Validate grid dimensions and coordinates.
   - Make realtime loop `start()` idempotent and validate loop config.

5. Harden client protocol and packaging.
   - Reject malformed client messages and unknown command types at the adapter boundary.
   - Isolate adapter send failures so a bad transport cannot break `world.step()`.
   - Add a public barrel export and package build metadata.
   - Add CI for test, typecheck, and lint.

6. Validate and document.
   - Add focused tests for each new invariant.
   - Update public docs for changed resource max and snapshot semantics.
   - Run test, typecheck, lint, and build.

## Implementation Status

Implemented on 2026-04-10.

- `setComponent`, `patchComponent`, `setPosition`, in-place mutation diff detection, entity refs, liveness checks, read-only grid view, loop/config validation, client-adapter rejection/error isolation, package exports/build metadata, and CI are in place.
- Snapshot version 2 includes resource state and remains backward-compatible with version 1 snapshots.
- Resource public state now uses `max: null` for unbounded capacity instead of `Infinity`.
- Validation run after implementation: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd run build` passed.
