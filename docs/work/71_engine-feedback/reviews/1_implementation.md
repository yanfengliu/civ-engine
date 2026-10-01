# Review 1: F0 installation instruction repair

## Target

Civ-engine base a2bfe02a6c722274a16e718692bd56902372a092; exact repaired eight-file staged patch SHA256 39ead5e3f7e69ac0d0d4f8d76d33532ca68ed607f0a4be9dd9e995cf2b85f0f5, retained ignored at tmp/review-runs/engine-71-m0/repair-target.patch until bound to the shipping commit. Compared to review 0, only docs/changelog.md:9 changes. The original authored changelog is recoverable from snapshots/m0-changelog-review-0.md; the other seven reviewed blobs remain unchanged. Uncommitted plan/devlog/registry and M1 proposal are excluded.

## Reviewers and coverage

Codex CLI 0.158.0, gpt-6-astra at xhigh, read-only ephemeral sandbox; one bounded foreground focused repair review with no delegation or background tasks. Actual session 10101 exited 0 with the substantive terminal report below. No DLL initialization failures; the staged patch digest before and after is identical. CI:85/90 and scripts/gates.mjs:27/44 were read and spot-checked outside the diff. An elevated task-owned Codex process query returned no remaining process. Registry/execution and final gates are explicitly outside this static review's measured coverage. No Claude lane was requested for this single-sentence repair.

## Reports

### Codex gpt-6-astra / xhigh

**F0 is resolved by the repair. No remaining demonstrated defect or scope drift was found. The final gate remains pending.**

Reviewed against base `a2bfe02a6c722274a16e718692bd56902372a092`. Local HEAD matches that base, and local origin matches `https://github.com/yanfengliu/civ-engine.git`. Repository visibility was supplied as PUBLIC; no network verification was performed.

Both patch SHA-256 values match the supplied values:

- Original: `3c891b5cd6b791e2d2fb8d5815b13daa98a6c16a502f9665904fa32934f6ad88`
- Repaired: `39ead5e3f7e69ac0d0d4f8d76d33532ca68ed607f0a4be9dd9e995cf2b85f0f5`

I reconstructed both eight-file targets in memory from the base, verifying hunk context, counts, and Git blob identifiers. The file sets are identical. **Only the contributor installation sentence at [docs/changelog.md:9](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/docs/changelog.md:9) changed**, with the corresponding patch blob identifier updated. All eight working-copy files match the repaired target after CRLF normalization.

The corrected sequence addresses the accepted finding:

- Root `npm ci` and `npm run build` precede the separate MCP installation. MCP depends on the engine through `file:..` ([mcp/package.json:17](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/mcp/package.json:17)).
- Explicit `npm ci` in `mcp/` supplies the installation step deliberately omitted by the gate. The gate’s MCP steps only audit, build, and test ([scripts/gates.mjs:27](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/scripts/gates.mjs:27), [scripts/gates.mjs:44](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/scripts/gates.mjs:44)).
- Root-build-before-MCP ordering agrees with CI: root build occurs at [ci.yml:85](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/.github/workflows/ci.yml:85), followed by MCP installation at [ci.yml:90](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/.github/workflows/ci.yml:90). The local gate also builds root before its MCP steps.

I read both outside-diff files, `scripts/gates.mjs` and `.github/workflows/ci.yml`, and verified that their contents match the named base.

**Execution verification remains unavailable in this review.** No installs, tests, builds, audits, or gates were run; successful execution of the corrected sequence is therefore unverified. This review used foreground read-only inspection only, with no delegation, background tasks, network calls, modifications, or persistent resources. Uncommitted work documents were excluded from the verdict, and unrelated future API work was not reopened.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Review 0: root-only installation could leave MCP runtime dependencies stale. | Resolved in exact focused review. The corrected sequence explicitly refreshes both installations and follows CI root-build-before-MCP ordering. | Final execution gate and remote matrix remain required; no review finding is open. |

## Verification

The reviewer reconstructed original and repaired target blobs from the supplied patches and base, verified both SHA256 digests and confirmed the repaired working copies. Owner confirmed the staged bytes stayed unchanged and task-owned process cleanup. Both isolated package installations and post-repair zero-vulnerability audits are prior owner evidence, not reviewer execution. The earlier eleven-step gate passed ten before the MCP runtime patches and release stamps; the corrected full gate has not run yet. No result is inferred from CLI exit status alone.

## Round outcome

F0 resolved; no demonstrated remaining repair defect or scope drift. M0 remains unshipped until final eleven-step gate, main merge/push and actual remote matrix/publish-dist completion. The larger 23-item engine-feedback objective remains active.