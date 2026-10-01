# Review 0: implementation

## Target

Civ-engine base a2bfe02a6c722274a16e718692bd56902372a092; exact eight-file staged dependency/release patch SHA256 3c891b5cd6b791e2d2fb8d5815b13daa98a6c16a502f9665904fa32934f6ad88, retained ignored at tmp/review-runs/engine-71-m0/target.patch until the unchanged seven code/metadata blobs are bound to the shipping commit. Scope: package.json, package-lock.json, mcp/package.json, mcp/package-lock.json, src/version.ts, mcp/src/server.ts (identity literal), README.md badge, docs/changelog.md. Uncommitted plan/devlog/registry excluded. Original authored changelog bytes are retained in snapshots/m0-changelog-review-0.md, SHA256 19ce93f93d716391059e585738919c67564951dbc5ede9e48cd34293766c822e; only its contributor installation sentence changes after this round.

## Reviewers and coverage

Codex CLI 0.158.0, gpt-6-astra at xhigh, read-only ephemeral sandbox; one bounded foreground review, no delegation/background tasks. Actual process exit 0 and complete substantive terminal report below; no DLL initialization failures. Outside-diff citations were spot-checked against version-sync.test.ts:59, CI:33/70 and MCP test transport:71. Before/after target patch bytes match. No Claude review was requested for this narrow target. Registry/advisory/runtime execution remained owner/CI verification rather than independently measured reviewer evidence. Initial launch was rejected before execution by automatic approval review's mistaken private-source classification; fresh public GitHub visibility and explicit user-supplied R10/R29 authorization supported one direct retry, which was accepted. No workaround execution was used.

## Reports

### Codex gpt-6-astra / xhigh

**One documentation finding; no demonstrated lockfile or release-stamp defect.**

**P2 — The contributor refresh command leaves MCP dependencies stale.** [docs/changelog.md:9](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/docs/changelog.md:9) instructs contributors to run root `npm ci`, then `npm run gates`. MCP is a separate package, and the gate deliberately omits installation ([scripts/gates.mjs:27](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/scripts/gates.mjs:27)). Its MCP steps only audit, build, and test ([scripts/gates.mjs:44](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/scripts/gates.mjs:44)). An existing checkout can therefore retain the old MCP runtime packages while auditing the updated lockfile and testing the old installation. Update the instruction to refresh both installations, preserving the root-build-before-MCP ordering used in CI. This does not invalidate the owner-reported isolated installs.

The remaining static review found:

- **Lockfile consistency:** All eight reconstructed target blobs match the patch’s Git object identifiers against base `a2bfe02a6c722274a16e718692bd56902372a092`. Changed dependency edges resolve to entries satisfying their recorded ranges. The eight Vitest entries match across lockfiles. `@humanfs/types` is development-only; qs’s newly required `es-define-property` and tightened `side-channel` range resolve to existing runtime entries. No runtime package entry was added.
- **Resolution and compatibility:** Changed registry URLs match package names and versions, and their SHA-512 integrity values are structurally valid. No existing entry gains stricter engine/platform metadata or an install-script flag. Vite, Rolldown, their platform bindings, and the MCP SDK remain unchanged. The retained development toolchain already requires Node 20.19+ or 22.12+; that restriction is inherited.
- **Versions and release scope:** Core copies agree on `2.4.2`; MCP manifest, lockfile, and server identity agree on `0.1.1`. Source changes are version literals only. The changelog’s package/version inventory and unchanged core-format claim match the patch.

Outside the diff, I read [tests/version-sync.test.ts:59](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/tests/version-sync.test.ts:59), which checks root lock versions and the MCP-linked engine version. [CI:70](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/.github/workflows/ci.yml:70) establishes the Node 20/22/24 matrix; [CI:33](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/.github/workflows/ci.yml:33) makes rolling-dist publication depend on it.

**Unavailable verification:** I did not independently verify registry tarball bytes, advisory descriptions, audit results, runtime compatibility, or the final gate. The reported successful installs and zero-vulnerability audits are owner-supplied evidence. The final all-step gate remains required after the three MCP runtime updates. Existing MCP tests use linked in-memory transports ([mcp/tests/server.test.ts:71](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/mcp/tests/server.test.ts:71)); they do not establish coverage of every affected HTTP/URI/subnet behavior. CI’s matrix runs on Ubuntu, so it also does not establish cross-platform execution.

Reviewed patch SHA-256: `3c891b5cd6b791e2d2fb8d5815b13daa98a6c16a502f9665904fa32934f6ad88`.

Review completed entirely in the foreground with read-only inspection. No tests, builds, installs, network commands, delegation, file changes, or persistent resources.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | P2: contributor refresh instructions update root only, leaving MCP installation stale. | Accepted. scripts/gates.mjs deliberately omits npm ci, so separate package installation must be explicit. | Fix changelog line 9 to root npm ci plus build, MCP npm ci, then root gates; focused round 1 required. |

## Verification

Both private final-lock npm ci --ignore-scripts runs passed and the MCP audit reported zero vulnerabilities after the approved three runtime-transitive patches. The earlier all-step gate passed ten of eleven before those patches and release stamps; it is not final acceptance. Full npm run gates on the repaired target, remote20/22/24 and publish-dist remain pending. No runtime test is inferred from static review or CLI exit alone.

## Round outcome

One accepted documentation finding; no demonstrated lockfile, resolution or release-stamp defect in the reviewed target. M0 remains unshipped until F0 re-review, final gate, main merge and remote completion. The larger 23-item engine-feedback objective remains active.
