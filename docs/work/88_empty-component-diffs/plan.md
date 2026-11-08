# Measure and avoid empty component diff allocations

Status: active
Owner: Codex root
Created: 2026-11-08
Updated: 2026-11-08

## Problem and outcome

World.buildDiff constructs two empty arrays and an object for every clean component store, then discards them. Work71 review4 identifies this narrow default-preserving E02 experiment. Avoid those containers only if literal contracts and measured allocation/CPU evidence justify it. This does not solve world-state fingerprint costs or disable diff production.

## Scope

Internal component-store dirty membership and World's component collection branch only. Keep direct getDirty results, nonempty order/live payloads, strict/semantic behavior, all observers and no-listener pull access, state/resources/tags/entities, failure phases, public exports, persistent formats and dependencies. No lazy diff, listener-count skip, state cache, policy, game adoption or E20 semantic change. Engine2.13.0 ca5e15a is the baseline.

## Approach

Prepare tests first and obtain a genuine empty-allocation RED while full-diff controls remain green. Add an internal dirty-membership query only after RED. Exercise one deliberate nonempty-suppression mutation and exact restoration. Use existing publication, state, observer, recorder/client/render/history and failure suites as compatibility controls. Independently review exact candidate and measured evidence before acceptance.

Measure A/A and alternating A/B on clean, sparse and dense store workloads with zero/one/multiple observers and recorder, plus actual saved game component/state inputs. Compare complete diffs, state, events/executions and nontiming metrics. Count avoided containers separately from CPU/wall distributions, GC activity, retained heap and whole-process RSS. Never infer retained allocation from a negative GC delta. Keep dense-write regressions visible; reject small/noisy or omitted-work wins rather than widening scope. Preparation is not an executed measurement.

## Acceptance criteria

- [x] Genuine baseline RED and unchanged direct-store/full-diff behavior controls.
- [x] Exact compatible implementation with valid nonempty-suppression control and restoration.
- [x] Representative source-bound A/A and alternating A/B evidence; shipment explicitly rejected.
- [ ] Independent exact review, required gates, truthful patch version/docs if shipped, main/push/CI/archive verification and owned cleanup.

## Implementation steps

- [x] Allocate work88 and own isolated tree; inspect work71 proposal and current code.
- [x] Prepare and execute discriminating tests, then implement only the accepted narrow branch.
- [x] Measure, review and reject shipment under the declared criterion.
- [x] Complete delivery or record rejection with retained evidence.

## Outcome

The narrow internal guard is rejected for shipment; its exact patch is retained. Corrected baseline has one genuine allocation RED (66 empty getDirty calls across two ticks) and six passing controls. First RED also had an invalid onDiff-unsubscribe test cleanup premise; the exact test/log is retained, and the corrected test uses onDiff/offDiff without changing assertions. Candidate passed199 cases/12 maintained files. A real nonempty-suppression mutation failed both strict/semantic full-diff assertions; exact source restored, then all seven new tests, strict types, affected lint and build passed. Four owned runners observed7/7/17/19 process instances respectively, zero stops/leftovers; root released its exact lock after the final census. The complete measurement and rejection are recorded in [measurement.md](snapshots/measurement-summary.md); no release or full-game benefit is claimed.


## Measurement preparation

Nine isolated publication workloads cover64 synthetic stores and actual120/168 saved inputs (11 component types,48,311/95,222 component rows,41 state keys). Clean, sparse and dense writes use zero/one/two listeners, with a recorder on dense cases. These are engine publication workloads, not live game simulations. Each has one A/A plus five A/B fresh-child comparisons, alternating arm order within each child; full diff/state/events/nontiming metrics and recorder tick records must match outside timing. Instrumented ten-tick counts run separately and restore getDirty in finally. Whole-process post-GC memory/RSS holds both arms, recorders and final snapshots and is explicitly not per-feature retained memory. The byte-bound baseline is the actual retained2.13 archive; candidate dist differs only in seven declaration/source-map/runtime files belonging to the two edited modules. The full54-child matrix completed; see [results and rejection](snapshots/measurement-summary.md). Full output parity holds, but saved-game inputs do not establish useful benefit.

## Independent disposition

Root read the complete [review0](reviews/0_implementation.md), authored report SHA25673438E5D9220250CFAC662B02C094987A1701834C38698A40C6661510B54D14C, and accepted its no-shipment finding. The rejected source/test patch is retained; source is restored byte-for-byte to its original checkout preimages and has an empty Git diff to base. An initial post-restoration check compared CRLF checkout bytes to LF Git blobs and stopped; the corrected check verifies both exact original preimages and normalized Git content. No code mutation or retest was needed. The initial result-summary path was outside the allowed work-folder shape, so the authored summary now lives under snapshots/measurement-summary.md. Docs-only delivery and owned cleanup remain.

## Docs-only push gates

The rejected code and its allocation-specific test are absent from the deliverable. All eleven required local push gates passed tree56d5b99c4e468638f17cc5cf409063ee57daadff, with2,113 root tests plus one existing TODO across126 files and22 MCP tests. Node24.22.1/npm11.6.2; seven moderate development advisories, none in production or MCP. A fresh private MCP install (141packages, scripts disabled) plus the full gate took39.228seconds. The owned watcher observed145 identities, zero stops/leftovers; a fresh task census was empty and the exact root lock was released at2026-11-08T20:01:11.4287214Z. Only this acceptance record follows that gated tree; code/tests/metadata are unchanged. Main/push and final retention/cleanup remain pending.

## Delivered rejection and retained artifact

Docs-only rejection shipped atmain/originf50e5d481308b28e5b97db9036c1ebd6654b9745, tree18804e85d93a999923df5f1959510fcf28c855a4. HostedCI42518280541 completed successfully in Node20/22/24 and publish-dist. The subsequent full docs gate had rebuilt local dist to baseline; an isolated60-second-bounded compilation reconstructed all404 originally measured candidate files exactly against the original manifest, native0, without changing shipped source or rerunning performance. Primary ignored tmp/work88-closure/evidence retains266 files/1,618,866 bytes with matching hashes; retention manifest12a854b5e0412af0defaf6f4b3e64968acfbe0d2443c4be8a04d5ad175d170dc. Candidate reconstruction and original retained baseline are kept separately. This worktree remains temporarily owned for the current backlog documentation checkpoint; final tree/branch cleanup is not yet claimed.

The documentation checkpoint passed all11 push gates on tree06e728f856a74870b43033c6f050c12eeac8b654 in28.097seconds:2,113 root tests plus one existingTODO,22 MCP tests, types/lint/build/pack/benchmark and both root audits/MCP audit. The watcher observed149 owned identities, zero stops/leftovers, and released its exact lock. Only the latest owner decision and completed158 evidence disposition were added afterward; authored proposals/reviews and source/tests/metadata are unchanged.
