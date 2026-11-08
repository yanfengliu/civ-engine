# Defect Register

The standing list of defects the user found before a gate did.

Unlike [lessons.md](lessons.md), entries here are not deleted when they become gates. A lesson is deleted once the machine enforces it, because nobody needs to read a rule a linter applies. A register entry is kept for the opposite reason: it records what the gates could not see at the time, and that blind spot is where the next defect comes from. Read it when adding or trusting a gate.

Each entry: the symptom as the user reported it, what the investigation found, the root cause, and the check that covers the defect's whole class from now on.

---

## 2026-11-08 — Whole-cell ownership could not admit movement, and metadata errors mutated claims

**Symptom:** Downstream E06 required a farm or unstarted foundation to exclude new placement while admitting units, including a claim created beneath existing units. The binding treated every footprint as a movement blocker. No game-specific object policy belongs in the engine.

**Root cause and correction:** Exclusive placement and movement consulted the same raw claim without a binding policy. Add occupy-only blocksMovement:false while retaining raw placement ownership, independent reservations and capacity. Inspection also found metadata normalization after mutation in occupy/reserve/occupySubcell; preflight now makes these errors atomic, with explicit changed invalid-input conflict precedence.

**Class checks:** tests/occupancy-placement-only.test.ts covers all movement/subcell queries, placement exclusion, under-unit claims, reservations, normalized repeats, policy/metadata versions, failed moves/transitions and release/destroy/ID reuse. tests/occupancy-claim-atomicity.test.ts checks all three mutations on legal/conflicting/invalid-coordinate targets. tests/occupancy-movement-queries.test.ts forbids full-state/status recursion and extra default-path identity lookups, and checks actual reset/preflight counters. tests/occupancy-claim-types.test.ts pins both entries and disallows policy on reserve/block. Literal unchanged-source RED:21 failures/8 passes; first affected GREEN:52 passes; expanded GREEN:79. Seven deliberate controls independently break raw subcell filtering, placement exclusion, solid crowding conflict, reservation independence, policy versioning, metadata preflight and release cleanup, then restore exact bytes. No consumer behavior, throughput or persistence proof is claimed.

## 2026-11-07 — Component docs promised mutation detection that the store does not perform

**Symptom:** E23's API reference said direct mutations are detected for diffs, contradicting the component-registration contract and existing ComponentStore negative test. Its read example and several tutorial systems mutated live components without publishing. The spatial guide also called setPosition the only movement write despite setComponent and patchComponent synchronizing the configured position key.

**Class check and correction:** `tests/component-publication-contract.test.ts` proves same-pass identity, return/replacement, recorded publication, strict/semantic raw-write negatives, an already-dirty alias bound, configured position grid sync, strict checks before callbacks and non-rollback callback/JSON/position failures. `tests/component-publication-docs.test.ts` pins the corrected live claims against actual store behavior and package barrels, including E12's internal applyTickDiff table label. Four documentation checks failed before correction; nine selected source/doc mutations fail their discriminators and restore exact bytes. Runtime behavior is unchanged. AoE2's separate unrecorded Gatherer writes and chosen-route persistence omission remain game-owned acceptance work.

## 2026-11-07 — Paused intentions lacked a validation-only engine entry point

**Symptom:** AoE2 E03 reports human commands disappearing across paused save/load. Its game-owned pending intentions differ from engine queued commands; calling submission merely to validate allocates sequences, emits results and queues execution, so it cannot safely stage a saved intention.

**Engine class check and fix:** `tests/world-command-precheck*.test.ts` and `tests/command-precheck-types.test.ts` cover all accepted P01–P26 contracts: original-input/current validators, JSON clone and hostile callback failures, detached rejection details, no engine-owned queue/sequence/observer/history/warning effects, strict caller phase, readonly transaction exclusion, revalidation and unchanged legacy submission. Twelve temporary regression controls fail their named discriminators and are restored. `World.precheckCommand()` supplies the missing observation without changing a persistence format. The whole paused-submit/save/load consumer class remains open until AoE2 adopts staged intentions and passes its own parity/save checks; this engine capability alone does not close E03.

## 2026-11-07 — Visibility state reads repeatedly sorted unchanged collections

**Symptom:** AoE2 E19 measured visibility serialization taking more CPU on a live-grown world than the same loaded state. Current source still sorted player/source/explored collections on every read, including repeated unchanged reads and movement that changed no membership or explored cells.

**Class check and fix:** `tests/visibility-order.test.ts` covers warm read ordering work, movement with stable exploration, mixed numeric/string/non-ASCII IDs, membership churn, player recreation, duplicate loaded state, output copies and batched edits. Three tests first failed with 80/4/4 redundant sorts; restoring per-read player sorting then failed three cases again. `tests/visibility-oracle.test.ts` compares full state, visible/explored cells and existing metrics to an independent cell-scan oracle across three seeded 60-batch churn/load sequences. Private caches preserve canonical state while eliminating redundant sorting. Work79's retained benchmark compares verified2.8.1 with the candidate on 128x128 cells, 279 sources and 60 moving batches; states/digests/metrics match, with explicit retained-memory cost and no game-throughput claim.

