# Review 0: implementation

## Target

Unpublished engine89 candidate on base 34de6af4af335f465322d084e43d13d36ef7dde6; recoverable source packet 4B92C8D6B748ABD48859F8ADDFD8BEBA4BB86DB48EE5D768AD97589B9864BA41 and retained candidate-1/source copies. The report supplies exact paths and supporting hashes.

## Reviewers and coverage

The independent native reviewer and exact coverage are attributed in the complete report below. External CLI coverage was unavailable; it is not inferred. The integration owner added this structural wrapper on 2026-11-08; authored report bytes are unchanged, SHA256 542fd533391e0b4edc7bcb1964fa28c9f3afce22b34f7963ae0fdeefb9219299.

## Reports

# Work 89 exact-source implementation review

Reviewed 2026-11-08 by the assigned independent native Astra/xhigh lane. **No material findings in this candidate.** The narrow runtime implementation, public types and feature documentation align with the owner-approved setter-only observation contract. This is source-review acceptance for continued bounded verification, not shipment, consumer-adoption or performance acceptance. The coordinator reported both external CLI lanes unavailable from earlier attempts; they were not retried here and are not represented as approvals.

## Exact target and scope

Tree: `C:/Users/38909/Documents/github/civ-engine-worktrees/setter-state-observation-1108`, supplied base `34de6af4af335f465322d084e43d13d36ef7dde6`. The reviewed source packet is `tmp/setter-state-observation-1108/source-packet.json`, SHA256 `4B92C8D6B748ABD48859F8ADDFD8BEBA4BB86DB48EE5D768AD97589B9864BA41`; acceptance preparation is `candidate-1/acceptance-preparation.json`, SHA256 `CD5F756178EF1D2BF2C2168394B31070EAF189017D0080CA35E8C6E1014F4399`. The approved design remains SHA256 `2FECADBC12CFF7BCC4A30B7D219249B38C1673E93618F05EADD5417BF5B3FD39`.

Independently rehashed all six production files, two surface pins, five new tests and thirteen feature documentation files against those packets and their retained `candidate-1/source/` copies: zero mismatches. Rehashed all 405 files in `candidate-1/compiled/`: zero mismatches and 1,619,298 bytes, against compiled-manifest SHA256 `3AC80387D5AD70213A38AC5C5DCBB601A1F5C19BB33DAD6635A48881551D788C`. No compiled module was imported. Root-owned work71/work88/priorities/review records were excluded from feature review. All citations below are relative to the reviewed tree.

The adjacent binding retains the exact production/test/design bytes, source/document patches, supporting lifecycle sources and evidence hashes. Complete documentation copies remain recoverable in the verified frozen `candidate-1/source/` folder; their hashes and paths are also bound. Both live package metadata and `src/version.ts:7` still say 2.13.0: this is explicitly an unpublished candidate, not a released additive API under the old version.

## Correctness and compatibility assessment

`src/world-core.ts:41-54,137-139` validates a present array of string keys and copies selection into an instance-owned Set, with absent/empty selection represented by null. Exact matching, empty keys, duplicate keys, later insertion and caller-list mutation are handled without normalizing names or retaining the caller's list. The new type stays separate from serialized `WorldConfig` (`src/world-types.ts:20-29`). The only tick algorithm changes are the selected-key exclusions at `src/world-tick.ts:276,284`; existing dirty/removal/baseline clearing still precedes the scan at lines 271-278, and the diff begins with explicit dirty intent at lines 281-298. Default/unselected iteration and fingerprint calls stay in the same order. The feature adds no hidden history mirror, alternate queue or game-specific state key.

Important code outside the patch was read directly. `src/world-observers.ts:221-251` still validates before storing the supplied live reference and marking it dirty, preserves same-reference setter intent, and retains deletion/reinsertion bookkeeping. `src/json.ts:8-69` still owns exact validation order and validation-then-stringify fingerprint behavior. `src/world.ts:117-121` still validates and clones every state value for full serialization. Default tick-start exceptions continue escaping the unchanged start path, while diff construction failures retain the existing consumed-tick conversion (`src/world-tick.ts:123-127,178-193,240-259`). Selected keys intentionally omit automatic validation/getter effects; the implementation does not describe that loss as default-equivalent behavior.

Deserialization passes the copied runtime policy to construction before systems are registered (`src/world.ts:171,202-206,320-335`), while existing strict-default and poison behavior remain intact. `applySnapshot` still builds a temporary deserialized world and transfers state into the receiver (`:352-374`). Its transfer replaces dirty/removal/baseline containers at lines 429-433 but does not transfer `setterOnlyStateKeys`; receiver selection therefore survives replacement, absent/deleted keys and poison recovery. `src/serializer.ts:7-98`, the `World.serialize` config construction at `src/world.ts:89-108`, and the session bundle definition contain no new policy field. Registration manifests do not certify the selection, as the docs explicitly explain.

