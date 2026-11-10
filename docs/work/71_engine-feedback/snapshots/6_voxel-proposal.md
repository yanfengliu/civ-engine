# E05 / E07 / E08 — Voxel consumer disposition and bounded proof proposal

Date: 2026-11-08. Author: publisher_review, native independent source-review lane. Outcome: retain all three rows as open consumer dispositions; no producer API addition or game renderer change is justified merely by the old wording.

## Target and bounds

Game root G is C:/Users/38909/Documents/github/aoe2-worktrees/engine-pin-1107. The controller identifies its base as2502de9e with the current reviewed107/155/156/157/158/108 overlays. This is a bounded inspection of current files, not certification of that combined tree or its gates. No Git command, runtime, game import, test, build, browser, network, profile, install, lock or delegation ran. Only this ignored proposal was written. Applicable game instructions, local rules, lessons, recent summary/architecture map and fleet coordinator rules were read; the task's explicit source-only restriction supersedes executing the normal session-start remote-status command.

The actual G/node_modules/voxel is a junction to G/tmp/install/voxel, not the primary sibling checkout. V below means that actual private package. V/package.json reports voxel1.2.0; its exports route voxel/core and voxel/three to dist entrypoints. Game package.json uses file:../voxel, package-lock.json records the linked package at1.2.0, and .github/voxel-commit requests08398b573ad54bcb5c764ad0c2ef3cedc3cce33f. CI fetches that named source archive before building it; scripts/voxel-build-if-stale.mjs:44–58 resolves this checkout's actual node_modules link. I inspected installed declarations and compiled implementations as well as their accompanying source. A configured source pin and a local version string do not prove every installed byte came from that commit: no whole-package source/archive census or fresh build was authorized here. The bounded hashes below identify the actual bytes inspected, rather than silently asserting full pin provenance.

The three original/current asks are G/docs/engine-feedback/current.md:28,34,36 and the historical disposition rows E05/E07/E08 in G/docs/work/106_de-parity-orchestration/snapshots/engine-feedback-disposition-1001.md:15,17–18. Historical pixel/timing claims cited there are prior evidence, not measurements reproduced in this audit.

## Disposition at a glance

| Row | Actual available capability / gap | Current consumer | Disposition |
| --- | --- | --- | --- |
| E05 | Public triangle GeometryResourceV1 accepts positions, normals, per-vertex colors, indices, bounds and pivot. Dense voxels remain cube-faced; no automatic curved shore mesher is implied. | Moebius uses flat dense terrain plus game-owned surf boxes; default Natural uses a separate game-owned shader-blended flat mesh. Public custom geometry already carries cube and shadow-wedge resources, but not curved terrain. | Keep current terrain implementations. Prove one bounded curved/colored terrain patch through existing public resources only if the remaining terrain requirement is still useful. No new meshing API yet. |
| E07 | Global anisotropic worldUnitsPerVoxel already scales chunk vertices, origin and bounds. Instance matrices already support independent width/height/depth. Per-chunk extent/fractional chunk origin is absent. | Both standalone terrain and entity ground deliberately flatten elevation; unit scale is emitted. Ground input uses flat inverse projection. | Capability exists, adoption is incomplete. Quarter-height integration needs terrain, entities, input and both styles to agree; changing one scale constant would not meet the ask. |
| E08 | Public MaterialResourceV1 exposes ordinary opacity/transparency, with no overlap-group/single-layer contract. Internal prepass permits exact-depth double blending and excludes unsupported presenter lanes. | Posed silhouette parts are mirrored twice into the shared memory lane at opacity0.5; fog ghosts use the same material. | Real public-contract gap remains. Retain current cue and its known overlap limitation. First produce a bounded contract/proof design; do not export the internal decorator as the repair. |

## E05 — curved terrain / sub-cell color

### Original ask and current source

The original dense-terrain complaint concerns square cell seams, no sub-cell tint gradient and no curved shore surface. The current ask already correctly prefers an existing-capability consumer proof before a new hook. The current terrain picture is more specific than the historical approximation paragraph suggests.