## 2026-11-07 — Render projection erased typed components and state

**Symptom:** idle-life's worker had to cast a fully typed World to an erased World for RenderAdapter and cast it back in its projectors. Its compatibility sentinel documented this upstream boundary, but engine tests only used the default registry/state types.

**Class check and fix:** `tests/render-typed-world.test.ts` proves inferred and explicit typed worlds, entity/frame callback read types, command/event payload errors, existing generic positions and actual snapshot/tick messages. Typecheck first failed on the real World assignment and lost callback types. Trailing defaulted component/state parameters now carry the existing World type throughout the adapter and projector without changing runtime behavior. World's intentional generic component/state fallbacks remain. Consumer cast removal is tracked separately.

## 2026-11-07 — External render changes required whole-world projection

**Symptom:** AoE2's November 6 large-map measurements attributed 59.6-68.5% of tick time to reconnecting RenderAdapter after external combat-state changes. One healing unit forced projection and JSON validation of every entity because only ordinary entity/component/resource diffs could request projection.

**Class check and fix:** `tests/render-invalidation.test.ts` covers selected external-data changes, duplicate/ordinary changes, filters, hide/reveal, lifecycle/generation changes, callback requests and disconnected behavior. `RenderAdapter.invalidate()` queues generation-bound identities for the next diff without modifying authoritative state. The 10,000-entity case requires exactly one projector call and compares its applied result to a fresh full projection. All eleven initial cases failed on the missing API before implementation; a separate generation-reuse case verifies stale identities. This is a producer capability and work-count proof; AoE2 adoption and real map throughput remain separate acceptance.

## 2026-10-02 — FileSink iterators materialized whole JSONL and hid completed malformed rows

**Symptom (downstream E11/E13):** advertised streaming iterators could exceed the native aggregate String limit. A malformed completed row could be ignored when its contents matched the final unterminated fragment.

**Investigation and root cause:** the baseline readFileSync/split/parse-all path materialized a stream before yielding. Content equality classified tail tolerance; broken\nbroken therefore hid a physically completed malformed first row.

**Class check and fix:** tests/file-sink-reader.test.ts exercises all five public generators against literal65536-byte positional reads, first-next fstat horizons, independent append exclusion, LF-vs-final-tail classification, valid prefix before corruption, Unicode/BOM/legacy replacement decoding and descriptor/error precedence. The private fixed-block StringDecoder reader yields records individually and closes in finally. tests/doc-claims.test.ts observes actual public reads and pins accurate API/guide claims plus largest-record/toBundle/corpus/MCP materialization bounds.

**Evidence and instrument correction:** eager/parse-ahead/content-tail/no-finally/close-masking controls failed10/5/5/5/30 selected cases, with exact restored225/225 GREEN/typecheck/lint. The original six malformed-byte array rows were vacuous despite183/225 PASS; corrected object rows/count assertions prove13 seam comparisons, and the original callback-shape control fails six count assertions. Independent review2 retracts round1's mistaken coverage claim. The single reviewed native proof returned0/PASS on private compiled2.6.1: independent536870912 ASCII bytes and32768 bounded16384-byte LF rows exceed native Node24.12.0 MAX_STRING_LENGTH536870888. Eager readFileSync utf8 threw native ERR_STRING_TOO_LONG; all32768 public iterator records and generated/independent/candidate SHA256469d609bb6e2504e792581fa7b325e9fef72e24f33b0ee76cc4256576620b839 matched.101 source/config and388 compiled hashes were unchanged. Job5.633s/user2.140625s/kernel1.484375s had active0/cleanup true, with no timeout/cleanup errors and marker fixture absent. This is bounded-record correctness, not throughput/peak-memory or whole-bundle constant-memory evidence. Final full11/integrated/hosted gates and all21 game consumers, including E11/E13 adoption and E21 metrics/memory adoption, remain open.

**Record protection:** an earlier CRLF-sensitive separator insertion silently failed to add this entry; this heading-anchored insertion is verified by rereading the resulting artifact and exact entry count. Complete authored reviews/control/native receipts remain preserved in work74 and ignored aoe2/tmp/engine-reader-m8-1002/.

## 2026-10-01 — Self-check success hid unverified recording intervals

**Symptom (downstream feedback):** selfCheck could return ok true after checking only the snapshot-bounded prefix of a longer recording, and its zero-segment no-payload result looked like deterministic success.

**Investigation and root cause:** the loop compared adjacent recorded snapshots, while ok represented only divergence findings. There was no coverage result for the replay horizon, unanchored tail, skipped failure segments, early stop or disabled checks. Missing tick rows defaulted to empty expected events. An incomplete recording could also contain snapshot endpoints above its persisted replay cap.

