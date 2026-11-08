# E20 state fingerprint cost: bounded source/data disposition and proposed next step

Prepared 2026-11-08 by /root/publisher_review for /root. This is a source/data-only proposal. No game/runtime import, test, profile, benchmark, browser, provider call, dependency action, Git mutation or implementation occurred. The only new file is this ignored proposal.

## Decision

Do not present a primitive-only fingerprint shortcut as the answer to the measured game workload. The two actual late save inputs contain41 world-state keys each, with exactly one primitive value: a one-byte number. Their loaded constructed/settled worlds contain43 keys, still only that primitive. More than99.9995% of state-value JSON bytes are composite in each inspected snapshot. Eliminating that primitive's tick scans may save a small fixed cost, but does not remove the large composite traversals motivating E20.

A bounded default-preserving internal experiment remains possible. Earlier unsafe shortcuts are concrete counterexamples to those shortcuts, not a proof that every internal optimization is impossible. For substantial removal of the large composite scans, the most concrete next proposal is an opt-in, runtime-only, per-key setter-observed contract, initially adopted only for AoE2's aoe2.lastSeenStatic slot. Leave every unselected slot and the engine default on existing live-reference fingerprint observation. Authorize this contract explicitly before implementing it; the present assignment authorizes only this document.

The optional policy can avoid a new persisted field if its selection is application/factory registration, with exact load/applySnapshot/replay behavior specified below. No snapshot/save/SessionBundle schema change is intrinsically required for that design. If the owner instead requires an arbitrary snapshot to restore the policy without its application factory or caller options, that is a different, self-describing persistent contract and needs its own concrete format decision. Do not silently introduce it.

## Exact source and data inspected

Engine primary HEAD is f50e5d481308b28e5b97db9036c1ebd6654b9745; src/version.ts reports2.13.0. Read-only comparison confirmed world-tick.ts, world-observers.ts, world-core.ts, world.ts and json.ts are identical to22f3e197 for this scope. The relevant algorithms therefore match the prior investigation, despite newer unrelated capabilities.

I read the complete retained docs/work/71_engine-feedback/reviews/4_design.md, SHA256 0F04E80DC0428772CE1D31F3AFA40579F2D694A9BA46F3723EFD549EFF6AA04F, including the E02/E20 counterexamples and E11/E13/E15 composition/lifecycle limits. Those conclusions remain proposals rather than measured acceptance. This task does not reopen work73's exhausted repair budget, claim recording-reader adoption, or change the separate approved spool experiment.

Selected current engine source hashes:

| Path under C:/Users/38909/Documents/github/civ-engine | SHA256 |
| --- | --- |
| src/world-tick.ts | C32DBE38499BEB2215218B4FF128BFB611C0CBBEAF99D25B2D318CE64F208239 |
| src/world-observers.ts | 7BC3DC86EAC1537B5C9A4764A72C2E4179072A9031FD011C64BDFCDC44496EE8 |
| src/world-core.ts | 6F6021439ED8309061D0FB760FD487B9B3A2639E5FF34018BA33B02F3FCD7794 |
| src/world.ts | 1729121E0126FF64E4EE570EF421A03201F4FB29D6B970AFF267BFD0018E6001 |
| src/json.ts | C0D8953A77FE71282A481D57D62B55D61251930DE85E8AC7860EDAD70D9B0541 |

Game write-discipline inspection used the current combined engine-pin-1107 files: bridgeStateAccessor.ts SHA256 C163B8591F5EF9E15D8017585E89BF2FD4957E776C0DD284EEAC3B5007AC56F4, fogMemoryOps.ts 59DD5165A4E5A84F5371E7249FD95866FFA16E2E11FA4FD3D8C3E6B1929C9F4F, visibilitySlots.ts 301F20895E8F9AB67DB1F36D6616092EB7A5E6E94948787A392BB09D73E9EDAD, and visibilityCell.ts B48EDE5B24F42B90F1E060E956B085B49CF5BF9361516BAB25DF379934228260. These are source-read identities, not acceptance of a new game implementation.

The two retained input files were parsed and their complete file hashes independently matched the existing work157 input manifest:

