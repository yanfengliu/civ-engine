# Measure JSON validation without weakening its contract

Status: active
Owner: Codex root
Created: 2026-11-08
Updated: 2026-11-08

## Problem and outcome

Work154's post-renderer profiles leave JSON validation around30% of sampled inclusive tick CPU in the named late-game windows. This is overlapping sampled cost, not a universal share or a promised speedup. Test whether avoiding eager diagnostic-path strings reduces that cost while preserving every validation and observation contract. Do not introduce trusted-write or state-observation opt-outs merely to make a benchmark faster.

## Scope

Private json-validation-cost-1107 began at engine301dd868 and now follows delivered2.10.0 main2bbace65. Internal src/json.ts validation traversal, focused contract tests, comparable measurements and migration/validation notes only. No public API, dependency, persistent format, default safety change, World diff suppression or fingerprint cache. Root will refresh against preceding work83 before final gates and choose a patch version only if the optimization earns shipment.

## Approach

First pin exact invalid-value diagnostics, nested paths, traversal/getter timing and propagated errors, cycles versus shared references, sparse arrays, null prototypes and serialized results. Candidate direction: maintain reusable key/index breadcrumbs and construct the diagnostic path only when rejecting a value. Keep Object.entries evaluation and array access ordering unchanged. This is a hypothesis; if measured time or memory regresses materially, retain the evidence and reject the candidate rather than relax validation.

## Acceptance criteria

- [x] Literal contract checks pass on the unchanged baseline and candidate, with deliberate diagnostic/validation controls failing.
- [x] Comparable baseline/candidate valid and invalid payload measurements include real retained AoE2 state/component shapes, small records, deep structures and allocation/retained-memory limits; report noise and no unsupported whole-game claim.
- [x] Actual caller values, fingerprints, exception identities and traversal side effects agree; existing World/component/serialization contracts pass.
- [ ] Independent exact review, all11 gates, main/push and terminal CI/publication plus downloaded runtime verification if shipping.

## Implementation steps

- [x] Inspect measured cost and existing validator/state traversal; prepare scope without an unsafe policy change.
- [ ] Pin contracts, implement the bounded hypothesis and measure after the shared expensive slot is free.
- [ ] Review and ship an earned improvement, or record a rejected hypothesis with its evidence.

## Outcome

The candidate passes96 focused cases and three deliberately failing controls. Five pairs on actual saved component data used12.35% less validation CPU with identical fingerprints; short families are noisy. See design.md for workload, memory and inference bounds. Exact source review and final integration/gates remain pending. State fingerprinting and diff-consumer questions remain separate; retaining default observation is not proof those costs are solved.

## Independent review

Native Astra/xhigh accepted exact staged tree178457a8bd117d38272d69f884e3bbb8d72df8b8 against2bbace65 with no material findings. The full authored report is retained in reviews/0_implementation.md, SHA25698C48372A35D6496D526B894FF21A11761ED23CB6E59F757531D73090EF52297. It independently checked18 candidate hashes,194 emitted hashes, actual fixture, validation boundaries, all72 samples and raw component arithmetic; it attributes silent type/lint/content commands to root and keeps full11/publication pending. Runtime source remains unchanged. Reviewed document preimages are preserved in snapshots/0_*. Exact integrated focused104/type/lint and86unit content checks pass; the first custom performance.md path was correctly rejected by the work-doc gate and moved to allowed design.md without a policy exception.

## Full gate

Maintained npm run gates passed all11 steps on exact tree477175ec7f9fb5218fbdde2cac207b20dcb5e620 in24.503s:1,985 root tests plus1 existingTODO across120files,22 MCP tests, type/lint/build/pack, exact benchmark counters and unchanged calibrated bounds. Root audit has7moderate development findings; production/MCP audits report0. Node24.22.1 and explicit/nested npm11.6.2. The owned watcher tracked136 processes with0 forced stops/leftovers. Actual built Node/browser2.10.1 World state writes accept shared references, reject a nested nonfinite value at the correct context, and leave rejected state absent. Source/tests/version/locks remain identical to the reviewed target; later edits only record review/gate and already completed83/154 status. Ordinary source/test whitespace checks pass; exact CRLF document preimages are checked with CR-at-EOL recognition while retaining all other whitespace checks. No repository attribute or gate was weakened. Main/push, terminal hosted/publication and downloaded-runtime acceptance remain pending.
