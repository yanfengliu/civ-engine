# Document and pin explicit component publication

Status: active
Owner: Codex component-contract worker; root owns review and integration
Created: 2026-11-07
Updated: 2026-11-07

## Problem and outcome

E23's API reference falsely promised direct component-reference mutation detection while registration docs and ComponentStore already required explicit publication. E12's public error table named internal applyTickDiff without saying it was internal. Correct the live docs/examples and pin the existing behavior; no new API or mutation semantics.

## Scope

Base main c78a3b3162a3674b8e42204fed66cbabcdabf5ac, isolated branch codex/component-contract-1107 with private dependencies. Coherent docs/test patch release 2.9.1. No AoE2 edits, persistent-format or architecture changes. No commits/push by worker; root owns exact review, integration, hosted delivery and cleanup. Full gates wait for the shared CPU slot.

## Approach

Tests first against unchanged implementation, then correct docs: callback-void patching retains live identity; the method itself returns the published T. A replacement becomes the stored/returned object. Same-pass consumers and recorded diffs see successful writes. Configured position keys synchronize immediately through set/patch. Strict checks precede callbacks; callback or later JSON/position validation failures do not roll back reference mutations. Raw references create no notification, though mutation can ride an already-dirty value. Keep strict/semantic policies unchanged and applyTickDiff internal.

## Acceptance criteria

- [x] Existing behavior contracts pass before docs change; four doc claims fail first.
- [x] Correct API/getComponent example, component/concepts/tutorial guides and movement guidance; pin live claims against actual ComponentStore behavior and both package barrels.
- [x] Nine selected regression controls fail and restore exact source/doc bytes: clone callback input, omit publication, wrong return, late strict check, callback rollback, validation rollback, grid bypass, false direct-tracking claim and unlabelled internal helper.
- [ ] All eleven gates, independent review, integration/hosted archive and cleanup.

## Implementation steps

- Initial focused run: 4 doc failures, 41 behavior/store passes; typecheck passed. Existing ComponentStore negative direct-write test remains unchanged. Corrected docs plus behavior/store/existing doc claims: 82 passes across four files; focused lint passed.
- Ignored evidence in tmp/component-contract-1107: red.log, green.log, types.log, lint.log, C1.log through C9.log and controls.json. Each control runs its named discriminator only and restores bytes in finally. No broader mutation coverage is claimed.
- Corrected the assignment's shorthand with root: callback returning void preserves identity; World.patchComponent returns T. The product source already implements this; only the runtime version marker changes for the patch release.

## Outcome

Prepared docs/test candidate. Full gates and exact review remain pending. E23's engine documentation gap is distinct from AoE2's unrecorded Gatherer writes and chosen-route state omission; neither consumer class is closed here. E03 paused-save adoption is also open despite work 80 API delivery.
