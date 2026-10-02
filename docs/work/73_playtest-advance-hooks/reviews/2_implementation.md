# Review 2: implementation

## Target

Final M2 repair5 product/public snapshot target at private HEAD192990f3d6fc8b482875f14c5c1572cebd09bd36 and main/merge-base eb61e448789a95ef907ae6f6e28e2dd33ae4c8a8. Exact26 product/public plus9 context inputs are retained ignored in aoe2/tmp/engine-feedback-resume-1001/m2-r5/product-inputs.json SHA2566ce0bbda5ccb3c2ab7f38a80ba1e71505b56685f1490c180e80055093b6ffb65 and raw snapshots. The full scoped patch and prior reviewed byte preimages remain recoverable in the same packet; this is not an approval of private background records.

## Reviewers and coverage

Independent in-session reviewer engine_m2_acceptance freshly reviewed the two version literals and reused earlier accepted runtime/default/error/fixture work only on identical bytes. Both provider CLI source-export routes remain unavailable with exact rejections retained in review0; no fictional provider report or PASS is added. Root accepted this complete report before releasing one private full gate.

## Reports

### engine_m2_acceptance

The complete authored report follows verbatim. Original bytes are retained at aoe2/tmp/engine-feedback-resume-1001/m2-r5/re-review/REPORT.md SHA2566382c2388ec927447930ffc7656583f397ae685d38191af8b7b5eb1ec26dc86b.

# M2 repair 5 focused independent source re-review

Verdict: ACCEPT within the in-session source and inspected-evidence bounds below. M2-R2 is resolved; no new material finding was found. M2-R1, M2-N1 and the five-member fixture correction retain their R4 acceptance on unchanged bytes. This is not a Codex CLI or Claude CLI PASS, full-gate acceptance, or shipping approval. All five automatic repair rounds are spent.

The exact target is `m2-r5/product-inputs.json`, 11,122 bytes, SHA-256 `6ce0bbda5ccb3c2ab7f38a80ba1e71505b56685f1490c180e80055093b6ffb65`: 26 product/public inputs plus nine read-only contexts. The private worker HEAD is `192990f3d6fc8b482875f14c5c1572cebd09bd36`; the review checkout remains branch `engine-m2-review-1001` at baseline `eb61e448789a95ef907ae6f6e28e2dd33ae4c8a8`. This packet describes uncommitted scoped inputs, not the private HEAD alone. The owner must exclude unrelated private-branch records when integrating.

`src/version.ts:7` now exports `ENGINE_VERSION = '2.6.0' as const`. `src/session-recorder.ts:22,148` imports that value and assigns it to `metadata.engineVersion`, so new recorder metadata agrees with the root package. `mcp/package-lock.json:24-25` now records `packages['..'].version` as `2.6.0`; the MCP package's own `0.1.1` version and its `civ-engine: file:..` dependency remain unchanged at lines 3, 9 and 12. `tests/version-sync.test.ts:20-22,71-82` independently compares both corrected values to the root package version.

The version correction does not change a bundle field, schema, callback type or saved callback data. The unchanged `SessionMetadata.engineVersion: string` remains at `src/session-bundle.ts:117`. The unchanged replay checks at `src/session-replayer.ts:441-471` reject unsupported schema/cross-major versions and warn on a same-major additive version difference. This source supports continued same-major loading; this review did not execute a historical corpus or establish runtime replay equivalence across releases.

For each of the two changed files, replacing the sole `2.6.0` value in the new snapshot with `2.5.0` reproduces the worker's entire before-snapshot bytes exactly. Thus every unrelated MCP lockfile dependency byte is preserved. `worker-byte-reversal.json` records this proof. The worker preimage hashes are `b865364df5e25d2cc3a2badd4df0a0a5853ce7a1e5502986cf081a64b03009ed` for `src/version.ts` and `05927d1992ec7f9481299a120ed3f56c14ebac5c20a90ccf78719e5fe763f76f` for `mcp/package-lock.json`. Their final hashes are `105c2e8d0cf076db2b7ad06141b762159ada310ff6b6fd81fefae46935554b1c` and `f03171f7061a52eb199e877d35ca4bb73efb9b5f578b269a3039d17cdafe78d5`. The old isolated checkout had CRLF for these two baseline files while both worker before/after snapshots use LF; `two-literal-proof.json` preserves that distinction. The reviewer performed no normalization.

The actual owner RED report contains six existing version tests: four pass, two fail, zero skip, native exit 1. The two failures are precisely the runtime constant and linked MCP engine version assertions, each reporting `2.5.0` versus `2.6.0`. The actual GREEN report contains 235 passes, zero failures/skips, native exit 0. Comparison by test filename and full case name preserves all 227 R4 cases and adds exactly six version cases and two member cases; `case-preservation.json` records every added identity. The unchanged 28 hostile-value cases are included. These are inspected owner executions, not reviewer reruns.

