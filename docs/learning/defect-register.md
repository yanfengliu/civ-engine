# Defect Register

The standing list of defects the user found before a gate did.

Unlike [lessons.md](lessons.md), entries here are not deleted when they become gates. A lesson is deleted once the machine enforces it, because nobody needs to read a rule a linter applies. A register entry is kept for the opposite reason: it records what the gates could not see at the time, and that blind spot is where the next defect comes from. Read it when adding or trusting a gate.

Each entry: the symptom as the user reported it, what the investigation found, the root cause, and the check that covers the defect's whole class from now on.

---

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
