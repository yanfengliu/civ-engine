# Preserve typed worlds through render projection

Status: complete
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
- Done: independent Astra review and F0 test repair/re-review (rounds 0 and 1); all eleven gates pass, 1830 root plus one existing TODO and 22 MCP. Candidate and repair retained as 50fa994 and efe4048.
- Done: main 614c75a pushed; CI 42425193412 passed Node20/22/24 plus publish-dist. Actual archive package/runtime 2.8.0 and inferred/explicit typed consumer compilation verified.
- Pending: idle-life adopts verified artifact and removes casts through its own gates.

## Outcome

Delivered at main 614c75a3ca4955f10083e552bf2217c6a221f955 with hosted CI 42425193412 successful. Downloaded rolling asset 722271045 is 662792 bytes, SHA256 92c1c95e973d1fd15821c0289084f806c6ead1a0877d394eb17606609f488cf4; actual manifest/runtime both 2.8.0. A consumer fixture compiled against the published declarations with inferred and explicit typed projectors/adapters. Full local gates and both authored review rounds are recorded above. idle-life cast removal belongs to the separate consumer adoption milestone. The shared primary dist remains untouched.
