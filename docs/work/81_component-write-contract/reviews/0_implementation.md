# Review 0: implementation

## Target

Exact tree `19d3bcb5c4811a663127ab3fc1d75c6e2b494b33` against base `c78a3b3162a3674b8e42204fed66cbabcdabf5ac`, preserved in source commit `eea571a0457075765be0975d6ac0eb70e75b3dff`.

## Reviewers and coverage

Independent in-session gpt-6-astra/xhigh, read-only exact-tree source and tests/docs inspection. External reviewer CLI source export was rejected earlier in the parent task and was not retried; no external CLI report is claimed.

## Reports

### gpt-6-astra / xhigh

Reviewed exact tree `19d3bcb5c4811a663127ab3fc1d75c6e2b494b33` against base `c78a3b3162a3674b8e42204fed66cbabcdabf5ac`.

One material finding:

- **[P2] Qualify replacement behavior for `null` callback returns** — `docs/api-reference.md:1352`. The new text promises that a returned replacement becomes the stored and returned value. However, unchanged `src/world-entities.ts:185` uses `patch(current) ?? current`. Consequently, `patchComponent<{ hp: number } | null>(id, 'health', () => null)` republishes and returns the previous component. `null` is valid component data, explicitly accepted by `src/json.ts:12` and documented in the component guide. The unconditional guarantee is repeated in the component guide, invariants guide, serialization guide, and changelog. Document that `null` and `undefined` retain the current value, that other returned values replace it, and that storing `null` requires `setComponent`. Add a contract test for this existing behavior; preserve runtime semantics.

No other material findings in the reviewed scope:

- Tests distinguish live identity, the method’s returned value, replacement identity, later-system visibility, and recorded publication.
- Raw-write tests and documentation correctly distinguish absent notifications from mutations appearing in an already-dirty value.
- Default/custom position-key coverage checks immediate grid movement. Strict rejection precedes the callback, and callback/JSON/position failures correctly retain prior live-reference mutations.
- The internal `applyTickDiff` error-table label matches its implementation and absence from both public barrels.
- The only changed runtime source is `src/version.ts`, moving to `2.9.1`.

Validation bounds: this was a read-only review. I inspected the existing 82-pass focused log and all nine control failure logs; their failures correspond to the intended discriminators. I did not independently execute tests, gates, mutation controls, or network operations. The object-to-object whitespace check passed. An optional working-tree comparison failed with “must be run in a work tree”; exact-tree blob inspection remained available and is the basis of this report. No writes, installations, reviewer CLI launches, or subagents were used.

## Findings and disposition

P2 accepted. Corrected documentation and a nullable-component contract were prepared without runtime changes; round1 independently verifies the repair. No other material finding.

## Verification

Original exact tree passed all eleven local gates before its preserving commit: 1,924 root tests plus the existing TODO and22 MCP tests, Node24.12.0/npm11.7.0. Root audit has seven moderate development findings; production/MCP audits pass clean. Nine original regression controls failed and restored exactly. These are implementer-run checks, separate from reviewer inspection.

## Round outcome

Repair required before final acceptance; the exact original candidate is recoverable. Follow-up review is recorded in round1.
