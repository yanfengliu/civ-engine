# Review 4: integration

## Target

Repository: civ-engine. Worktree: C:/Users/38909/Documents/github/civ-engine-worktrees/fractional-visibility-1107. Branch: codex/fractional-visibility-1107. Base/HEAD: `a21a842ae051a39a0e523fd555f6be7eb9df53ce`, the delivered 2.12.0 distance-field revision. Initial integration target: staged tree `56904b9d81241ca25d4167256cd9b7070d90f744`. Separately verified repair target: staged tree `5556363ef2ecec43b525ff245a1a31056219ef37`. Read-only index comparisons matched each target at its review boundary. This report is subsequent to those frozen trees.

The initial target is retained in `tmp/fractional-visibility-1107/release/metadata-repair/reviewed-before.patch`, 175,588 bytes, SHA256 `E0313B89BFD77036E0D8E578E8ABA57745C5D74F71CFF6196B2CAEFE36E26621`. The repair delta is retained alongside it as `repaired-delta.patch`, SHA256 `65A59D05B2D36EBCDEC5E80069BAA86EB7949CD7D16FBB7E422B518EE36D5299`. Keep both with the named base until the reviewed contents are bound to a recoverable commit. Original lockfile and detailed-devlog preimages are also retained there. The repair receipt SHA256 is `F89447A0F537A6867C14046D26EF4B22C2497C1B4DEAF5FD9B41D4D8F7DEA4FB`.

Review3's exact source target and authored report remain intact. Visibility source SHA256 is `F780EFFA6FE0157BBF426E7AA9EA0BD9952B18D7750D54B0DD1595242ECB5161`; continuous/oracle test hashes remain `B5B70D165F08485CD2EBC2D27263BCB5B408E8EB090E2405056499CF4EA2CBFA` and `C0EA391F8B993B5231FD65D2F908118420B85F36C25003968001449C04B2F398`. Review3 SHA256 remains `4C3CFC159C679F6258BEAFACC1BF7F139005409476B0CDB7E7C36774651F5B08`. This round concerns integration, metadata and records; it does not repeat or expand the stopped optimization review.

## Reviewers and coverage

Reviewer: native Codex `/root/fractional_review`, continuing the pinned Astra/xhigh lane. The scope was the approved fractional contract after refresh onto work87, the F4 repair and preserved review preimage, merged public documentation, 2.13.0 metadata, migration guidance, work85 status and work87 closure evidence. The external CLI/source-export lane remains unavailable as recorded in review3; it was not retried, and no second-lane approval is claimed.

This review used source/Git-object reads, local hashes, JSON comparisons and retained evidence. It launched no tests, runtime imports, dependency installs, builds, benchmarks, browser/GUI processes or subagents; performed no Git mutation; and wrote only this report. Root owns all full-gate execution and delivery. No persistent reviewer-owned process was created.

## Reports

### Native Codex /root/fractional_review — initial target 56904b9

The fractional implementation and both extracted tests are byte-identical to review3. The visibility source at current base a21a842 is also identical to the previous 8c774d6 baseline, so refreshing the branch does not change the source comparison underneath that review. The only production-source delta besides the previously reviewed validator change is the intended engine version constant.

Outside the changed hunks, I reread `src/visibility-map.ts:139`, which still counts queries and preserves the missing-player short-circuit; `src/visibility-map.ts:247`, which preserves source bounding-box traversal; `src/visibility-map.ts:258`, which evaluates the same inclusive circle; and `src/visibility-map.ts:279`, which still sends cell indexing through integer validation. The finite-source helper and integer-query helper remain distinct. No optimizer helper, public work counter, exported-name change or architecture change is introduced by this integration.

The three adjacent documentation resolutions retain both delivered distance fields and fractional visibility: README rows at lines109-110; API error rows at `docs/api-reference.md:6771` and `docs/api-reference.md:6772`; and the visibility paragraph followed by distance-field guidance at `docs/guides/spatial-grid.md:287`. Work87 source, public barrels, public-surface fixture and architecture files are unchanged relative to a21a842. The changelog at `docs/changelog.md:5` describes the narrow source behavior, and line7 explicitly states that new readers accept old integer states while old integer-only readers reject fractional saved values. It does not imply game adoption or optimizer acceptance.

F4 is correctly repaired at `docs/guides/ai-integration.md:156`: nonfinite centers use `visibility_source_coords_invalid`, and finite out-of-bounds centers use `visibility_out_of_bounds`. Both the retained preimage hash and corrected-guide hash match `f4-disposition/receipt.json`. Review3 was not rewritten to erase the finding.

F5 (P2): at initial `package-lock.json:264` and `mcp/package-lock.json:123`, the 2.12.0-to-2.13.0 release substitution also changed dependency Node requirements from `^20.19.0 || >=22.12.0` to `^20.19.0 || >=22.13.0`. The same unintended change affected 17 Rolldown/Vite dependency entries in each lockfile, including 18 engine/peer fields per file. Resolved dependency versions and integrity values were not being upgraded. This altered dependency compatibility metadata outside the authorized release bump and could reject otherwise supported Node22.12 setups. Only the root package's two own version fields and the MCP lock's local parent version should change. Root accepted this finding and confirmed that a global string substitution caused it.

