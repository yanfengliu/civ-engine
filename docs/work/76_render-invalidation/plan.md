# Selective render invalidation and engine priorities

Status: active
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

- Active: priority list and RED contract tests.
- Pending: minimal adapter implementation and public release documentation.
- Pending: independent review, full gates, main merge/push and remote completion.
- Pending: update producer/adoption status and clean owned resources.

## Outcome

Pending. Source/package is 2.6.2 while the shared compiled runtime is 2.5.0; preserve that runtime until consumer adoption is checked. Existing work 71 and its history remain intact.
