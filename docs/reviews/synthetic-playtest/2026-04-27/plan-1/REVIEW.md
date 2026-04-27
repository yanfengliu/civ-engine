# Plan iter-1 Review Synthesis

**Iter:** 1. **Subject:** plan v1 (commit 5fea18b). **Reviewers:** Codex (2 BLOCKER + 3 HIGH), Opus (5 BLOCKER + 11 HIGH + 4 MED + 4 LOW/NIT).

**Verdict:** REJECT. Both reviewers find significant concreteness gaps and missing acceptance-criteria coverage. Engine facts are accurate; structure is sound. Findings are mechanical to fix in v2.

## Convergent BLOCKERS

### B-CONCRETE — test-body placeholders violate writing-plans concreteness rule

T2 Step 3 / Step 4 and T3 Steps 2-6 have `// ...` and `/* ... */` placeholders or prose-only headings. AGENTS.md writing-plans skill: "every step must be concrete (file paths, code blocks, exact commands, exact expected output)."

**Fix:** expand ALL placeholders with the actual `it(...)` body or describe in line-by-line code.

### B-MISSING-TESTS — 4 acceptance-criteria tests missing (Opus B4)

Design v10 §12 / §18 require but plan omits:
- Poisoned-world-at-start propagates `RecorderClosedError`.
- `sourceLabel` defaults to `'synthetic'`; override works.
- `metadata.failedTicks` populated when poisoning occurs.
- Composed-policy partial-submit-then-throw.

**Fix:** add to T2 Step 4.

### B-TYPECHECK — TS type-narrowing test wrong gate (Opus B1)

T2 Step 1 says run `npm test`; Vitest doesn't enforce strict narrowing at runtime. Should be `npm run typecheck` for type-only assertions.

**Fix:** correct the gate command.

### B-UNUSED-IMPORTS — `JsonValue` in T1, `startTick` in T2 (Opus B3, B5)

ESLint will fail. Drop or use them.

### B-NULL-COALESCE — `snapshotInterval ?? 1000` collapses null (Codex H1)

`null ?? 1000` → 1000 because null is nullish. Spec/Recorder treat `null` as "disable periodic snapshots."

**Fix:** use `'snapshotInterval' in config ? config.snapshotInterval : 1000` or the equivalent that distinguishes undefined from null.

### B-T3-HANDLER — T3 positive test uses 'spawn' without handler (Codex H3)

Engine missing-handler path → tick failure → poison → test cannot pass.

**Fix:** register handler in setup.

## Convergent HIGHs

### H-DOC-INDEX — docs/README.md + README Feature Overview/Public Surface in T2 (Opus H2/H3, Codex H4)

T2 ships the public guide and the user-visible API surface. AGENTS.md doc-discipline: README index + Feature Overview + Public Surface must land with the change.

### H-DOC-CONCRETE — concretize doc-update steps (Opus H1)

Both T1 Step 13 and T2 Step 7 say "add sections for X, Y, Z" without specifying content. Plan should at least give a line per section: signature line + one-sentence summary.

### H-VALIDATION — `policySeed`, `offset`, missing-default tests (Opus H5/H10/H11)

- `policySeed: NaN` or fractional value: harness should validate (reject NaN, allow integer-via-Math.trunc with warning).
- `randomPolicy.offset`: validate `0 <= offset < frequency`.
- Add a "no `sourceKind` config → defaults to `'session'`" guard test.

### H-DISCONNECT-OK — `disconnect()` sink failure semantics (Opus H6)

Currently plan returns `ok: stopReason !== 'sinkError'`. If terminal-snapshot write fails inside `disconnect()`, recorder.lastError is set but harness returns `ok: true` (because stopReason was already determined). 

**Fix:** `ok: stopReason !== 'sinkError' && recorder.lastError === null` (re-check post-disconnect). Note in Risks if this requires a design tweak.

### H-GREP-VERIFY — grep step for sourceKind union literal copies (Opus H4)

T2's b-bump rationale claims engine-internal has no exhaustive switches. Add an explicit verification step: `grep -r "'session' | 'scenario'" src/ tests/`.

### H-CTX-CATALOG — randomPolicy catalog `(ctx) => ...` use (Opus H9)

T1 Step 8 catalog uses `() => command`. Add a test where catalog reads `ctx.world.tick` to verify ctx threads through.

## Mediums + Lows

- **M-DEVLOG** (Opus M1): hardcoded devlog filename — guide says "latest file in detailed/, verify with `ls`."
- **M-SINK-ROUNDTRIP** (Opus M2): verify FileSink manifest round-trips `policySeed`.
- **M-T3-COMPOSITION** (Opus M4): T3 Step 5 should split single-throwing-policy and composed-throwing cases.
- **L-WORDING** (Opus L2): "vacuously over zero segments" → "one zero-length segment".
- **L-CAST-RISK** (Opus L4): also mention the `recorder.toBundle()` generic erasure cast in Risks.

## v2 plan structure

Plan v2 will:
1. Concretize all test placeholders with full `it()` bodies (B-CONCRETE).
2. Add the 4 missing acceptance tests in T2 (B-MISSING-TESTS).
3. Add T3 setup handler registration (B-T3-HANDLER).
4. Use `npm run typecheck` for type-only assertions (B-TYPECHECK).
5. Drop `JsonValue` import from T1; use or drop `startTick` in T2 (B-UNUSED-IMPORTS).
6. Fix `snapshotInterval` null handling (B-NULL-COALESCE).
7. Move README index + Feature Overview to T2 (H-DOC-INDEX).
8. Concretize doc steps with section content sketches (H-DOC-CONCRETE).
9. Add policySeed/offset validation + missing-default test (H-VALIDATION).
10. Tighten `ok` computation post-disconnect (H-DISCONNECT-OK).
11. Add grep-verify step in T2 (H-GREP-VERIFY).
12. Add ctx-using catalog test in T1 (H-CTX-CATALOG).
13. Use `ls` for devlog file selection (M-DEVLOG).
14. FileSink round-trip verify (M-SINK-ROUNDTRIP).
15. Split T3 Step 5 into single-throwing-policy + composed cases (M-T3-COMPOSITION).
16. Wording cleanup + cast-risk note (L-WORDING, L-CAST-RISK).

After v2, request iter-2 plan review. Expecting convergence given all findings are mechanical.