The public API is additive: second constructor argument, the existing third deserialize argument extended by intersection with `restorePoison`, and the type exported through World and both package entries. The affected surface fixtures name the type and inherited protected registration field; the emitted declarations agree (`dist/world-core.d.ts:68`, `dist/world.d.ts:18`, `dist/index.d.ts:27`, `dist/index.browser.d.ts:27`). `applySnapshot` retains its restorePoison-only signature. The type tests cover old call forms, typed-state preservation, readonly key lists, both package entries, and rejected attempts to put policy in persisted config or replace it through applySnapshot (`tests/world-state-observation-types.test.ts:12-37`).

## Tests and documentation assessment

The new contracts materially exercise the intended behavior rather than only the helper: default/mixed worlds and both live aliases; both between-tick counterexamples; explicit equal/same-reference writes; complete diff shape and ordering; deletion/reinsertion; selection copying; exact keys; primitive values; and strict windows (`tests/world-state-observation.test.ts:20-174`). Error contracts distinguish automatic getter/toJSON omission from retained setter/serialize effects, preserve original tick-start errors, distinguish diff-phase consumed-tick failures, retain unselected failures, reject hidden invalid values at full serialization, and reject ordinary malformed lists (`tests/world-state-observation-errors.test.ts:21-179`). Existing default World state tests at `tests/world-state.test.ts:58-93` and JSON getter/array-order controls at `tests/json-validation-contract.test.ts:49-79` remain relevant, unchanged controls.

Restoration tests cover matching serialized data/config, configured and unconfigured deserialize, caller mutation, receiver registration/listener preservation, selected keys absent in either timeline, bookkeeping reset, legacy strict defaults, restorePoison and recover (`tests/world-state-observation-restore.test.ts:23-158`). The ordinary recording fixture compares full snapshots, diffs, command/execution/event streams, initial presence/absence, periodic/manual/terminal checkpoints, raw selfCheck with complete coverage, every seek/fold position and fork output under both selected and default replay factories (`tests/world-state-observation-recording.test.ts:19-69`). This small engine fixture supports engine compatibility; it does not replace the planned real-game fog publication and clone controls.

The thirteen feature-document changes explain the new type, argument positions, exact-key validation, omitted scans, live-reference ownership obligation, retained setter/serialize checks, unchanged temporal clearing and factory restoration. The API contract is explicit at `docs/api-reference.md:154-171`, and constructor/deserializer/applySnapshot descriptions agree at lines 1203-1223, 2390-2414 and 2432-2440. The serialization guide at `docs/guides/serialization-and-diffs.md:88-100` and recording guide at `docs/guides/session-recording.md:140-145` warn that saved bytes and registration checks cannot restore/verify this policy. README, the relevant guides, architecture row/boundary/tick diagram, ADR63 and the drift row are updated without claiming a measured speedup.

## Verification and remaining acceptance

Read the retained baseline stdout: 70 cases, 34 failed assertions and 36 passing controls. Read the retained focused stdout and the four native receipts: 123 cases in eleven files pass; typecheck, affected lint and private build exit 0. The receipt hashes match the acceptance preparation. These are inspected worker execution artifacts, not tests run by this reviewer; no broader full-gate result is inferred.

Remaining work is already explicit in the approved plan and is not waived by this review: exact current consumer integration; independent missed-publication and clone-removal controls; whole-state/diff/event/command/execution/economy parity on both actual late inputs plus idle/write-heavy cases; real recording/load/applySnapshot/raw replay/seek/fork evidence; candidate-default versus shipped-default cost; the frozen AA/pairing/exclusion/resource/attempt arithmetic; and **at least 5% median whole-step CPU improvement on both late inputs beyond AA noise, consistent sign, with no greater-than-5% regression beyond noise in write-heavy/default controls before shipment**. No measurement has established those criteria. Additive minor version/changelog/README reconciliation, full engine gates, hosted/retained-artifact verification and delivery remain pending. A small or noisy gain remains grounds to reject the experiment, not to weaken the threshold.

Only bounded source/document/receipt reads, Git-read attempts and hashing were performed. Git worktree diff was unavailable in this read-only environment; the retained exact patch, baseline preimages and file hashes were inspected instead. No source, tests, feature docs, dependencies, locks or root-owned records were edited. No tests, gates, imports, browser/provider work or performance experiments ran here, and no persistent process was created. This authored report and binding are intentionally retained evidence in the authorized ignored civ-engine folder.


## Findings and disposition

No material source finding. Root accepted continued bounded measurement only. The later fixed CPU screen rejected shipment, recorded in round1 and the plan; the original positive source review is preserved.

## Verification

Reviewer inspected 34 genuine failed assertions, 36 passing controls and 123 focused passes with native typecheck/lint/build zero. No tests were run by the reviewer. The first work90 full gate subsequently rejected the missing Target heading in this record; this wrapper corrects structure without rewriting the report.

## Round outcome

Source review accepted; measured usefulness and shipment were still pending at this round. Later rejection does not change this historical outcome.