| Input | File bytes | SHA256 |
| --- | ---: | --- |
| C:/Users/38909/Documents/github/aoe2/tmp/work150-retained/w150/de-120-2p/save-24000.json | 3770852 | 26934A78DB4340F9CC8C377FDB79382507E5D554AF7A681AEF8D5B43AF0A7F8B |
| C:/Users/38909/Documents/github/aoe2/tmp/work150-retained/w150/de-168-4p/save-24000.json | 7370376 | C649FE87197332A0D9693F9C2994A23B0989ACAF50862FD3CF21DFD5B3E46C90 |

Both are actual schema2 saves at tick24000. Their file mtimes remained2026-11-06T22:38:36.2912453Z and2026-11-06T22:38:36.2638101Z respectively. For constructed/settled comparisons, I read only the eight completed A/B world JSON files under gatherer-publication-1107/tmp/gatherer-cost-1108/run-1/ab-{120,168}-24k. Each pair already had result.json; file lengths and last-write timestamps remained unchanged across each read. I did not read the hundreds-of-megabytes recording bundles, poll an active partial file, run the harness, or infer performance from its result.

The existing work157 harness's A is exact8b356f2377488700c5ed0299fce0598f5a2829ca; B adds the nine work157 publication source files. Both used the same private2.10.1 artifact. These snapshots supply actual data composition, not a2.13 timing result. The inspected engine2.13 state algorithm is unchanged, but a later combined game revision still needs its own exact cost/parity proof. timing.mjs:21–31 writes construction before its one settle step, compares the complete settled worlds, then writes the settled snapshots. The retained result records settle24000→24001 once per arm; the1000 sample ticks and first200 ratio exclusion are subsequent and irrelevant to this composition census.

## What the data says

Method: parse each bounded JSON file with System.Text.Json; enumerate only worldSnapshot.state or state; classify each top-level value; serialize that value with a compact UTF-8 writer using relaxed JSON escaping, and count its bytes. These are JSON value sizes excluding the outer state's property names, colons, commas and braces. They are not heap sizes, CPU weights, validation-visit counts, engine stateDigest outputs or raw pretty-file sizes. Per-key compact byte hashes were compared between A and B at each phase, with identical key order/type/value hashes. Only bounded41/43-key enumeration and these already-materialized state values were traversed for the census; no game modules or component-wide analysis ran.

| State sample | Keys | Number keys / bytes | Object keys / bytes | Array keys / bytes | Sum of value bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| 120 saved tick24000 | 41 | 1 / 1 | 7 / 49015 | 33 / 157552 | 206568 |
| 120 constructed A = B, tick24000 | 43 | 1 / 1 | 8 / 49040 | 34 / 157554 | 206595 |
| 120 settled A = B, tick24001 | 43 | 1 / 1 | 8 / 49040 | 34 / 157359 | 206400 |
| 168 saved tick24000 | 41 | 1 / 1 | 7 / 119208 | 33 / 165328 | 284537 |
| 168 constructed A = B, tick24000 | 43 | 1 / 1 | 8 / 119233 | 34 / 165330 | 284564 |
| 168 settled A = B, tick24001 | 43 | 1 / 1 | 8 / 119243 | 34 / 166277 | 285521 |

The original saved keys have the same per-key byte sizes as their constructed values. Construction adds aoe2.replayUnitAttacks (2 bytes, empty array) and aoe2.movePaths (25 bytes, object); neither is evidence that the engine data needs a new policy field. The current mode proposal would add no state key.

At construction, aoe2.lastSeenStatic alone accounts for64.9246% of120 value bytes and42.2394% of168. Together with aoe2.visibility it accounts for88.4997% and83.2231%. At settle those combined shares are88.4889% and82.9442%. The lone primitive, aoe2.resourceOccupationVersion, accounts for roughly0.00048% and0.00035%. There is one top-level player entry in lastSeenStatic; that outer array length is not the count of individual remembered entities. Values in the detailed table are bytes, not entry counts.

Equal sizes do not prove an unchanged value. In120, visibility, aiStates, productionQueues and combatStates changed compact fingerprints across settle despite unchanged byte lengths; lastSeenStatic also changed and shrank195 bytes. In168, lastSeenStatic and visibility retained their fingerprints across that one step, while pendingCommands, aiStates, buildingHealthStates, productionQueues, buildingCombatStates, combatStates, constructionStates, projectiles and replayUnitAttacks changed. This is one transition, not a dirty-frequency measurement. An equal fingerprint likewise does not prove no setter call occurred: same-value setters are still explicit dirty events.

