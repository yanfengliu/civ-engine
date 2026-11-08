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
- [ ] Representative source-bound A/A and alternating A/B evidence, accepted benefit and bounded costs, or explicit rejection.
- [ ] Independent exact review, required gates, truthful patch version/docs if shipped, main/push/CI/archive verification and owned cleanup.

## Implementation steps

- [x] Allocate work88 and own isolated tree; inspect work71 proposal and current code.
- [x] Prepare and execute discriminating tests, then implement only the accepted narrow branch.
- [ ] Measure, review and decide whether the candidate merits shipment.
- [ ] Complete delivery or record rejection with retained evidence.

## Outcome

The narrow internal guard is implemented but not accepted for shipment. Corrected baseline has one genuine allocation RED (66 empty getDirty calls across two ticks) and six passing controls. First RED also had an invalid onDiff-unsubscribe test cleanup premise; the exact test/log is retained, and the corrected test uses onDiff/offDiff without changing assertions. Candidate passed199 cases/12 maintained files. A real nonempty-suppression mutation failed both strict/semantic full-diff assertions; exact source restored, then all seven new tests, strict types, affected lint and build passed. Four owned runners observed7/7/17/19 process instances respectively, zero stops/leftovers; root released its exact lock after the final census. No performance result or release acceptance is claimed.


## Measurement preparation

Nine isolated publication workloads cover64 synthetic stores and actual120/168 saved inputs (11 component types,48,311/95,222 component rows,41 state keys). Clean, sparse and dense writes use zero/one/two listeners, with a recorder on dense cases. These are engine publication workloads, not live game simulations. Each has one A/A plus five A/B fresh-child comparisons, alternating arm order within each child; full diff/state/events/nontiming metrics and recorder tick records must match outside timing. Instrumented ten-tick counts run separately and restore getDirty in finally. Whole-process post-GC memory/RSS holds both arms, recorders and final snapshots and is explicitly not per-feature retained memory. The byte-bound baseline is the actual retained2.13 archive; candidate dist differs only in seven declaration/source-map/runtime files belonging to the two edited modules. No measurement has launched.
