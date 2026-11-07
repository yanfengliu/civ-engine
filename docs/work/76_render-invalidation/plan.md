# Selective render invalidation and engine priorities

Status: complete
Owner: Codex
Created: 2026-11-07
Updated: 2026-11-07

## Problem and outcome

AoE2 reconnects RenderAdapter for projected state outside components. Its November 6 measurements attribute 59.6-68.5% of large-map tick time to reconnection. Add selected-entity invalidation and retain the owner's requested [priority list](../../design/engine-priorities.md).

## Scope

Engine producer milestone at base d48dd77, branch codex/render-invalidation-1107. Preserve unrelated primary AGENTS.md changes and deleted Cursor state. No game code, shared compiled runtime, persistent format or dependency changes. AoE2 adoption and map throughput remain separate acceptance; this milestone proves projector work reduction, not game speedup.

## Approach

Add RenderAdapter.invalidate(entityIds: Iterable<EntityId>): void. Connected calls capture live generations for the next onDiff; duplicates coalesce and unknown/dead IDs are ignored. Merge with normal changes in numeric ID order, projecting once per entity and bypassing shouldProjectChange for invalidated entities. Invalidation-only changes have empty component/resource key lists. Detach the batch before callbacks so new requests survive for the next tick. Disconnection clears requests; disconnected calls do nothing because reconnect sends a full snapshot. No authoritative world state, tick, recorded diff or snapshot changes. Generation checks prevent invalidations following recycled identities.

## Acceptance criteria

- Contract tests fail before implementation and cover selected views, coalescing, filters, hide/reveal, create/destroy/recycle, disconnected calls and callback/lifecycle boundaries.
- A 10,000-entity fixture proves one projector call for one changed unit, equality with a fresh full projection and isolation from world diffs.
- Additive API ships as 2.7.0 with public-member fixture, API/guide/README/changelog/version updates, defect register and devlog.
- Independent exact review, all eleven local gates, integrated main and hosted Node 20/22/24 plus publish-dist pass. Consumer adoption stays explicit.

## Implementation steps

- Complete: priority list, RED contract tests, adapter implementation and 2.7.0 release documentation in c63f4f5.
- Complete: independent [review 0](reviews/0_implementation.md), eleven local gates (1827 root passes plus one TODO, 22 MCP passes), built-entry smoke and credential-pattern scan.
- Complete: integrated main gates and merge/push at 1ff6118, retaining the incoming AGENTS.md canon commit 85f4254.
- Complete: hosted CI 42411211525 passed Node 20/22/24 and publish-dist; actual published-package smoke passed. The priority list identifies consumer adoption as next; task-owned temporary resources are removed at session cleanup.

## Outcome

Implementation c63f4f5 is verified and independently reviewed, integrated as main 1ff61186da3c5b7ab6ef22a18ff99a81c3c1e18e. All eleven integrated local gates passed with 1827 root passes plus one existing TODO and 22 MCP passes. [Hosted CI 42411211525](https://github.com/yanfengliu/civ-engine/actions/runs/42411211525) passed Node 20/22/24 and publish-dist. Published asset 721852179 was downloaded (662037 bytes, SHA256 f85d3b27711319edaa65600723d975b9d96052b9cfc91b782c0b69ad7f79878a); manifest and compiled runtime both report 2.7.0. A public-import smoke against the extracted tarball observed the expected external-health render update. Seven moderate root-development advisories remain; runtime/MCP audits passed.

The shared compiled runtime is still 2.5.0 and is preserved until consumer adoption is checked. No game integration or map-throughput improvement is claimed. The priority list tracks those next, and existing work 71/history remain intact. Only the task's allocator placeholders were removed from primary before the fast-forward; the pre-existing Cursor-state deletion was preserved. Final closure changes documentation only and retains the reviewed implementation exactly.