Detailed constructed/settled value census; A and B match at each phase:

| State key | Type | 120 constructed | 120 settled | 168 constructed | 168 settled |
| --- | --- | ---: | ---: | ---: | ---: |
| aoe2.resourceOccupationVersion | Number | 1 | 1 | 1 | 1 |
| aoe2.bridgeMeta | Object | 32 | 32 | 32 | 32 |
| aoe2.visibility | Object | 48705 | 48705 | 116625 | 116625 |
| aoe2.buildingVisibility | Object | 128 | 128 | 2094 | 2094 |
| aoe2.matchState | Object | 68 | 68 | 68 | 68 |
| aoe2.pendingCommands | Array | 2 | 2 | 2 | 114 |
| aoe2.playerAges | Array | 35 | 35 | 67 | 67 |
| aoe2.playerCivilizations | Array | 28 | 28 | 60 | 60 |
| aoe2.playerTeams | Array | 2 | 2 | 2 | 2 |
| aoe2.playerResources | Array | 96 | 96 | 195 | 195 |
| aoe2.matchSettings | Object | 21 | 21 | 21 | 21 |
| aoe2.researchedTechnologies | Array | 438 | 438 | 672 | 672 |
| aoe2.population | Array | 87 | 87 | 170 | 170 |
| aoe2.villagerOrdinals | Array | 15 | 15 | 28 | 28 |
| aoe2.aiStates | Array | 472 | 472 | 949 | 955 |
| aoe2.buildingHealthStates | Array | 2362 | 2362 | 4009 | 3999 |
| aoe2.townCenterRefs | Array | 65 | 65 | 129 | 129 |
| aoe2.productionQueues | Array | 538 | 538 | 865 | 865 |
| aoe2.buildingCombatStates | Array | 313 | 313 | 548 | 548 |
| aoe2.playerScoreCounters | Array | 230 | 230 | 456 | 456 |
| aoe2.combatStates | Array | 8238 | 8238 | 18913 | 18917 |
| aoe2.wildlifeStates | Array | 913 | 913 | 1825 | 1825 |
| aoe2.trackedVisibilitySources | Array | 1181 | 1181 | 2441 | 2441 |
| aoe2.lastSeenStatic | Array | 134131 | 133936 | 120198 | 120198 |
| aoe2.constructionStates | Array | 7022 | 7022 | 11663 | 11663 |
| aoe2.gathererDropOffStuckSinceTick | Array | 2 | 2 | 2 | 2 |
| aoe2.unitCommands | Array | 803 | 803 | 1872 | 1872 |
| aoe2.sheepMoveOrders | Array | 2 | 2 | 2 | 2 |
| aoe2.projectiles | Object | 28 | 28 | 335 | 345 |
| aoe2.garrisonedUnitVisionSources | Array | 205 | 205 | 2 | 2 |
| aoe2.garrisonedUnitToBuilding | Array | 85 | 85 | 2 | 2 |
| aoe2.garrisonedByBuilding | Array | 47 | 47 | 2 | 2 |
| aoe2.monkCarriedRelic | Array | 2 | 2 | 2 | 2 |
| aoe2.conversionState | Array | 2 | 2 | 2 | 2 |
| aoe2.monkHealCounters | Array | 2 | 2 | 2 | 2 |
| aoe2.trebuchetPackStates | Array | 2 | 2 | 2 | 2 |
| aoe2.rallyPoints | Array | 2 | 2 | 2 | 2 |
| aoe2.marketExchangeRates | Object | 33 | 33 | 33 | 33 |
| aoe2.monkTasks | Array | 217 | 217 | 211 | 211 |
| aoe2.wonderCountdowns | Array | 2 | 2 | 2 | 2 |
| aoe2.relicsInMonastery | Array | 11 | 11 | 31 | 31 |
| aoe2.replayUnitAttacks | Array | 2 | 2 | 2 | 837 |
| aoe2.movePaths | Object | 25 | 25 | 25 | 25 |

Snapshot read boundaries, relative to the work157 run-1 directory above:

