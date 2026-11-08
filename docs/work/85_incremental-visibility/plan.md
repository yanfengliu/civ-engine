# Support fractional visibility centers on the shipped algorithm

Status: active
Owner: Codex adoption worker; root acceptance and integration
Created: 2026-11-08
Updated: 2026-11-08

## Problem and outcome

E17 needs finite fractional vision-source centers while integer visibility queries and existing integer saves retain their behavior. Deliver that approved compatibility extension using the shipped raster/update/order algorithm. The separate E18 incremental optimization stopped after five unsuccessful performance repairs; it is not part of this candidate. E19 work beyond shipped ordering caches and the proposed new work metrics remain deferred.

## Scope

The owner approved fractional saved source values and later scoped AoE2 adoption; the exact original proposal is retained at [snapshots/0_owner-approved-proposal.md](snapshots/0_owner-approved-proposal.md). Its historical pending text is superseded by that authorization. Root accepted the exact fraction-only separation in [reviews/2_plan.md](reviews/2_plan.md), retaining the decision proposal at [snapshots/1_fraction-only-decision-proposal.md](snapshots/1_fraction-only-decision-proposal.md). No repeated owner permission is required for this boundary.

Fresh worktree: C:/Users/38909/Documents/github/civ-engine-worktrees/fractional-visibility-1107, branch codex/fractional-visibility-1107, base 8c774d692957ab91b16d894d954b79dd398ff2c0 (shipped occupancy probes 2.11.0). Root reserves fractional release 2.13.0 after work87. Version metadata, registry, central priorities and devlogs remain unchanged until coordinated. No dependency, game policy, state-field, exported-name, metrics or integer-query change is included. Root owns independent review, sequencing and delivery.

## Approach

Change the source validation call in setSource and fromState to a private finite-coordinate/bounds helper. Leave toIndex/assertGridPoint, computeVisible, update, source batching, explored history, canonical order, clearing/loading and the three old metrics otherwise byte-identical to the shipped source. Private compilation proves that removing precisely these two replacements and the helper reconstructs the entire baseline source exactly.

Keep the two extracted test files unchanged: 16 continuous-center contracts and four independent lifecycle/oracle cases. Omit all optimizer helpers, unpublished work metrics and optimizer-specific tests from the product candidate. The rejected source/tests/results remain retained research, with exact copies and a per-file hash inventory; see [design.md](design.md).

## Acceptance criteria

- [x] Root accepts the narrow boundary under existing owner approval; no sixth optimization repair.
- [x] Unchanged shipped source produces genuine 20-case RED: 17 failures and three passing controls.
- [x] Fractional circles, saved values, error ordering and integer queries pass the extracted contracts; five temporary regressions fail real assertions and restore exact source bytes.
- [x] Existing visibility/order/oracle/observer/public-surface checks pass: 66 tests in nine files; strict types and affected lint pass.
- [x] Six untimed integer workloads match 600 state/old-metric boundaries, including all captured returns from four actual 120-tick windows; observer reads add no sort or flush.
- [x] Rejected optimization evidence and authored reports remain recoverable; original tree is untouched.
- [ ] Exact independent source review, coordinated version/changelog/devlog updates, required content checks and full eleven gates pass.
- [ ] Main/push, terminal Node20/22/24/publication CI, retained archive/runtime verification and owned cleanup complete. AoE2 adoption remains separate.

## Implementation steps

- [x] Verify clean controller-created tree and shipped source, copy the two exact tests and seven work85 records, preserve original records before updating them.
- [x] Install private root dependencies with npm ci --ignore-scripts on Node24.22.1/npm11.6.2, establish RED, make the validation-only change and complete focused proof.
- [x] Release the exact owned shared gate lock after zero-leftover verification; no further runtime work without a fresh grant.
- [x] Prepare narrow public docs, current work records and exact review packet without touching held version/central files.
- [ ] Root reviews and sequences integration after work87; then perform required gates and delivery under its runtime/publication authorization.

## Outcome