**Class check:** tests/session-self-check-coverage.test.ts uses literal independent intervals/endpoints for terminal-disabled tails, no payloads, zero segments, empty horizons, all-disabled/selected checks, failure boundaries, early stop, legacy metadata, incomplete caps, nonzero starts and missing tick rows. Consumer assignability and exact world-construction/step counts are pinned. Original coverage absence, raw-endTick-only bounds, above-persisted endpoints and missing continuity checks are deliberate mutation controls. Coverage describes performed comparisons against supplied recordings; it does not prove provenance or every intermediate state. Existing ok and exception families remain.

## 2026-08-31 — CI red for 47 days behind a green local gate

**Symptom (as reported):** "Fix Github CI failure."

**Investigation:** `main` last saw a green CI run on 2026-07-15. It went red on 2026-07-23 and stayed red for **27 consecutive pushes across 47 days**, every run failing in 15–30 seconds. The failing step was the same one every time: `npm audit --audit-level=high`, the fifth step of the `test` job, which meant every step after it — tests, typecheck, lint, build, pack, the benchmark gate, and the entire `mcp/` subpackage — had been unverified on a remote runner for 47 days. Four high-severity advisories were live against transitive dev dependencies: `brace-expansion` (via eslint/typescript-eslint), `js-yaml` (via eslint), and `nanoid` + `postcss` (via vitest); `mcp/` additionally had `ip-address`. All were fixable within semver by `npm audit fix` — no manifest edit, lockfile-only. Running the other ten CI steps locally confirmed every one of them passed, so the audit was the sole failure and no defect was hiding behind it.

The outage was not confined to a red badge. `publish-dist` declares `needs: test`, so it had not run since the last green build: the rolling `engine-dist` tarball that downstream repos fetch in **their** CI was last refreshed 2026-07-15. Every downstream build for 47 days resolved a 47-day-stale engine, which is the failure mode this repo's own invariant warns about ("a red or unpushed engine blocks downstream builds").

**Root cause:** Not the advisories — those are routine and the fix was mechanical. The defect is that nothing surfaced them for 47 days. Two causes compounded:

1. `npm audit` is **time-dependent, not diff-dependent**. A newly published advisory against an unchanged dependency turns a green repo red with no commit at all. The Gates section documented the audit as a conditional — re-run it "on a dependency change" — and all 27 commits were docs-only fleet-canon syncs. By the documented rule the audit correctly did not apply, so it was never run locally. The four routine gates (`test`/`typecheck`/`lint`/`build`) all passed, and they were the whole local signal. Local green, remote red, no contradiction visible to the author.
2. The runs were never watched to a conclusion. 27 pushes each produced a red run that nobody read, so the outage compounded silently instead of being caught on push #1.

The lockfiles also carried a stale `version` field (`1.4.0` root, `1.2.0` in mcp's engine reference, against an actual `2.4.1`), evidence they had not been regenerated since v1.4.0. Not a failure cause — `npm ci` does not check that field — but it corroborates that the dependency tree had gone untouched for a long time.

**How it is checked from now on:**

- `npm run gates` ([scripts/gates.mjs](../../scripts/gates.mjs)) runs all eleven steps CI runs, in CI's order, **unconditionally**. There is no longer a judgment call about which gates a given commit needs, because that judgment is precisely what failed — a diff-keyed conditional cannot see a time-dependent gate. It also runs the whole list past the first failure, so one invocation surfaces every failure; the outage was prolonged by the opposite habit, which costs a remote round trip per defect. Sabotage-verified: a deliberate type error in `src/` is reported as exactly two failed steps with reproduce commands and exit code 1.
- CI now runs on a **weekly schedule** (`cron: 17 6 * * 1`), so an advisory published against an unchanged tree is found by the clock rather than by whoever pushes next. The concurrency group gained `github.event_name` so scheduled runs and push runs on the same ref no longer cancel each other — cancelled push runs read like flakes and hide real failures.

- The CI matrix now runs Node **24** alongside 20 and 22. It ran only `[20, 22]`, while `.nvmrc` pins 24 and every local gate runs on 24 — so the one version the fleet actually develops on was the one version CI never proved. Found while auditing whether `npm run gates` truly mirrors CI; it did not, and neither did CI mirror the developer. Same class as the headline defect: a gap between the local signal and the remote one, invisible from either side alone.

**Residual gap (stated, not fixed):** `npm run gates` runs on whatever Node the developer has. It cannot prove the 20/22/24 matrix, and it does not run `npm ci`, so a lockfile that disagrees with its manifest is still caught only by CI. Local green raises the odds of remote green; it does not guarantee it. The push is still finished when the remote gate says so.

**Class covered:** any gate whose result can change without a code change, and which the local routine therefore skips. `npm audit` is the instance that fired; the unconditional runner plus the scheduled run cover the class.