| Scenario | Arm | File phase | File bytes | Last write UTC |
| --- | --- | --- | ---: | --- |
| 120-24k | A | constructed | 8698156 | 2026-11-08T20:03:53.785322Z |
| 120-24k | A | settled | 8697150 | 2026-11-08T20:03:54.5550036Z |
| 120-24k | B | constructed | 8698156 | 2026-11-08T20:03:54.2313128Z |
| 120-24k | B | settled | 8697150 | 2026-11-08T20:03:54.5850131Z |
| 168-24k | A | constructed | 16913987 | 2026-11-08T20:21:39.6162937Z |
| 168-24k | A | settled | 16915783 | 2026-11-08T20:21:41.3037983Z |
| 168-24k | B | constructed | 16913987 | 2026-11-08T20:21:40.5903235Z |
| 168-24k | B | settled | 16915783 | 2026-11-08T20:21:41.3519723Z |

## Current behavior and shortcuts that remain unsafe

src/world-tick.ts:271–277 clears setter/removal bookkeeping and fingerprints every state value at tick start. Lines280–297 start from explicitly dirty keys and fingerprint only the other keys at diff construction. A dirty-marked slot already avoids the second scan. src/json.ts:67–69 validates then JSON.stringify's each fingerprint. Consequently a changed, setter-published large slot still pays start validation/stringification plus the setter's validation; an unchanged composite can pay both fingerprint traversals. A byte-size census cannot divide CPU among those activities.

src/world-observers.ts:221–235 validates but stores and returns live references. deleteState at244–252 and subsequent setState preserve removal/reinsert bookkeeping; equal-value setter calls still mark dirty. No change to these behaviors is authorized here. src/world.ts:115–119 separately validates and structured-clones state for serialize, and deserialize clones incoming state at272. Tick-diff payloads, a full serialized world and a recorder's detached output are separate operations.

Keep the prior counterexamples: endpoint0, between-tick mutation to1, in-tick mutation back to0 must emit the current1→0 change; reusing endpoint0 misses it. Endpoint0→1 between ticks with no in-tick mutation currently establishes baseline1 and emits no new state.set; reusing endpoint0 invents an in-tick change. Same-reference or equal-value setState calls, delete/reinsert and existing dirty/removal ordering cannot be replaced by final-value equality. A lack of listeners does not remove getDiff, recorder/history/client/render/debug or polling obligations.

Getter/toJSON behavior is also observable where currently supported. The JSON validator's Object.entries order and original getter exception identity are protected by tests/json-validation-contract.test.ts:56–75; arrays are read in index order. A frozen object can still have a getter closing over mutable data; a non-enumerable toJSON can affect JSON.stringify. Shallow Object.isFrozen, reference equality, serialized length, a persistent previous-endpoint fingerprint or a cached validation bit cannot certify safe composite reuse. Do not invent general Proxy serialization support: relevant operations differ.

Tick-start and diff-phase errors have distinct paths. Retain the existing tick-start exception behavior and diff_build_threw failure conversion/tick accounting for every default key (world-tick.ts:123–127,178–193,252–256). Removing validation for a selected explicit key is an intentional policy change for that key; it must not leak to other keys or be described as identical validation timing.

The current API reference's setState size sentence at docs/api-reference.md:2132 still says every state value is fingerprinted twice per tick. Source and current feedback correctly qualify the second scan as only for keys not already explicitly dirty. A future scoped implementation/doc change should correct that sentence, without implying any new measured improvement now.

## Default-preserving alternatives and their likely scope

A primitive-only path can avoid some temporary validator/fingerprint bookkeeping without an in-place alias problem. It still needs JSON equivalence for finite numbers/-0, string escaping, setter intent, deletion/reinsert, restoration and unchanged exceptions for invalid values. With one primitive slot in these worlds, it addresses at most one slot at each applicable fingerprint phase, not the hundreds of kilobytes dominating these inputs. No CPU saving can be inferred from the byte percentage, but the opportunity is bounded and not the principal E20 response.

