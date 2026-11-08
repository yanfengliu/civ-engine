# Fractional visibility centers: owner decision

Prepared 2026-11-08 by the root coordinator from engine main301dd868 and AoE2 maina0e10435. The detailed earlier design is civ-engine/docs/work/71_engine-feedback/design.md, M5; this proposal refreshes its compatibility boundary. It does not authorize source changes by itself.

## Concrete change

Permit finite fractional VisionSource x/y values in VisibilityMap.setSource and VisibilityMap.fromState, within the existing map bounds. A cell is visible when its integer coordinate is inside the inclusive source circle: (cell.x-source.x)^2 + (cell.y-source.y)^2 <= radius^2. Point queries still require integer cell coordinates. Integer-source results, canonical state ordering and old integer saves remain unchanged. Invalid nonfinite source coordinates get the explicit visibility_source_coords_invalid error; finite out-of-bounds sources retain visibility_out_of_bounds.

AoE2 currently approximates an even-sized building's half-cell center using four integer sources (src/game/simulation/bridge/visibilitySourceSync.ts and buildingVisionSources.ts). A later separately verified game adoption would replace these with the actual single center, with fixed edge/overlap/fog, owner-transfer, save/load and replay controls. This proposal permits that scoped adoption; it does not change building sight ranges, technology bonuses, AI policy or unrelated mechanics.

## Persistent compatibility decision

VisibilityMapState keeps the same fields, but new states may contain fractional source coordinates. New code loads old integer states; older engines reject fractional states. The engine's recorded version remains the compatibility marker. There is no new journal, serializer schema or dependency. This accepted-value expansion needs explicit owner approval under AGENTS.md R8 because persisted values accepted by readers change. The existing schema3 approval concerned queued human commands and does not cover this engine contract.

## Implementation and acceptance

Separate the default-preserving incremental visibility algorithm from this compatibility change. Preserve batched updates, exploration only of final source positions, overlap/removal/clear/load semantics and existing metric meanings. Additional work counters must describe actual operations and the AoE2 layered wrapper must aggregate both maps. Use independent brute-force cell oracles, literal half-cell cases, randomized update sequences and deliberately failing controls. Measure time and retained memory on both static-heavy and moving-source workloads before accepting the algorithm. No result may claim constant memory: per-source coverage retains O(sum of source coverage plus visible/explored cells and source identities).

Ship only after exact independent review, full engine gates, main/push, terminal Node20/22/24 and retained-archive verification. Consumer adoption requires its own full verification, recorded-world comparisons and native fog/view checks. Existing default safety and recording contracts stay enabled.

## Decision

Pending owner approval for fractional source values and the scoped AoE2 true-center adoption. Default-preserving performance and other approved backlog work can continue meanwhile.
