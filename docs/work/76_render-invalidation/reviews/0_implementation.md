# Review 0: implementation

## Target

Repository civ-engine, base d48dd77. Reviewed staged tree 33735e8817868c48e3056deb18f520ecd3229d16 is retained exactly as commit c63f4f5 (its tree is identical). Scope: RenderAdapter invalidation, its regression tests, public docs, release metadata and priority plan. The later main integration adds only the independently authored AGENTS.md canon update from 85f4254 and task status/review records.

## Reviewers and coverage

Independent in-session gpt-6-astra reviewer at xhigh, using the fleet review pin. Static read-only implementation review with surrounding source access; no subagents or test execution. External CLI lanes were not run for this bounded change; this is not a multi-provider review. Root separately ran the complete local gates and built-entry smoke check.

## Reports

### gpt-6-astra

No material findings in candidate tree `33735e8817868c48e3056deb18f520ecd3229d16` against `d48dd77`.

- The detached queue preserves callback requests for the following diff; generation checks reject stale identities before merging. Existing changes still determine create/destroy handling and numeric ordering.
- Verified surrounding source: [world-entities.ts:72](C:/Users/38909/Documents/github/civ-engine-worktrees/render-invalidation-1107/src/world-entities.ts:72) returns a fresh live identity with its generation. Entity destruction increments that generation before cleanup, supporting the invalidation guard.
- The tests assert externally observable messages, projector counts, authoritative-state isolation, filtering, hide/reveal, recycling and callback timing. The 10,000-entity comparison supports the stated projection-work reduction.
- Documentation accurately bounds queued timing, replay responsibility, error consumption and remaining bookkeeping costs. The API addition and version updates preserve existing callers.

No blocking coverage gaps identified. This was a static, read-only review; I ran no tests, builds, installs, UI or network operations. The staged tree matched the supplied candidate. Downstream adoption and game throughput remain outside this review.

## Findings and disposition

No material findings. Root accepted the report after inspecting the cited getEntityRef implementation and comparing the reviewed tree with c63f4f5. There were no repairs or dissents.

## Verification

Initial eleven new regression cases failed on the absent API; all passed after implementation. The additional between-tick identity-reuse case passed. All eleven local gates passed with 1827 root tests plus one existing TODO, 22 MCP tests, exact benchmark counters and calibrated ratios, zero production/MCP audit findings and seven moderate root development advisories. Built public-entry smoke returned runtime 2.7.0 and the expected external-health update. Whitespace and staged credential-pattern scans passed. These are producer checks, not game adoption or wall-time measurements.

## Round outcome

Accepted implementation c63f4f5. Main integration and hosted publication were still pending at this review boundary. The plan remains the current status record.