Other internal alternatives remain open: a scalar-leaf fast path inside JSON validation could reduce call/breadcrumb work inside the large arrays/records while preserving eager object-getter ordering, lazy array reads, exact error paths, cycle/DAG handling, supported native effects and the following JSON.stringify. An internal allocation improvement may also help. These still traverse the same composite data and need actual measurement; this investigation neither implements them nor proves them worthwhile. E02's empty-component-dirty-container guard remains a separate allocation experiment and does not remove state scans.

If root prefers no new contract, the next bounded experiment should isolate such an internal change on the actual fog/visibility values, then check its inclusive state phase and whole-tick effect on both late saves plus a write-heavy control. Retain a same-source AA control and exact semantic/failure tests. A no-gain result is a valid disposition of that candidate, not permission to hide scans or declare all default-preserving optimization impossible. Do not sum the reported roughly30% JSON-validation inclusive share with clearStateDirty/getStateDirty shares: the stacks overlap. No fresh profile or new CPU percentage is supplied here.

## Actual fog-memory writer and ownership census

This bounded census searched current game src for the literal slot, lastSeenStaticCodec, getOrCreateMemoryMap and noteMemoryChanged, then read the concrete writer branches and their publication/restore boundaries. Factory/wiring matches in wirePreSeedOps, wireBridgeOps, registerBridgeSystems and registerAllSystems pass these callbacks into the one fog-memory system; they are not additional memory writers. This is source evidence for the current known call graph, not a proof against arbitrary computed-key access through the public raw World.

| Producer or boundary | Actual behavior and anchor | Consequence for an opt-in |
| --- | --- | --- |
| Lazy native cache read | bridgeStateAccessor.ts:65–74 structured-clones stored JSON before codec.deserialize; mapOfMapCodec at bridgeStateSerialize.ts:87–97 only builds native Maps from that detached input | Cache values do not alias the stored slot, including after hydration/reset. This read-side clone is as important as the write-side clone. |
| First player memory map | fogMemoryOps.ts:78–85 reads an existing inner map without marking; missing inner-map creation is wrapped in accessor.mutate | Creating the first map is a real publication event; ordinary reads are not. |
| Seen building/resource addition or appearance refresh | systems/fogMemorySystem.ts:61–74 compares all MemoryEntry appearance/generation fields; remember at88–91 installs a fresh entry only when different; building/resource callers are169–181 and203–214 | Preserve the equality predicate, fresh position objects, generation and same-tick shared native-cache behavior. Do not substitute byte length or identity. |
| Four forgetting/removal branches | fogMemorySystem.ts:133–135 removes a same-generation human-owned building with no enemy conversion;145–147 removes an unseen/unstarted-foundation entry;238–240 removes a gone previously human-owned building;243–254 removes a gone/recycled entity when its old footprint is seen | Every delete sets changed=true. The single final noteMemoryChanged at258 marks the slot. This covers conversion/ownership, foundations, disappearance, visible empty ground and recycled identities without altering those game rules. |
| Vietnamese startup reveal | vietnameseReveal.ts:98–102 uses accessor.mutate to insert/replace the enemy town-center MemoryEntry in the human owner's inner map | Bootstrap must still flush before a first recorded snapshot; do not treat this as ordinary per-tick-only activity. |
| Legacy save hydration | hydrateFromSavedGame.ts:73 invokes clearLegacyTier1MapSlots, whose hydrateFromWorldState.ts:51–58 clears detached native Maps; hydrateFromSavedGame.ts:239–262 rebuilds the fog inner Maps and fresh position/entry values inside accessor.mutate | Retain literal old-generation fallback and later bootstrap publication. The bulk clear alone has no dirty mark; the explicit hydration mutation supplies it. Do not opt in by changing hydration semantics. |
| Modern snapshot hydration | bootScenarioOrLoad.ts:84–101 chooses legacy side-map hydration only for schema1; schemas2/3 use world-state hydration. New accessors lazily decode the restored slot | Install runtime selection at the world factory; do not synthesize a new saved side-map or policy field. |
| Output publication | bridgeSnapshotSystem.ts:19–24 calls accessor.flush in output; registerOutputTail.ts:45–54 registers it after Tier3 sync. bridgeStateAccessor.ts:129–168 prevalidates dirty slots, serializes each, structured-clones it, then calls setState | This is the single ordinary stored-slot replacement route. Preserve its ordering relative to diff/recorder and its validation/exception behavior. |
| Initial and user-save publication | bootstrapFlush.ts:101–106 flushes native dirty slots before the bootstrap snapshot; saveGameOps.ts:43–57 flushes inside runMaintenance before full serialize | Preserve existing between-tick semantics. A save is not permission to invent a recorded diff or a pending-intention publication. |
| Replay cache reset/read presentation | ReplayController.ts:273–275 submits recorded commands, steps, then resets the accessor; bridgeStateAccessor.ts:171–175 drops native caches; fogMemoryOps.ts:138–158 builds fresh projected view objects with scalar coordinates | The projector does not hand out a stored position-object alias through this path. Seek/load/fork and reset must remain explicit test cases. |

