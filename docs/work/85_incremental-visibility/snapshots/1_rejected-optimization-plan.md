# Update changed visibility sources and support true centers

Status: active
Owner: Codex adoption worker; root acceptance and integration
Created: 2026-11-08
Updated: 2026-11-08

## Problem and outcome

VisibilityMap currently rerasterizes every source of each dirty player. Work79 already caches canonical player/source/explored ordering, so repeated unchanged serialization is not a fresh gap; explored growth still invalidates its whole sorted array. Support approved finite fractional centers, reduce sparse update work, incrementally merge explored ordering, and expose honest detached work counters while preserving old integer outputs, source batching and existing metrics.

## Scope

Engine E17/E18/E19 capability only. Owner explicitly approved fractional persisted source values and later scoped AoE2 true-center adoption through the root on2026-11-08. The exact predecision proposal is retained unchanged at [snapshots/0_owner-approved-proposal.md](snapshots/0_owner-approved-proposal.md), SHA256134BD429EA29617A345C5A1D7EF2E3BD277C34D32E7E983CD3D7FD4F0D87CB3D; its historical Pending text is superseded by that owner approval, not silently edited. Work71 M5 supplies the detailed earlier contract, refreshed by [design.md](design.md). No new dependency, grid query coordinate change, state fields, game policy, consumer edits, instruction changes or safety opt-out. Root owns canonical priorities, work84 and all game adoption.

The isolated tree safely refreshed from2bbace65 to shipped work84 commit22f3e197 (engine2.10.1), preserving the accepted plan/design/proposal snapshots and unchanged visibility source. Planned minor release remains2.11.0. Own tree C:/Users/38909/Documents/github/civ-engine-worktrees/incremental-visibility-1107, branch codex/incremental-visibility-1107. Initial node_modules was absent; private scripts-disabled npm ci installed150 packages on Node24.22.1/npm11.6.2. Primary package/lock/dist/dependency hashes are recorded. No shared build or installation has run. All five optimization candidates are retained. The final candidate passes correctness but fails the fixed performance criterion; optimization stopped. A narrow already-approved fractional-only release is proposed for root inspection, with no separation implemented. Independent implementation review and delivery remain pending.

## Approach

Separate source-center validation from point-query validation. Keep current source maps and cached canonical identities; add pending source identities, last-applied values/coverage and sparse safe-number overlap counts behind private helper composition. Flush only final batch values, never transient exploration. Add VisibilityMapWorkMetrics/getWorkMetrics with the exact five counters from M5, excluding output copies and wall time. Explore only final visible cells, and merge pending newly explored indices when canonical output is requested. Keep every existing VisibilityMapMetrics field and its current recompute/query semantics unchanged.

Start with the direct sparse-count design for correctness. Measure it against current2.10.x ordering caches on both sparse and dense motion before accepting it. A slower actual unit-layer result rejects that candidate; a static-heavy win alone is insufficient. If needed, propose the concrete equivalent dense-rebuild branch and its cold-to-sparse transition/counter bounds described in design.md before implementing that fallback. No public strategy switch or unmeasured universal speed claim.

## Acceptance criteria

- [x] Root accepts this refreshed plan before product implementation.
- [x] Tests first prove literal fractional cells/error ordering, batch final-state semantics, overlaps/removals/load/clear/revert, exact old integer state/metrics and detached output against independent cell scans; relevant regressions fail real assertions.
- [x] After warmup, the128x128/277 stationary radius5 plus2 moving radius3 fixture rasterizes no unchanged sources in its sparse batches. Work counters reflect actual helper operations; reset/getWorkMetrics do not flush or invalidate state.
- [x] Repeated unchanged serialization performs no sort/merge; explored growth and identity churn preserve canonical code-unit/numeric order and exact load/duplicate/extra-field behavior.
- [ ] Fresh actual unit-layer traces from immutable baseline bridge plus synthetic all-moving cases pass equal-state/old-metric checks. Comparable paired timing and retained-memory evidence include sparse, dense, mode transitions if any, live/restored and initial-load costs; no unsupported whole-game gain or constant-memory claim.
- [ ] Exact independent review, minor release/public fixtures/API/guides/migration updates, required11 gates under root's exclusive slot, normal main/push, terminal Node20/22/24/publish, retained archive verification and owned cleanup complete.

## Implementation steps

- [x] Read current work79/M5/source/query semantics and current AoE2 layering; verify actual retained saves and owner-proposal digest; prepare private dependencies.
- [x] Accept refreshed plan; write literal TDD contracts and implement initial bounded sparse helpers without changing game code.
- [ ] Under an explicit later slot, capture an actual operation trace from immutable baseline input and measure candidate versus current shipped baseline; retain raw results and reject regressions.
- [ ] Freeze exact candidate, obtain independent review and full-gate acceptance, then deliver and clean only owned resources.

## Outcome