[V/src/core/contracts.ts:177](C:/Users/38909/Documents/github/aoe2-worktrees/engine-pin-1107/tmp/install/voxel/src/core/contracts.ts:177) declares GeometryResourceV1 with triangle/line/point topology, Float32 positions/normals, optional Uint8 colors, indices, groups, bounds and pivot. The actual Three backend advertises triangles only (V/src/three/capabilities.ts:3–8); do not infer arbitrary line/point support from the wider core type. GeometryPresenter copies positions/attributes, translates the pivot, converts sRGB8 vertex colors to linear values, installs indices/groups and declared bounds (V/src/three/geometryPresenter.ts:17–81; installed dist/three/geometryPresenter.js:2–53). MaterialResourceV1.vertexColors is already public. This is sufficient source evidence for a curved triangulated, interpolated-color surface, with consumer-authored topology/normals and finite budgets; it is not a ready-made terrain algorithm.

The game advertises geometry-resources and emits resources/chunks/batches in [aoeVoxelAdapter.ts:218](C:/Users/38909/Documents/github/aoe2-worktrees/engine-pin-1107/src/rendering/voxel/aoeVoxelAdapter.ts:218). The real path is adapter.createSnapshot → acceptAoeVoxelSnapshot → Three runtime, not a separate hypothetical adapter. copyAoeVoxelResources includes both the centered cube and shadowWedgeGeometry (G/src/rendering/voxel/aoeVoxelResources.ts:129–145); the wedge is already an actual custom triangle resource, including normals, pivot and bounds (aoeVoxelShadowWedge.ts:31–47). Thus geometry adoption in general is real, while curved-terrain adoption is not.

Moebius terrain still comes from terrainCells → makeTerrainChunks: every cell is forced to elevation0, gets one tint, and fills integral palette cells (aoeVoxelTerrain.ts:59–102,137–164). Its connected surf is six overlapping boxes per edge, with shared corner coordinates (aoeVoxelTerrainWaterDetail.ts:1–21). The Natural style disables those shore strokes because its shader owns the waterline (aoeVoxelTerrain.ts:170–194).

The default Natural style is a material distinction: [aoeDeGround.ts:1](C:/Users/38909/Documents/github/aoe2-worktrees/engine-pin-1107/src/rendering/voxel/aoeDeGround.ts:1) owns one flat Three mesh with the top at y=0 and map-edge sides from-1 to0. AoE lends its scene to the runtime. applyGround selects exactly one ground and removes voxel chunks while that mesh is visible; present packs the same frame's fog/terrain before accepting the snapshot and updating the mesh (AoeVoxelWorldRenderer.ts:167–175,239–266). Its full shader blends the nearest four cell surfaces using bilinear weights plus texture-height/wander fields, producing soft irregular color boundaries; it does not bend the physical ground. The CPU-rasterizer single-sample tier deliberately retains harder kind edges (aoeDeGroundShader.ts:1–21,107–145,192 onward; aoeDeGroundTier.ts:21–41). “The current ground is only a per-cell voxel tint approximation” is therefore stale if applied to the default style as a whole.

### Existing evidence and its limits

V/tests/three/presenters.test.ts:21–68 constructs an indexed colored triangle and checks positions/normals/UVs, linear color conversion, indices, groups and bounds; the following pivot test checks translation without source mutation. These are meaningful presenter contracts, not a native AoE curved-shore test. G/tests/rendering/aoeVoxelAdapter.test.ts:96–177 explicitly holds flat16-cell chunks and shared/negative-cell seams. G/tests/rendering/aoeVoxelTerrainRaycast.test.ts:34–65 tests portable dense occupancy raycasting over one flat seam; it does not query displayed custom triangles. G/tests/rendering/aoeDeGround.test.ts checks the current mesh, uploads and shader splice. Existing browser tests de-ground.spec.ts, de-ground-full-blend.spec.ts:145 and de-ground-frame-cost.spec.ts:142 cover the current ground/fog/tier behavior; voxel-terrain-water.spec.ts covers displayed-time water motion. Their source was inspected selectively; no run or image was accepted anew here.

### Smallest useful next proof