F6 (P3): the newly moved routing line at `docs/devlog/detailed/2026-10-02_2026-11-07.md:237` retained a `detailed/2026-10-02_2026-11-07.md#...` link, which resolves from that file to a nonexistent nested detailed/detailed path. The intended heading already exists at line59 of the same file. Root accepted the minor correction; preserve the historical text and use the existing local anchor.

### Native Codex /root/fractional_review — separate repair verification at 5556363

The repair changes only the two lockfiles, the new detailed-devlog link and an appended work85 repair record. I independently parsed both repaired and base locks, restored only the allowed own version fields in the in-memory comparison, and compared the complete remaining structures. Both equal the base exactly. The textual diff likewise shows only root top-level version and packages[''].version, plus MCP packages['..'].version, moving from 2.12.0 to 2.13.0. No dependency engine, peer, resolved URL, integrity, package version or other metadata remains changed. F5 is closed for this exact repaired target.

The devlog routing line now uses `#june-11-summary-entries-retained-at-the-50-line-cap`, whose heading is present in the same file. Its original bytes remain retained. F6 is closed. F4 remains correctly repaired, and the source, test and prior-review hashes above are unchanged. The package.json version, both intended lock versions, src/version.ts constant and README badge all agree on 2.13.0.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F4 | Review3 P3 source-error wording overgeneralized nonfinite validation. | Root accepted; this review verifies the preserved preimage and correct finite/nonfinite distinction. Closed. | Exact corrected guide hash is bound by f4-disposition/receipt.json. |
| F5 | P2 global release replacement also rewrote dependency Node engine/peer requirements in both locks. | Root accepted; original target and preimages retained. Independent whole-structure comparison verifies correction at 5556363. Closed for that target. | Final gate/delivery acceptance must use the corrected metadata; the first green gate is not a substitute. |
| F6 | P3 copied devlog routing link pointed into nonexistent detailed/detailed. | Root accepted; local-anchor repair verified at 5556363. Closed. | No further source or runtime change required. |

Earlier F0-F3 and review3 remain preserved. This round does not close or accept the rejected optimization work.

## Verification

The root repair receipt binds the initial patch, lock preimages and seven first-gate artifacts. The retained initial patch and all seven artifact hashes match their recorded values. Root's first full gate ran on the initial target and completed successfully, but that run did not establish the correctness of the dependency metadata and is expressly excluded from repaired-release acceptance. No full-gate result for the repaired target is claimed in this static report; root owns that check and its later receipt.

The refresh manifest records the three initial conflict-output hashes; those files had subsequently been replaced by resolved content. The separate `refresh87/resolution-receipt.json`, SHA256 `2C4970750C3ECAD7E14C2B11F60C9E367EC8881FC1564E6217DE903446E8ED16`, now distinguishes the initial hashes, resolved-output hashes and final-file hashes. I checked all three resolved outputs and final files against it. My preliminary message inferred that the retained output files still contained conflict markers; direct reads disproved that inference, and I corrected it before this report. The reviewed final files contain both capabilities without conflict markers.

Work87 closure is supported by retained local evidence under primary `tmp/work87-closure`: the hosted receipt names main a21a842, run42460222937 and successful terminal Node20/22/24 plus publish-dist jobs; downloaded Node/browser receipts report2.12.0 and the scoped distance-field contracts. The retained archive actually hashes to `E6B7642F61B91F0BF5A219AA8FACF9D5A335CACB18FD41807427E0A7D384B3DD`, matching asset723289079's recorded686844 bytes and442 entries. The retention manifest actually hashes to `2337D06BD2CCDB56818330DDC4020DB04116C1DB0D1E47729CD0F9BCBB421DC2`; its entries sum to255 files/3,089,623 bytes. Sampled gate/review/precommit artifacts match their inventory hashes. The retained full-gate log ends with all eleven steps passing, and the cleanup receipt records zero task-path process matches, removed private resources and preserved shared inputs. These are checked retained receipts and archive bytes, not a fresh hosted or runtime verification by this reviewer.

The current fractional plan, migration notes and priority/development records continue to separate prepared2.13 from publication and AoE2 adoption. They preserve the five-attempt optimization rejection and its evidence. No performance improvement follows from the fractional validation change.

## Round outcome

The initial target had one material metadata finding and one minor link finding. Both repairs are independently verified in exact tree5556363; F4 is also verified closed. No material integration finding remains for that target. Source and content review are complete within the assigned bounds. Full repaired gates, commit/main/push, terminal hosted CI, retained-package/runtime verification and owned cleanup remain root-owned acceptance steps. Consumer adoption remains separate, and this report provides no renewed optimizer or whole-game runtime acceptance.
