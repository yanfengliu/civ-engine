# small-items-1x — review, iteration 1 (1.0.2)

**Reviewed:** the 1.0.2 patch diff (destroyCallbacks Set, PlayerObserver.reset dim re-assert, marker-validation extraction, AGENTS semver). **Reviewers:** Claude (fable-5 1m max) + Gemini (3.1-pro plan). Codex quota-exhausted (protocol). Contamination audit clean.

## Verdicts

**BOTH CONVERGED — no code defects.** Verified: Set iteration preserves insertion-order fan-out with all four live sites migrated; reset re-assert cannot false-positive on recover/reconnect/same-dim flows and matches the constructor's error shape; the extracted §6.1 validation is byte-equivalent (rule ids, messages, live-vs-retroactive split) with World satisfying MarkerWorldView structurally; the semver rewrite aligns with the deprecation policy.

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| C-L1 | LOW | api-reference lifecycle contract didn't name reset() as a grid-mismatch throw site (the contract itself tells readers to call reset there) | FIXED — clause added |
| C-L2 | LOW | The Set dedupe is an observable delta: same-reference double registration now no-ops, and `destroyCallbackCount` is a strict replay-verification category — a duplicate-registering factory's old bundle would replay to registration_mismatch (realistic blast radius ~zero: inline closures are distinct) | FIXED — changelog behavior note |

## Disposition

Ship as 1.0.2.