Keep the existing Natural shader and Moebius ground unchanged in the product. If root schedules E05 proof, use a small actual AoE adapter fixture straddling one16-cell boundary, with a convex and concave shore, nonuniform vertex colors/normals and known/hidden cells. Supply two opaque custom geometry resources and ordinary instance batches through the actual snapshot/accept/present path, with identical shared boundary positions. Do not add a whole-map mesher, new art style, top-surface callback or transparency workaround. Suppress coincident dense top faces in the fixture; drawing a custom top over the old slab merely substitutes z-fighting for the old seam.

Specify resource incarnation/revision, removal/re-add, returned-buffer detachment, fog-neutral hidden input, normals, sRGB conversion and bounds as literal contracts. Current adapter limits are16 resources,1,024 vertices and3,072 indices per geometry (aoeVoxelAdapter.ts:235–243): a whole-map/per-chunk design cannot silently inherit those budgets. A bounded two-resource fixture can establish the lane; any later scale-out needs measured resource/draw/byte budgets and neighbor invalidation.

Acceptance still needs native actual-GPU captures of the same fixture before/after/diff, both styles where applicable, fixed and adversarial angle/zoom, no cracks at shared edges, no hidden-terrain color leakage, stable paused frames, bounds/culling and disposal. The existing maintained screenshot/diff tools should own those captures. A useful result must demonstrate a remaining geometry need rather than rediscover Natural's existing soft color blend.

Picking is a separate missing contract, not something the existing public type proves: the actual public committed-pick path is unavailable on AoE's present synchronous runtime, as detailed under E07. A flat y=0 color/shore proof may retain current analytic cell picking and truthfully limit its claim to that plane. A shaped/elevated surface cannot claim picking acceptance without a matching presented-surface query. Do not promote E05 to adopted from the resource fixture alone.

Retaining the current game-owned Natural implementation is justified: its per-fragment texture arrays, fog treatment, style tiering and same-frame packing are requirements not represented by the simple public GeometryResourceV1 plus MaterialResourceV1 fields. Replacing it with a colored triangle resource would change the rendering treatment, not mechanically remove an engine workaround.

## E07 — anisotropic size / fractional height

### Original ask and actual capability

The original complaint was that integral voxel columns forced full-tile cliffs instead of fractional-height terrain. Current wording correctly identifies global non-uniform scale as existing and per-chunk extent as absent. [V/src/three/chunkPresenter.ts:46](C:/Users/38909/Documents/github/aoe2-worktrees/engine-pin-1107/tmp/install/voxel/src/three/chunkPresenter.ts:46) multiplies each position axis by worldUnitsPerVoxel; lines76–95 scale bounds and origin. Installed dist does the same at26–29,50,58. The descriptor's vector is validated positive/finite (V/src/core/snapshot-validation.ts:268–275). VoxelChunkV1 still has integral origin/size and no per-chunk scale field (contracts.ts:196–203).

At scale{x:1,y:0.25,z:1}, the game's integral chunk origin y=-1 and filled height elevation+1 give base[-0.25,0] for level0 and a top of elevation*0.25. Integer storage therefore already represents quarter-height columns. This calculation is a source-derived example, not a rendered proof; columns still step rather than form a continuous ramp.

Anisotropic primitive scale is also already consumed: InstanceBatchV1 carries16-float matrices, and matrixForPart scales the rotation columns independently by width, height and depth before translating (G/src/rendering/voxel/aoeVoxelRecipeTypes.ts:216–258). A new primitive-axis scale API would duplicate the existing path. The chunk descriptor scale is not a parent transform that automatically lifts or rescales all instances; their world-space transforms must be composed deliberately.

### Actual blockers and existing tests

The adapter emits{x:1,y:1,z:1}; terrainCells validates but discards elevation; compositionGround validates but returns0 for entity composition ([aoeVoxelEntityPrep.ts:77](C:/Users/38909/Documents/github/aoe2-worktrees/engine-pin-1107/src/rendering/voxel/aoeVoxelEntityPrep.ts:77)). The Natural mesh is flat too. The input contract is intentionally flat: placementGhostCell uses screenToIso then isoToWorld and floors the cell (G/src/app/voxelGameViewHelpers.ts:37–48); presentation's screenToWorldPosition does the same (AoeVoxelGameView.ts:146–150). Static recipe hit geometry likewise starts entities at ground0 (aoeVoxelGeometry.ts:26–33). These are consumer integration requirements, not missing float positions.

