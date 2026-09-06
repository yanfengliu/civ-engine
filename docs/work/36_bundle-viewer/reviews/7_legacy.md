# Bundle Viewer — Design Iteration 6 Review (2026-04-28)

**Disposition:** ACCEPT (both reviewers). Codex: 2 nits. Claude: 1 nit. All addressed in the same v6 doc.

Reviewers: Codex (gpt-5.5 xhigh), Claude (`claude-opus-4-7[1m]` max).

## Iter-5 findings disposition

- Codex MAJOR-B (immutability vs perf): ADDRESSED — selective runtime freezing model in §2 / §10 / §11 / ADR 33.
- Codex MINOR (BundleIntegrityError construction): ADDRESSED — §5.4 carve-out.
- Codex MINOR / Claude NIT (`WorldSnapshot.config.*` paths): ADDRESSED — §7 enumerates v5 shape correctly.
- Claude NIT (frozen vocabulary): ADDRESSED via §2 / ADR 33 explicit runtime semantics.

## Post-acceptance nits (folded into v6)

1. **Codex NIT — §4 "yield frozen entries":** changed to "yield readonly entries (RecordedTickEvent etc.; see §2 for freezing layers)" so the iterator clarifies the semantics.
2. **Codex NIT — §11 `diffSnapshots` scope test bullet:** qualified to mirror §7's enumeration (`WorldSnapshot.config.*`, `WorldSnapshot.entities.*`, etc.).
3. **Claude NIT — §5.4 line 343 listing snapshot-fallback `diffSince`:** added a parenthetical noting the §7 pre-check makes openAt unreachable for failure-in-range, so the listing is for completeness rather than common path.

## Convergence

Six design iterations. Both reviewers ACCEPT v6 with only nits. Per AGENTS.md, this satisfies the "iterate until reviewers nitpick instead of catching real bugs" gate. Move to PLAN phase next.

The accepted v6 is the canonical design. Implementation plan (PLAN.md) will be drafted next.