Plan accepted by the root coordinator; full authored acceptance and exact document snapshots are retained in reviews/0_plan.md. Baseline literal RED failed24 contracts with3passing; it independently observed558 raster bounds calls for two changed sources and a50-element whole-explored sort. Initial affected GREEN passed55 tests; expanded visibility/oracle/observer/public-surface GREEN passed87 in13files. Strict types passed. Seven temporary source mutations failed real output/work assertions and restored exact bytes. The new compile-only test wrapper first produced3lint diagnostics; its corrected function wrapper passes types and affected lint without suppressions. Performance remains unaccepted. The four actual saves contain57/71 unit sources at120x120 and144/142 at168x168. Fresh traces now capture120successful ticks from each through the immutable a0e10435 bridge. All480visibility/world/old-metric checkpoints and final saves match separate controls; all773 source/dependency/save inputs remained unchanged during capture. The original engine was2.9.0 at the game ancestor path; root has preserved all426old package files under the immutable baseline private node_modules before upgrading the separate ancestor installation. The original capture receipts remain historical and unchanged. Engine-only comparisons use the private2.10.1 source baseline. Raw installation/input receipts stay under ignored tmp/visibility-incremental-1107. Work83 is fully delivered/cleaned; root work84 carries its permanent closure records.

## Current evidence

Raw RED preimages/logs, first and expanded GREEN, type/lint outcomes and seven restored controls are retained under tmp/visibility-incremental-1107. Actual operation capture uses the approved immutable a0e10435 game source and the same public bootstrap hook/observation boundaries in separate capture/control processes, with120successful ticks per save and a128MiB trace ceiling. Two setup failures occurred before simulation: a Windows import path needed a file URL, and the ESM-only engine package required its declared import export. Both failures and cleanup receipts are retained. Capture and initial/mixed timing summaries are retained. The real traces contain188938–453102 top-level calls and occupy5.1–12.6MiB compact text each (0.50–1.22MiB gzip). Observer-added state/metrics calls are distinguished from the workload; engine replay proves they add no flush, sort or work-counter increments. No synthetic workload is called an actual game trace.

## Measured strategy correction

The sparse-only candidate passed correctness but is rejected by the dense screening:71-source all-moving median wall1.335× and1024-source2.080× baseline. Twenty-five fraction/radius/cadence workloads then passed1500batch boundaries and two alternating contiguous-process pairs each. Root accepted the exact inclusive50% effective-change threshold and two-effective-sparse-batch cold-index transition recorded in design.md. Nine strategy contracts first produced5assertion failures/4passes on the sparse implementation, including actual numeric Map writes. The implemented fallback passes96tests/14files, strict types and affected lint;14temporary source controls fail their intended assertions and restore exact bytes. Indexed-overlap tests retain six stationary controls so they continue exercising real decrement behavior below the dense threshold. Final hybrid replay/timings, updated public documentation, independent review, full gates and delivery remain pending.

## Fourth-candidate checkpoint

Fresh independent mechanism judgment and root's fixed1MiB per-map scratch contract precede candidate4. Literal insertion RED,105focused contracts/15files, strict types/affected lint,18restored controls and all37workload state/metric parity pass. All five work counters equal candidate3 at every boundary. The fixed1024 median wall ratio is0.804, with one1.185outlier retained; unique513 median CPU1.043 is not hidden or reclassified as a win. Final original35 plus two precommitted held-outs completed five alternating fresh-process pairs each, including bounded A/A513 context. The complete matrix rejects candidate4: mixed75%-1024-radius1 regresses wall/CPU in all five pairs; mixed25%-radius1 and unique513 also show CPU costs. The runtime lane is yielded; one of five repair attempts remains, awaiting a root-accepted mechanism. Separate memory/load/read costs and all three previous candidate failures remain in design.md and ignored evidence. No fifth repair, final source acceptance, full11, commit or publication is claimed.

## Current stop and proposed continuation

Attempt5 used only the three root-approved redundancy removals after3literal RED cost failures and6passing final-candidate oracle cases. It passed114focused tests/16files, types/lint,22restored controls and42workload/2760boundary state/old/five-work-counter parity. The final420timing jobs still show a roughly6% systematic wall regression in mixed75%-1024-radius1; mixed25%-radius1 also retains CPU cost. All five attempts are exhausted; no sixth repair or shifted criterion is authorized. Final472jobs ended with995observed owned process instances and0leftovers; runtime was explicitly returned to root. All source and raw results are recoverable from the46-file attempt5-final snapshot and preceding evidence.

The decision proposal at the end of design.md recommends the already-approved fractional-center contract on the shipped algorithm, omitting the unpublished work-metric surface and optimization helpers. It identifies the exact two validation call-sites/helper and20retained fractional/oracle contracts, with fresh review/full11/publication still required. No fraction-only separation, commit or publication has occurred. Root is delivering independent diagnostics as the next2.11.0; this tree's prepared2.11.0metadata is historical and must not publish. Root owns copying the frozen work84/central closure documents and work71review4; those paths remain untouched here.