The public picking caveat is concrete. [V/src/three/ThreeRenderRuntime.ts:351](C:/Users/38909/Documents/github/aoe2-worktrees/engine-pin-1107/tmp/install/voxel/src/three/ThreeRenderRuntime.ts:351) says pickPresented requires a descriptor with chunkProfile and a runtime constructed with voxelWorkers; the synchronous path, including pure-instance worlds, reports no-presented-frame. The installed implementation and capabilities agree. AoE's constructor at AoeVoxelWorldRenderer.ts:173–203 supplies neither workers nor that path, and its snapshot descriptor has no chunkProfile. Consequently “the public ray picker exists” does not establish that it works on this consumer. The portable raycastDensePaletteChunks helper is in voxel-grid coordinates and not tied to presented state; the installed guide consumer-integration.md:181 explicitly makes that distinction. Its game seam test cannot establish quarter-height canvas picking.

V/tests/three/snapshotAdapter.test.ts:72 tests scale propagation; presented-voxel-store.test.ts:20–71 uses{x:2,y:3,z:4}, exact anisotropic bounds and a ray hit; committed-presented-ndc-picking.test.ts:267 exercises anisotropic committed picking in its prepared worker-style state. These cover producer mechanisms, not this flat game host or a fractional0.25 configuration. The current game adapter's flat-height assertion is intentional and must not be silently weakened.

### Smallest useful next proof / disposition

Use a bounded development fixture at levels0/1/3 spanning a positive and negative chunk seam. Preserve x/z units and cube-face normals, set only voxel y-scale0.25, retain integral columns, and make unit/tree/building bases plus selection/shadow/hit proxies use the same explicit ground-height function. Do not scale unit body height by0.25. Literal expected bounds are level0 top0, level1 top0.25, level3 top0.75; test foot contact and off-center positions. Preserve simulation state, elevation rules, pathfinding and save/record formats.

Separate the proof into rendering and input. The smallest renderer proof can show the existing API works without claiming playability. Before game adoption, choose and prove a matching terrain query: a game-owned query of the exact derived displayed height surface, or a separately assessed migration to Voxel's worker/profile committed-pick lane. The latter is a renderer lifecycle/invalidation change, not a one-line scale fix, and is not recommended solely to close this row. If the owner actually wants smooth slopes rather than quarter-height steps, that is E05 topology/ground-query work; scale alone cannot meet it.

Acceptance includes both supported styles, current fog rules, actual ground orders/placement, entity body/selection contact, camera framing, map edges, reset/load/replay and same-frame publication. Existing flat fixtures should remain explicit controls while the isolated raised fixture is added. No present evidence establishes per-chunk scale or fractional-origin necessity. Keep that request conditional on a concrete case the global-scale/matrix path cannot express, rather than adding a general option now.

Retain current flat game presentation until that coherent proof is scheduled and accepted. Source availability cannot retire the visible/input consumer gap.

## E08 — coplanar transparency and adapter limits

### Original ask / real gap

The historical single-pass census at declared0.55 found exactly the opacity of two and three overlapping blends. The current cue intentionally uses two coincident0.5 passes; the old census is not a measurement of that newer output. Its required behavior is a readable owner-colored translucent posed-body cue over buildings, including overlapping body parts and multiple units, without accidental seam opacity. Changing it back to opaque or reducing it to one0.5 pass would regress the separately recorded readability requirement.

MaterialResourceV1:159–169 exposes ordinary shading/color/vertexColors/transparent/opacity/doubleSided/roughness/metalness only. V/src/three/materialPresenter.ts:30–50 maps that to an ordinary Three material and optional package-internal decorator; it does not expose a public depth/coverage policy. The public source barrel and actual installed dist/three/index.js omit THREE_MATERIAL_DECORATOR_INTERNAL and the single-layer functions. There is no supported deep-package export for these internals.