For this path, a forgotten native markDirty is already a publication bug under the default engine: the accessor clones at both boundaries, so scanning stored world JSON cannot discover an unflushed native Map mutation. That makes the existing architecture a reasonable candidate for setter-only observation, but it does not excuse any missed notification or raw getState mutation. This proposal has not run the writer classes and does not certify them by search alone.

Additional census source identities under engine-pin-1107: systems/fogMemorySystem.ts SHA2563A14BF1C77AAB94D6460F8BF706963CCEAD267A0B4A2F9E9A8BFD2FC45FF6194; vietnameseReveal.ts CE63D6580C161BB5E23D334EA559760E5395AAB2DB9FF731A9890FFA36B54273; hydrateFromSavedGame.ts 11A9CF06B11E288B00343CB1F2EAAFE51C8D35D2F17E2FA8FBFF8ACF65D54FFA; hydrateFromWorldState.ts 69AB3D0C1205A5358475BA8C03548448C5F762BD3CEB8B0DA2B8DA480F5312E8; bridgeSnapshotSystem.ts 032E0E4E57CA927B2963393F5DA25B272E37BA7A448BD1E97C2396F38E3AB9B4; saveGameOps.ts EF17C4B2E2C742953784F6A3C2E11852EFE55D0DB496E51C41CD0133010FD030; bootstrapFlush.ts FE0F2EC5E3C2CD9BB204A29AB0924FF2A4BE357EB0AD8F94B260EC302AD2C6E3; ReplayController.ts E110E5B04B7F9C593118CBD15CB07FE7F4805A0E9A5C5065D246BE13F68B7AA2.

Existing whole-class test locations to retain and extend under both default/selected mode include tests/simulation/fogMemory.test.ts, fogMemoryOwnBuildings.test.ts, fogMemoryOwnBuildingConversion.test.ts, hiddenUnstartedFoundation.test.ts, tests/replay/vietnameseRevealReplay.test.ts, bridgeStateAccessor.test.ts and snapshotEquivalence.test.ts. Naming them is a proposed test matrix, not a claim that this task executed them. Add explicit alias/publication controls and restore/recording comparisons around the concrete branches above, rather than only a steady unchanged-memory timing case.


## Minimal optional contract for a materially different cost model

Proposed API shape for an owner decision, not implementation: a separate optional World runtime-options argument containing stateObservation.setterOnlyKeys, an exact-string key list copied at construction. Extend deserialize's existing runtime options with the same selection for callers who want it; do not add it to serialized WorldConfig, WorldSnapshot.state, snapshot version, SessionBundle metadata or a registration-manifest persistent field. The specific exported type/name can be finalized during accepted design, but the semantics below are the decision. Engine code contains no hardcoded AoE2 keys.

Default: absent/empty selection runs the present algorithm. All old call signatures and all unselected keys retain current observation, validation, live reference and failure behavior. Selected keys skip both automatic fingerprint phases; they continue using the existing setter/removal dirty sets. The declaration is immutable for that World instance, not a mid-tick toggle. Caller mutation of the supplied list cannot change it. Exact string keys are not case-folded or normalized. Deleting and reinserting a value does not erase the key's declaration.

Selected-key obligation: published payloads are treated by the application as stable between replacements, and meaningful updates are published with setState/deleteState in the same execution phases as today. The engine still validates every setState and full serialize; it does not freeze or clone more than today and does not promise to discover a hidden in-place write or its newly invalid value during skipped tick scans. getState and caller-owned input identity remain as today; therefore this is an explicit caller discipline, not enforced immutability. A raw-world escape that mutates a selected stored reference violates that opt-in contract. No public guarantee about accessors, toJSON side effects or validation being invoked on every tick is retained for selected keys; defaults keep those effects where supported.

