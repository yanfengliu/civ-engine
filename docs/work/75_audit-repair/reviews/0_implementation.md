# Review 0: implementation

## Target

The dependency change before its release records: the uncommitted diff in worktree branch `audit-fix` on top of civ-engine `fa55c0b`, made of the root `package-lock.json` (`npm audit fix`, no `--force`, no `package.json` change) and `mcp/package.json` (`@modelcontextprotocol/sdk` ^1.29.0 to ^1.32.2, `zod` ^3.25.0 to ^4.6.7) with `mcp/package-lock.json`. Those three files are unchanged in the landing commit, which adds the 2.6.2 / MCP 0.1.2 version bumps, the changelog entry, ADR 50's range, the devlog line and this unit.

## Reviewers and coverage

One independent Claude Opus 5.5 subagent, read-only in the repo, with scratch files outside it. It checked every changed lockfile entry against the registry, ran `npm audit`, `npm audit signatures` and `npm ls` in both directories, audited the old locks in a scratch copy, and compared `tools/list` and 23 tool calls between the old build (the main checkout: SDK 1.29.0, zod 3.25.76) and the new one. It did not rerun the gates or run CI's Node 20 and 22 jobs. Codex was not used.

## Reports

### Claude Opus 5.5 subagent

Verdict: nothing blocking.

1. Lockfile integrity is clean. All 70 changed name@version pairs match the registry's `resolved` URL and sha512 `integrity`; no changed version has install scripts (the only `hasInstallScript` entry is fsevents, already there); `npm audit signatures` verifies every installed package (root 150, mcp 290); provenance for the SDK, zod, hono, @hono/node-server, ip-address, body-parser, proxy-addr, fast-uri, vite, rolldown and others points at their upstream repos. The one new package name is `@rolldown/binding-android-arm-eabi`, rolldown 1.2.16's own optional platform binding; rolldown 1.2.16 also dropped `binding-wasm32-wasi`, which removed @emnapi/*, @napi-rs/wasm-runtime, @tybys/wasm-util and tslib. The only entry without integrity is the `..` `file:` link. One transitive major: @hono/node-server 1.19.17 to 2.1.6 (GHSA-rmxm-3fg6-px4f), Node >=20 as CI's floor, imported only by the SDK's `streamableHttp.js`, not the stdio entry. ip-address 10.7.6, @hono/node-server 2.1.6, hono 4.13.16 and semver 7.8.6 are 1 to 4 days old, all with provenance; older fixed releases exist if a waiting period is wanted, and no rule requires one. The root lock also took upgrades no advisory needed (typescript-eslint 8.58 to 8.72.1, semver 7.7 to 7.8); keeping them is fine.
2. Every advisory is fixed but one known moderate. The old locks had root 2 high and 9 moderate, mcp 1 critical, 5 high and 7 moderate. Now mcp has 0 and root has 7 moderate, all minimatch GHSA-g3hv-75wg-m249 (>=7.0.0 <11.0.1); typescript-estree 8.72.1, the latest, still requires minimatch `^10.2.2`, so no fix exists without `--force`. Every named package is past its fixed version, and `npm ls --all` is clean in both directories. No patched zod 3 release exists.
3. zod 4 behaviour. Valid calls give identical output; unknown keys are still stripped, at the top level and inside `baseline`/`current`. Minor: `additionalProperties: false` is gone from all 14 object schemas, since SDK 1.32.2 converts zod 4 schemas in input mode (`zod-json-schema-compat.js:21-24`); clients that read schemas lose the "no extra keys" signal while the server behaves as before, nothing in the repo describes it, and putting it back would need `z.strictObject`, which would make the server reject unknown keys. The `$schema` key is not new: SDK 1.29 sent the same draft-07 URI. `compare_metrics.current`'s `$ref`s are now inlined. Integers beyond ±(2^53−1) are now rejected with -32602 where they reached the handler before, which matches the engine's own MAX_SAFE_INTEGER tick limit. Input-validation errors changed from a JSON list of zod issues to one line; nothing parses that text, and the 22 tests send no invalid arguments. An older doc problem, not caused by this change: `docs/guides/mcp-server.md` ("Output and error discipline") says every tool error carries an engine code, which the SDK's -32602 validation errors never did.
4. Docs that state versions. Minor: `docs/architecture/decisions.md:57` (ADR 50) still says SDK `(^1.29)`, and AGENTS.md allows stale references only in changelog, devlog and drift-log entries. No current doc states a zod version; `docs/work/58_mcp-server/` is a historical record. Minor, process: no version bump, changelog or devlog entry yet, where the 2.4.2 repair bumped the engine and MCP versions with a changelog entry.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Report item 1: fresh releases and unneeded root upgrades | Accepted as reported, no change: all carry provenance and no rule asks for a waiting period. | None. |
| F1 | Report item 3: `additionalProperties: false` gone, one-line validation errors, integers past ±(2^53−1) rejected | Accepted as client-visible behaviour, kept: the server's own handling of unknown keys is unchanged, and `z.strictObject` would change it. | Stated in the 2.6.2 changelog entry. |
| F2 | Report item 3: `docs/guides/mcp-server.md`'s engine-code claim | Accepted as an older inaccuracy outside this change. | Left; recorded in `plan.md`'s scope. |
| F3 | Report item 4: ADR 50's SDK range | Accepted. | ADR 50 says `(^1.32)` and zod `(^4)`. |
| F4 | Report item 4: no version bump, changelog or devlog | Accepted, following the 2.4.2 repair. | 2.6.2 and MCP 0.1.2 in `package.json`, both lockfiles, `src/version.ts`, `mcp/src/server.ts` and the README badge; the changelog entry; the devlog line. |

## Verification

Before the review, in the worktree: `npm run gates` passed all 11 steps (root 1,815 tests and 1 todo, `mcp/` 22 tests); an in-memory MCP client listed every tool's schema and saw a wrong-type argument rejected and a valid call answered. After the release records, the gates were run again before the commit. CI's Node 20 and 22 jobs run only on push.

## Round outcome

Nothing blocking. The minor findings are repaired or recorded, and nothing material remains open.