The internal technique's own limits are decisive: [singleLayerTransparencyInternal.ts:29](C:/Users/38909/Documents/github/aoe2-worktrees/engine-pin-1107/tmp/install/voxel/src/three/singleLayerTransparencyInternal.ts:29) permits two exactly equal-depth fragments to blend twice; ordinary translucent objects behind the marked film are depth-tested against it; only the ordinary instance-batch presenter grows a companion, not voxel chunks or paged lanes. markSingleLayerTransparencyInternal uses EqualDepth and disables color-pass depth writes (lines57–69); the prepass uses LessEqualDepth. Copying its export cannot make equal-depth ownership unique.

The game mirrors each non-shadow posed part twice, drops ambient animation and preserves coincident transforms/tint (G/src/rendering/voxel/aoeVoxelOcclusionSilhouettes.ts:184–239). All go into the memory surface with opacity0.5 (aoeVoxelResources.ts:87–90). Lane assembly sorts fog ghosts and silhouettes together by keys, not per-fragment depth (aoeVoxelLaneBatches.ts:238–246). Marking that shared material would also change fog ghosts, and a global nearest-film policy would not automatically preserve separate unit identities or two intended passes. The intentional2-pass coverage and accidental part-overlap coverage need different ownership rules.

### Existing evidence / missing acceptance

V/tests/three/single-layer-transparency.test.ts has meaningful controls for invalid materials, shared buffers/program hooks/counts, picking exclusion, lifecycle/disposal, mixed-mark refusal and animation. Its94–138 test proves depth-prepass construction and hook identity; it does not prove unique blending at exact coplanar ties, and the source explicitly disclaims that property.

G/tests/rendering/occlusionSilhouetteReadsAsBehind.test.ts:186–239 holds translucency, coverage between0.5 and1, existing batch count, and coincident transforms. This prevents “repair” by deleting the intentional second pass. Its coverage calculation is a structural composition check, not a full posed-body pixel census. G/tests/browser/voxel-occlusion-outline.spec.ts checks the hidden/control/enemy villagers, owner-colored pixels, bounded batches and paused presentation; it does not distinguish each accidental body-overlap layer. Existing contrast tests protect owner-color separation. None was run anew, and historical screenshots were not inspected in this source-only audit.

### Smallest actionable proposal

Retain the present cue and the explicit overlap limitation. First specify an overlap ownership contract and a tiny native proof fixture before selecting a renderer algorithm: one logical silhouette and two intentional coverage passes, several intersecting/coplanar posed parts, a second unit, an ordinary fog ghost, and an opaque building/control. Compare background/opaque/reference translucent captures under a controlled untonemapped material as an alpha oracle, then repeat actual game material/tone/style output for readability. Include exact equal-depth ties, tiny signed offsets, crossing bodies, key/order permutations, animation poses, both styles, and paused identity. A nominal one-layer pass must not grow darker from accidental duplicate parts; the two intentional passes must retain the desired approximately0.75 coverage where the reference assumptions hold.

Use the internal nearest-depth helper only as a documented negative control for coplanar ties, not the proposed public solution. Candidate techniques such as per-cue coverage masks/stencil ownership or another bounded depth/coverage method remain hypotheses; this audit does not select or prove one. The proof must define whether overlapping different units compose separately or form one cue and how each intentional pass resets coverage. That semantic choice affects any grouping key/API. It must also define fog-ghost independence, opaque occlusion versus the game's deliberate screen-locked cue lift, supported ordinary/paged/chunk lanes, unsupported-lane refusal and borrowed renderer state restoration.

A future public contract should be declarative and game-neutral, not arbitrary material callbacks/deep imports. Bound GPU targets, passes, instances, cleanup/replacement/context loss and borrowed stencil/depth/scissor/viewport state. Preserve shared instance buffers without double disposal, one pick result per actual surface, and unrelated transparent materials. Acceptance must include native full-resolution fixed/adversarial views, same-color alpha witnesses, actual GPU identity, before/after/diffs, real cue inputs, frame/draw/resource cost and repeated teardown. Source/unit tests or a bare exported decorator cannot close this row.

## Authorization and next decision