Preserve temporal semantics rather than invent a better queue: clearStateDirty still clears bookkeeping at tick start. A between-tick setter is not newly promoted into the next diff by this feature. During a tick, equal/same-reference setter calls, delete/reinsert, removals and ordering stay exactly as before. The policy's promised parity applies to conforming application publications and existing phase boundaries, not to arbitrary hidden mutations.

Restoration is explicit. applySnapshot replaces data and resets bookkeeping but preserves the receiver's immutable runtime declaration, analogous to its existing preserved registration-bearing fields (world.ts:371–386,426–430); never copy a fresh deserializer's default over it. A newly created deserialize(snapshot) without options intentionally uses legacy observation, while deserialize(snapshot, systems, options) can select the policy at construction. The game must install the same fixed key selection in live, loaded and replay/fork world factories before any step/recording connection. Snapshot values remain ordinary JSON. Generic old readers use legacy observation and can read the same state; they incur the old cost. The policy itself is not reconstructible from snapshot bytes alone, and current registration-manifest checks would not prove matching selection. State/diff parity across those modes depends on the declared publication discipline, which must be tested. This is a deliberate factory-restored policy, not an undocumented claim of self-describing snapshots.

Start the consumer experiment with aoe2.lastSeenStatic only, not all43 keys. BridgeStateAccessor.mutate/markDirty at bridgeStateAccessor.ts:89–107 and flush at129–168 already serialize only dirty cached slots and structured-clone them before setState, separating native cache objects from stored state. fogMemoryOps.ts:18–31 and78–90 distinguish a read from actual mutation and require noteMemoryChanged. The concrete writer census above supports that existing discipline; it is not executed proof that every writer is correct. Preserve and test its reset/hydration, visibility-driven forget/removal, allied human sight and raw World escape boundaries before opting in. A whole-class missed-publication test is required.

Visibility may be a second scoped candidate only after the first passes. visibilityCell.ts:8–12,40–52 and visibilitySlots.ts:35–45 already publish through setState when dirty and conditionally publish the building layer. However, it has a separate dirty/refresh lifecycle and frequently changes; do not infer its correctness from the accessor path or widen the first registration to every state slot. The current source comment saying all slots are scanned twice also needs the same qualified wording if touched.

An engine-owned immutable-slot alternative would clone/validate and restrict access at insertion to enforce ownership rather than trust caller discipline. It could be valuable, but changes identity, mutation exceptions, getter observations and write/restore allocation costs and needs a different concrete design. A bare freeze flag is not that design. This proposal favors the narrower explicit publication promise because the game already maintains decoupled cached/serialized state.

## Proof and acceptance plan before adoption

1. Establish literal contract tests before code. Default-mode tests must retain the two between-tick counterexamples, in-tick original/getState aliases, same/equal setter intent, delete/reinsert, missing-key deletion, getter/toJSON behavior where supported, -0, arrays/holes/cycles and exact failure phase/identity/tick accounting. Mixed worlds must prove selected keys do not suppress an unselected key's hidden mutation. Keep tests/world-state.test.ts:58–93 and the JSON validation contract tests intact.

2. Define selected-mode expectations directly: ordinary replacement/removal has exactly the same complete diff payload/order; invalid setState still fails identically before publication; immutable selection survives list mutation attempts and applySnapshot; absent/deleted keys retain their selection on later insertion; unconfigured deserialize restores legacy mode, configured deserialize/factories restore selection. Deliberate hidden mutation on a selected value must demonstrate the documented lack of automatic diff detection rather than be disguised as parity. Full serialize must still reject newly invalid data. Avoid an extra markDirty API unless a separate need is demonstrated.

3. Consumer parity must compare full World.serialize, complete diffs, events, command/execution streams, economy and non-timing metrics at matched boundaries for both actual late saves, an idle case and an intentionally fog-memory-write-heavy fixture. Include live/save/load, applySnapshot, recorder connection before/after publications, initial/periodic/manual/terminal snapshots, raw full selfCheck, seek/fold and fork. Preserve ordinary recorder output and every component/state key; no expected-state injection, filtering of fog memory, oracle relaxation or replacement of existing assertions. Exercise missing markDirty/publication by an actual source mutation and require the intended full-state/replay assertion to fail.

