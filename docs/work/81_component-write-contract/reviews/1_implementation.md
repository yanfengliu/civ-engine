# Review 1: implementation

## Target

Repair tree `34b86118379af0daf9de464b1f7a9b363ec1bcc1` against original reviewed tree `19d3bcb5c4811a663127ab3fc1d75c6e2b494b33`.

## Reviewers and coverage

Same independent in-session gpt-6-astra/xhigh reviewer, read-only focused rereview of the P2 correction and introduced contract. No external CLI export or invocation.

## Reports

### gpt-6-astra / xhigh

The P2 finding is closed. No new material findings in the repair.

Reviewed repair tree `34b86118379af0daf9de464b1f7a9b363ec1bcc1` against previously reviewed tree `19d3bcb5c4811a663127ab3fc1d75c6e2b494b33`. Verified that preserved commit `eea571a0457075765be0975d6ac0eb70e75b3dff` contains that original tree.

The seven updated documentation surfaces now accurately distinguish non-nullish replacements from `null`/`undefined` fallback and direct readers to `setComponent` for storing an explicit `null`. The API reference also correctly states that an already-null component reaches the callback rather than being treated as absent. These claims match unchanged `src/world-entities.ts:181`, whose existence check rejects only `undefined` and whose publication selects `patch(current) ?? current`.

The new nullable contract test at `tests/component-publication-contract.test.ts:58` checks returned and stored identity for both nullish results, explicit null storage, null callback input, and replacement of a null component. It therefore exercises the behavior behind the corrected prose. The documentation check covers all seven updated surfaces.

Evidence inspected:

- Initial focused run:18 passed, one new documentation failure.
- Corrected focused run: all19 passed.
- C10: changing null into a replacement fails the identity assertion.
- C11: restoring the unconditional API claim fails the documentation check.
- The control harness restores source/document bytes in `finally` and checks equality afterward; its result records both failures and successful restoration.
- Object-to-object `git diff --check` passed. The repair changes no runtime source.

This was a read-only rereview. I did not execute tests, mutation controls, full gates, network operations, installations, reviewer CLIs, or source exports. Corrected-candidate full gates and delivery remain outside this review and pending with the root agent.

## Findings and disposition

P2 closed; no new material findings. Root accepts the corrected existing-behavior contract without changing runtime semantics.

## Verification

The reviewed repair passed19 focused cases, typecheck and focused lint. Both new negative controls failed and restored exactly. Corrected full gates and hosted delivery remain pending and are recorded in the work plan when completed.

## Round outcome

Independent review accepted. Final local/hosted gates and delivery are still required.