This audit, its proposal and a later controller-assigned bounded existing-API consumer experiment are within the current scoped engine-related investigation; no additional owner approval is needed merely to retain these dispositions or read the installed dependency. This assignment grants no implementation or runtime.

Recommended next allocation, if worthwhile: one small E05/E07 existing-public-API capability fixture with separate render and picking outcomes, while retaining the current production ground and both styles. Do not turn the backlog into a wholesale art/terrain rewrite. An unresolved public-picking result should be reported as that result, not used to justify an automatic worker-pipeline migration.

The concrete consequential decision would be to ship raised/curved terrain plus changed ground input, replace the Natural ground architecture, or fund a new cross-lane coverage/grouping renderer contract for E08. Those are larger product/renderer decisions than this source disposition; prepare their exact affected contracts, costs and proof first, then seek the owner's R8 decision if pursued. No persistent save/record format change is intrinsically required by any of the three render-only proposals. No new art direction, API, policy, dependency, model pin or automatic producer change is authorized here.

All rows remain OPEN for the exact acceptance described above. Existing primitive/geometry/scale mechanisms should not be reported missing; existing producer tests should not be reported as current consumer adoption; the default Natural ground should not be described as only dense-cube rendering.

## Bounded byte binding and verification

The following SHA256 values bind a small decisive subset of current files. G and V are the absolute roots above; this is not a full source/build provenance claim.

| File | SHA256 |
| --- | --- |
| G/.github/voxel-commit | 7336ED13535618C888A1F61642ECE4BB71A341B14948A8607079298D3E30F413 |
| G/src/rendering/voxel/aoeVoxelAdapter.ts | 5F233F664A63D5245A47BFF348125E54001148FD625981AB3501D3B6D6776779 |
| G/src/rendering/voxel/aoeVoxelTerrain.ts | 3FDC2FBFC55ED58D99BBFF317EF61AE58CCEF54D4703C7D7CD95D37722E9CCE4 |
| G/src/rendering/voxel/aoeVoxelEntityPrep.ts | 1BB3C1C0F713FBB9B0BC8D85F20AB0527F61188BA3C02162F1F57E915355C4D8 |
| G/src/rendering/voxel/aoeVoxelOcclusionSilhouettes.ts | 3546B757773637388D534E534C659074742036F93E27617578BE1644A97A1DD1 |
| G/src/rendering/voxel/AoeVoxelWorldRenderer.ts | 0A494D4B7B1DBAFD4B6D27FDCA46B127514D35BA05D010D50A5CFE03D560088B |
| G/src/rendering/voxel/aoeDeGround.ts | 09109E4C4F43DB06E24B0C2DF54F14C27DA5F599238933A10533B2019A14F25E |
| V/package.json | 9DF4474F17FECCB02496DF8AD554CB819837BE99BCE24562A4B412EC79CC619D |
| V/dist/core/contracts.d.ts | C3B465D771DEAE5FD619A47856A6BC26D7AF219EE2F6AB162085657F1587955C |
| V/dist/three/index.js | AB4B5D766945D7AE960A808B354DB387C2D50B5FE4AB36571BD3C4DCDE192C49 |
| V/dist/three/chunkPresenter.js | F68A0DC219B8F6B5CE0C758744804D1E238C466CFD238D8B7CB078FF345A3DB8 |
| V/dist/three/geometryPresenter.js | 3A5E381832F61E6292FCE51BA3609B6ECC80B088454A96BBE168C2308DF29E71 |
| V/dist/three/singleLayerTransparencyInternal.js | 9F2C24E3A94281BB1E4197C348F0F5066380A808446C6D5A415B5D831D8EAED7 |
| V/dist/three/ThreeRenderRuntime.js | 9425D15116CE458E5C9D2836FA58A2E285573402696C388D6CE84A3B3E06E8BC |

Verification consisted of bounded text/JSON reads, filename/content searches, junction/metadata inspection and these small file hashes. Some initial guessed paths were absent; the actual files were then located and read. No absent-path output was treated as absence of a capability. Tests cited are inspected contracts, not freshly passing evidence. No fresh screenshot, performance, GPU, replay, full gate, release or delivery claim follows. This work created no runtime, browser or lock resource and leaves only the intentionally retained proposal.