4. Measure cost separately from parity instrumentation, under root's exclusive lane and exact source/artifact binding. Reuse the established small256 and late1000-tick, one-settle-step scheme as a bounded first experiment; account for construction, settle and any excluded first chunk explicitly. Compare same-source AA noise and at least three alternating default/selected pairs on each late input, plus the write-heavy case. A and B should use the same candidate engine artifact with only the runtime selection differing. Separately verify candidate-default behavior and cost against the shipped2.13 default so feature-off overhead is not hidden. No profiling result follows from this document.

5. Count actual phase/key fingerprint calls/visited data in a separate observation pass; do not estimate them as two times snapshot bytes or equate unchanged end values with no setters. Collect uninjected CPU profiles separately, preserving shared/unassigned ancestry and reporting inclusive state-phase cost without summing it with its nested JSON work. Record total step CPU/wall, allocation/GC evidence, post-GC retained heap and peak RSS separately. Repeated getter/validation tests establish semantics; counters alone do not.

6. Predeclare usefulness before launch: a proposed threshold is at least5% whole-step median CPU improvement on both late inputs, greater than observed AA noise, with consistent sign across the alternating pairs and no greater-than5% regression beyond noise in the write-heavy/default cases. Also report absolute milliseconds and all samples. Root may choose a different threshold before any measurements, but must not tune it after seeing results. A small/noisy gain does not justify new caller obligations. No FPS, whole-game/UI or constant-memory claim follows from a successful headless step comparison.

7. Independent exact review, engine public-surface/docs/minor-semver reconciliation and required gates remain mandatory before delivery. Game-specific defaults change only after its exact consumer adoption passes the whole-state/recording checks and normal required gates. Current unrelated full-human/native/corpus obligations remain open; this proposal consumes no route-control attempt or old work73 repair budget.

## Authority, risk and owner decision

Already authorized here: the bounded source/data investigation and this ignored proposal only. No implementation or execution grant was given. An ordinary default-preserving internal optimization experiment can be scoped by root without pretending it needs a new persistent-format decision, but it still needs explicit task allocation and the shared runtime lane.

Actual R8 decision for the larger route: authorize an additive per-key setter-observed engine contract with unchanged defaults, accepting that selected keys no longer receive automatic in-place change detection or tick-phase validation/getter effects; keep set/delete/full-serialize semantics and existing temporal boundaries; select policy as immutable runtime/factory registration with explicit applySnapshot/deserialize behavior; and permit a first AoE2 adoption experiment only for the audited fog-memory slot. The principal risk is an unannounced mutation producing live/snapshot state that differs from the recorded diff stream. Existing scoped AoE2 work and the separate human FIFO schema3 decision do not themselves choose this engine state-observation contract.

No new persistent field, save migration, BundleCorpus format, dependency, model/provider change, security-boundary relaxation, broad game policy change or default scanner removal is requested. If self-describing policy restoration is required instead of the stated runtime/factory model, stop and present that additional format proposal; do not smuggle it into this one.

Ready-to-decide recommendation: approve the narrowly scoped explicit-policy design/proof above if the owner wants to pursue removal of the dominant composite scans; otherwise keep default semantics and run at most a separately bounded internal traversal experiment. In either case E20 remains open until measured consumer acceptance or an explicit owner disposition. The present data rejects the primitive-only remedy as the principal explanation, not all possible default-preserving improvements.

## Limits and retained output

These are two particular old save inputs and four A/B state boundaries, not a survey of all matches, later game revisions, changed-slot frequencies or CPU profiles. File size differs substantially between compact saves and pretty constructed-world outputs; this is why the census uses compact per-value bytes. Existing work157 timing output was read only for construction/settle provenance and completion, not adopted as an E20 performance result. Neither historical roughly30% validation observations nor the present byte percentages are additive performance estimates.

All data streams/documents were closed after bounded reads; no model/runtime/browser process, server or watcher was created. I performed no bulk source census, build, code export or mutation of the running cost harness. This file is intentionally retained for root's owner-decision preparation; source, index, policy, work71 records and previous authored reviews remain unchanged.
