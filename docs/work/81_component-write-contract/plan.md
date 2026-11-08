# Document and pin explicit component publication

Status: complete
Owner: Codex component-contract worker; root owns review and integration
Created: 2026-11-07
Updated: 2026-11-07

## Problem and outcome

E23's API reference falsely promised direct component-reference mutation detection while registration docs and ComponentStore already required explicit publication. E12's public error table named internal applyTickDiff without saying it was internal. Correct the live docs/examples and pin the existing behavior; no new API or mutation semantics.

## Scope

Base main c78a3b3162a3674b8e42204fed66cbabcdabf5ac, isolated branch codex/component-contract-1107 with private dependencies. Coherent docs/test patch release 2.9.1. No AoE2 edits, persistent-format or architecture changes. Root authorized the local source commits after gates and owns integration, push and cleanup; worker verifies hosted delivery. Full gates use the shared CPU slot.

## Approach

Tests first against unchanged implementation, then correct docs: a callback returning null or undefined retains the current value and identity; a non-nullish replacement becomes the stored/returned value. The method itself returns the published T; use setComponent to explicitly store null. Same-pass consumers and recorded diffs see successful writes. Configured position keys synchronize immediately through set/patch. Strict checks precede callbacks; callback or later JSON/position validation failures do not roll back reference mutations. Raw references create no notification, though mutation can ride an already-dirty value. Keep strict/semantic policies unchanged and applyTickDiff internal.

## Acceptance criteria

- [x] Existing behavior contracts pass before docs change; four doc claims fail first.
- [x] Correct API/getComponent example, component/concepts/tutorial guides and movement guidance; pin live claims against actual ComponentStore behavior and both package barrels.
- [x] Nine selected regression controls fail and restore exact source/doc bytes: clone callback input, omit publication, wrong return, late strict check, callback rollback, validation rollback, grid bypass, false direct-tracking claim and unlabelled internal helper.
- [x] Initial tree 19d3bcb5c4811a663127ab3fc1d75c6e2b494b33 passed all eleven gates on Node 24.12.0/npm 11.7.0: 1,924 root tests plus one TODO, 22 MCP tests; seven moderate dev advisories, clean production/MCP audits. Preserved at source commit eea571a0457075765be0975d6ac0eb70e75b3dff before review repair.
- [x] Root accepted independent P2 re-review of corrected tree 34b86118379af0daf9de464b1f7a9b363ec1bcc1: no new material findings. Root retains the full authored reports.
- [x] Corrected tree b16af5fdec81a699c01258d08d47269dae86ba1d, including both authored review reports, passed npm run gates with native exit 0 on Node 24.12.0/npm 11.7.0: all eleven steps, 1,926 root tests plus one existing TODO across 115 files, 22 MCP tests, build/pack/native benchmark. Seven moderate root dev advisories remain; production/MCP audits are clean. Heavy slot released and zero task-owned Node processes remain.
- [x] Root integrated and pushed main e8ada69ad7344aeb78211d355999042cce9c20ea. CI 42433332914 completed successfully for Node 20/22/24 and publish-dist. Actual retained archive bytes, SHA256/SRI, package and both runtime entry-point versions, plus nullable patch behavior were verified.
- [x] Root landed delivery records at379eccdf6f453232c5c9b9d240a7a2cb42fa2be1; closureCI42435128951 passed. The owned MCP junction was detached nonrecursively and the private component-contract-1107 worktree/branch removed, preserving the foreign primary cursor-state deletion.

## Implementation steps

- Initial focused run: 4 doc failures, 41 behavior/store passes; typecheck passed. Existing ComponentStore negative direct-write test remains unchanged. Corrected docs plus behavior/store/existing doc claims: 82 passes across four files; focused lint passed.
- Ignored evidence in tmp/component-contract-1107: red.log, green.log, types.log, lint.log, C1.log through C9.log and controls.json. Each control runs its named discriminator only and restores bytes in finally. No broader mutation coverage is claimed.
- Corrected the assignment's shorthand with root: callback returning void preserves identity; World.patchComponent returns T. The product source already implements this; only the runtime version marker changes for the patch release.
- Review found P2: the replacement guarantee omitted null, although patch(current) ?? current treats null and undefined alike. Added the nullable-component contract before correction: 18 checks passed and one new doc check failed. Corrected all current replacement guidance; 19 focused checks, typecheck and lint pass. C10 makes null replace the value and C11 restores the unconditional doc claim; both fail their selected nullish tests and restore exact bytes. Evidence: nullish-red.log, nullish-green.log, nullish-types.log, nullish-lint.log, C10.log, C11.log and nullish-controls.json. No runtime change or second version bump. Both full authored review rounds and corrected gate acceptance are retained above.
- Hosted acceptance: [CI 42433332914](https://github.com/yanfengliu/civ-engine/actions/runs/42433332914), retained asset 722492304 civ-engine-e8ada69ad7344aeb78211d355999042cce9c20ea.tgz and rolling asset 722492340. The downloaded retained archive is 669756 bytes, SHA256 38137dacf4cc43de9e640674c03e58bcbacb8bf46eea1c2856141bb470aa29db, SRI sha512-pSSU/UzfIdHuAa9PiThOXtjwP2vUou2Fay+C3/GiFg8gZimUQn2Ew839wKlyDppBsxGzBrtfZsSOYdJOc65hoQ==. Package, Node runtime and browser runtime report 2.9.1; the actual package preserves current values for nullish callback returns, stores explicit null through setComponent and publishes non-nullish replacements. Compact hosted metadata, archive proof and reproducer are retained in primary tmp/work81-component-retained; checked with Node 24.12.0. No extra full gate or dependency installation was needed.

## Outcome

Shipped docs/test patch 2.9.1 at main e8ada69ad7344aeb78211d355999042cce9c20ea after exact independent re-review, all eleven corrected local gates, successful hosted matrix/publication and actual retained-archive verification. Source/tests match accepted tree 34b86118379af0daf9de464b1f7a9b363ec1bcc1; both authored reports remain under reviews/. The full native gate log is tmp/component-contract-1107/corrected-full-gates.log. Delivery records are integrated/pushed at379eccdf6f453232c5c9b9d240a7a2cb42fa2be1 and closureCI42435128951 passed. Root confirmed private-resource cleanup; fresh engine worktree inventory contains no component-contract tree. This producer work unit is complete. E23's engine documentation gap is distinct from AoE2's unrecorded Gatherer writes and chosen-route state omission; neither consumer class is closed here. E03 paused-save adoption is also open despite work 80 API delivery.
