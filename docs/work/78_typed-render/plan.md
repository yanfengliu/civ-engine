# Preserve typed worlds through render projection

Status: active
Owner: Codex
Created: 2026-11-07
Updated: 2026-11-07

## Problem and outcome

idle-life requires casts because RenderAdapter erases World component/state parameters. Carry both types through entity and frame callbacks without changing runtime projection behavior.

## Scope

Engine-only additive type support in codex/typed-render-1107, based on main 44663f0. Consumer cast removal is a later adoption milestone. Existing render invalidation and messages remain unchanged. Candidate 2.8.0 uses trailing defaulted generics to preserve existing parameter positions.

## Approach

Append TComponents and TState to RenderProjector and RenderAdapter and propagate them through internal World references. Constructor inference follows the supplied World. Retain World's existing explicit generic fallbacks. No export names change; the public-surface fixture stays unchanged, with the declaration diff and typed tests forming the signature review artifact.

## Acceptance criteria

- Inferred and explicit typed worlds compile; entity/frame callbacks preserve typed reads and command/event contracts; existing generic declarations compile.
- Existing snapshots, tick projections and selected invalidation tests pass. Runtime behavior and persistent formats are unchanged.
- Independent exact revision review, all eleven gates, main/push and hosted CI complete; API/guide/changelog documentation matches shipped signatures.

## Implementation steps

- Done: reproduced compiler failure before implementation; propagated generics; typecheck and 20 focused render cases pass.
- Active: independent review, full gates and delivery.
- Pending: idle-life adopts verified artifact and removes casts through its own gates.

## Outcome

Pending delivery. The owner approved work 77's retained release assets on 2026-11-07; that implementation follows this milestone, which does not change publication behavior.