The recorded strict `tsc --noEmit`, lint of 16 changed source/test files, and two work-document structure/byte-attribute cases each exit 0; stderr for typecheck/lint is empty. Invocations directly use Node at `C:/Program Files/nodejs/node.exe`; its inspected file version is `24.12.0` and SHA-256 `2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8`, matching the receipts. Invocation arguments and available manifest guards were read and checked, not inferred from summary exit status. These checks do not cover the complete engine gate. RED and GREEN owned Job receipts respectively show native 1/0, active process count 0, cleanupProof true and no leftovers.

All 24 previous product/public snapshot hashes match R4. Prior broad Promise observation, undetectable-input limits, foreign-error identity, exact tick consumption, genuine/forged failure handling, default omission, partial fork and recorder release assessments are reused only on those unchanged bytes. The full prior authored reviews remain `m2-review/REVIEW.md` and `m2-r4/re-review/REPORT.md`; this focused pass freshly assesses the two version repairs and their evidence rather than claiming a new whole-source or provider review.

Before refresh, the entire 633-file checkout matched the accepted R4 audit. The authorized offline refresh validated all preimages and copied only the 35 exact input snapshots; exactly two files changed, with no addition or deletion. Final verification matches every input's size/hash and every checkout file against the refreshed audit: 633 files, no links, no byte delta. Final full-tree manifest SHA-256 is `83fb0254f69b6c062569ccd07b922ed60d30b06fc4631dac7c5ff7f5f2ca9b8b`. The comparison immediately after refresh returns native 1 to report the two expected authorized deltas; the final comparison returns native 0. No dependency link, product runtime, CLI reviewer, GUI or server was launched in this pass. Prior owned reviewer process identities are absent. The checkout is intentionally retained at `C:/Users/38909/Documents/github/civ-engine-worktrees/engine-m2-review-1001` for parent-controlled final review/cleanup.

Unavailable and unrun checks remain explicit: external Codex/Claude reviews; complete 11 engine gates including full suites, builds/pack, dependency audits, benchmark and MCP checks; Node 20/22; integrated-revision review; main merge/push and hosted acceptance; publication/engine-dist; downstream game adoption/consumer validation; all-21-scope closure. The initial CI query's UNKNOWN result is not a green result. Parent owns those gates and decisions. A mistaken local evidence read used dot-separated invocation filenames and returned native 1; the correct hyphenated artifacts were then read successfully. A restricted Git identity read hit dubious ownership; a read-only per-command safe.directory retry confirmed the exact HEAD/branch without changing configuration. Neither was a product failure.

Automatic approval previously rejected owner-context Claude and OpenAI review launches because they would export private source/prompts to those destinations without destination-specific human authorization. Both questions remain with the parent. No retry or alternate transport ran. The older restricted Astra socket denial and incomplete Claude retry stream supply no authored source review; Sol smoke and full Astra review remain unrun, and Claude has no final modelUsage proof. Exact rejections and prior process cleanup remain preserved in `m2-review/approval-rejection.md` and its lane/process records. This pass abstains from both provider verdicts.


## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 (M2-R1) | Hostile thrown-value classifier. | Resolved; R4 acceptance retained on identical source/test bytes. | Public-flow RED/GREEN evidence remains retained. |
| F1 (M2-N1) | Option JSDoc association. | Resolved; identical accepted bytes. | No further repair. |
| F2 (M2-R2) | Runtime/MCP linked-engine version mismatch. | Resolved by exact two-value byte reversal and maintained version-sync RED/GREEN. | Final version copies agree on2.6.0; no dependency resolution changes. |

## Verification

Reviewer inspected actual235 affected passes, version RED6total4pass2fail, strict noEmit/lint and2 static work-doc checks. Its closed633-file full-tree audit SHA25683fb0254f69b6c062569ccd07b922ed60d30b06fc4631dac7c5ff7f5f2ca9b8b showed no byte changes/links or owned processes. It ran no product gate or provider CLI. Root later released one ordinary private npm run gates; native0/all11 passed with root1653pass plus1 existingTODO and MCP22pass. MCP audit retained1moderate hono advisory below the maintained high threshold; no dependency repair ran. These later worker artifacts remain ignored in m2-r5/full-gate and do not rewrite the reviewer's earlier full-gate-unrun bound.

## Round outcome

ACCEPT within the independent in-session source and inspected Node24 evidence bounds. No M2 material finding remains in this target; all5 automatic repairs are spent. Private full-gate readiness is observed separately. Final clean main-based integration, integrated review/gates, Node20/22/hosted acceptance, publication/engine-dist and game adoption remain integration-owner work. Both external CLI verdicts are unavailable; no final shipping acceptance is claimed.