Prepared, not delivered. Product source SHA256 F780EFFA6FE0157BBF426E7AA9EA0BD9952B18D7750D54B0DD1595242ECB5161 has 11 inserted lines and two validation replacements against base 8c774d6. The tests retain SHA256 B5B70D165F08485CD2EBC2D27263BCB5B408E8EB090E2405056499CF4EA2CBFA and C0EA391F8B993B5231FD65D2F908118420B85F36C25003968001449C04B2F398. The existing barrel/public-surface fixtures and package/lock/version files are unchanged.

Focused proof is retained under ignored tmp/fractional-visibility-1107. focused-acceptance.json has SHA256 A2A2198168051F5274C9A45C5EFA32B02BC26F3E873B3EB790FDA61AFCAF5889: nine native jobs, 34 observed owned process instances, zero stopped/leftover/live task processes, six primary input hashes unchanged, and the owned lock released. One native exit is the intended baseline RED; another is a mutation-harness selector failure before its fourth mutation. Three valid controls were retained, the selector was narrowed to the source helper, and only the remaining two were run. No production repair or relaxed assertion was needed. Full gates, independent implementation review, commit and publication have not run for this candidate.

The earlier plan/design remain exact in snapshots/1_rejected-optimization-plan.md and snapshots/1_rejected-optimization-design.md. Their historical acceptance boxes, version proposal and pending statements describe those earlier checkpoints, not this candidate. Original reviews and approved snapshots are unchanged. E18 remains rejected after five attempts; no speedup, game adoption or completion claim follows from this narrower change.


## Coordinated release preparation

Root read and accepted independent Astra/xhigh review3 of26b3b7d (SHA2564C3CFC159C679F6258BEAFACC1BF7F139005409476B0CDB7E7C36774651F5B08), no material source finding. Its minor F4 is corrected: the AI guide now distinguishes nonfinite source errors from finite bounds errors; the exact reviewed preimage is retained in tmp/fractional-visibility-1107/f4-disposition. Preserved pre-refresh tree6ced31447eccd32e1f329c545df08d0671ea14d7, then refreshed onto delivered work87 a21a842. README, API error-catalog and spatial guide adjacent edits were merged by retaining both capabilities. Tested visibility source and both extracted tests remain byte-identical. Prepared2.13.0 under existing owner approval; no optimizer source or unpublished metrics included. Exact final integration review/full11/CI/archive/runtime/cleanup remain pending.


## Release metadata repair

Independent integration review found F5 before publication: the controller's global version substitution also changed third-party >=22.12.0 engine/peer ranges to >=22.13.0 in both lockfiles. Restored both from shipped a21a842 and changed only engine root/package and MCP parent version fields through parsed JSON; a structural equality guard proves every other field matches the base. The original56904b9 patch/preimages and first full11 are retained under release/metadata-repair and release/full-gate-1. That gate actually passed in25.867seconds with134 observed processes/zero leftovers, but did not validate the unintended lock metadata and is not final release acceptance. The newly moved devlog routing link now uses its existing local anchor; exact prior bytes are retained. Added a resolution receipt distinguishing the refresh manifest's initial conflict-output hashes from final resolved files. Runtime/tests are unchanged. A fresh full11 on the repaired exact tree remains required.


## Accepted repaired release

Root read and accepted the complete native Astra/xhigh review4 (11032 bytes, SHA256 d4435d9948e5e14a5b4c6c5edc2de37019a579ceea04e1d3753974c181d40c4b). It preserves the initial metadata/link findings and independently closes F4/F5/F6 at corrected tree5556363. The fresh eleven-step gate passed that tree in22.278seconds:2,113 root tests plus one existing TODO and22 MCP tests, Node24.22.1/npm11.6.2. Both audit thresholds pass; seven moderate development advisories remain, with none in production/MCP. The owned runner observed141 process instances, zero stopped/leftovers. Actual built Node/browser2.13.0 exports pass literal fractional circles, saved-state roundtrips, old integer states, detached sources, explored preservation, write batching and error classes. No runtime/test/metadata bytes changed after that gate; only review and delivery records follow. Main/push, terminal hosted CI, downloaded-package checks and cleanup remain pending. E18 optimization stays rejected at five attempts; no performance or game-adoption claim.
