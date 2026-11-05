# Both npm audit gates pass again

Status: active
Owner: Claude (fleet session, 2026-11-04)
Created: 2026-11-04
Updated: 2026-11-04

## Problem and outcome

CI failed at `npm audit --audit-level=high` on main since at least 2026-10-30 (runs 40983443105, 41178536232, 41476706640 and 41962330499), so its tests never ran there and `publish-dist` never refreshed `engine-dist` for downstreams. Locally, `npm run gates` failed the same two steps. The advisories were published against unchanged dependencies: in the root, source-map-js (GHSA-68fv-2mgg-jv7q) and vite; in `mcp/`, `@modelcontextprotocol/sdk`, body-parser, proxy-addr (critical), source-map-js, vite and zod (GHSA-mrhx-c7xc-m3w5, every release below 4.6.6). Outcome: both audit gates pass, all 11 gate steps pass, and CI on main is green.

## Scope

Included: the root lockfile (`npm audit fix`, no `--force`), `mcp/`'s SDK and zod ranges and lockfile, the patch release that records them (2.6.2, MCP 0.1.2), the changelog, ADR 50's SDK range, and this unit. Excluded: the root's seven moderate minimatch findings, which no released typescript-eslint fixes; the older inaccuracy in `docs/guides/mcp-server.md` ("Output and error discipline"), whose claim that every tool error carries an engine code was already untrue of the SDK's -32602 validation errors.

## Approach

No zod 3 release is patched, so zod moves to 4.6.7, a semver-major bump; SDK 1.32.2 accepts `^3.25 || ^4.0`. `mcp/src` uses only `z.string`, `z.number`, `z.boolean`, `z.object`, `z.array` and `z.enum` with `.optional`, `.int`, `.describe`, `.min` and `.max`, all unchanged in zod 4. The owner asked for the task to be done in this session after the canon change's report named the zod upgrade as the only fix.

## Acceptance criteria

- [x] `npm audit --audit-level=high` passes in the root (full tree and `--omit=dev`) and in `mcp/`.
- [x] All 11 `npm run gates` steps pass.
- [x] The MCP server's tools, as a client lists and calls them, keep their behaviour on valid input and still reject invalid input.
- [x] An independent supply-chain review of the exact diff finds nothing blocking (`reviews/0_implementation.md`).
- [ ] CI on main is green after the push.

## Implementation steps

- [x] Apply `npm audit fix` in the root; install SDK `^1.32.2` and zod `^4.6.7` in `mcp/` and run `npm audit fix` there.
- [x] Run the gates and list the tools through an in-memory MCP client.
- [x] Review, then record the release: versions, changelog, ADR 50, devlog.
- [ ] Merge to main, push, follow CI.

## Outcome

Both audits pass: `mcp/` has no findings, the root has seven moderate ones (minimatch GHSA-g3hv-75wg-m249 through typescript-eslint 8.72.1, the latest release), and all 11 gate steps passed (root 1,815 tests and 1 todo, `mcp/` 22 tests). Listed through an in-memory client, every tool keeps its properties, types, required fields, descriptions and enums; a wrong-type argument is rejected with a one-line error, and valid calls return what they did on 0.1.1 (the review compared 23 calls on both builds). The changes clients can see are in the 2.6.2 changelog entry. CI on main after the push is still to be read.
