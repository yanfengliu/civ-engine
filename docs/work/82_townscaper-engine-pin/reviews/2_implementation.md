# Review 2: implementation

## Target

Townscaper frozen tree `e1274237f44a780862db7b5aec20d668d4019a9a` against previously reviewed tree `735ca09dd0881e4f59ff7b0e68961d81cc6ce8bd`. Only `scripts/engine-install.test.mjs` changed; the complete frozen patch is retained ignored as `output/engine-pin-1107/reviewed-e1274237.patch`. Original base is `f0123b88051dfaf6665c4ea7c901fed956837954`. Production bytes remain those accepted in round 0.

## Reviewers and coverage

publisher_review, independent native Astra/xhigh lane, read-only exact test-only diff plus unchanged surrounding guard and retained focused/full gate evidence. No reviewer runtime reruns or external source export.

## Reports

### publisher_review

Full authored narrow Townscaper test-portability re-review — native Astra/xhigh, read-only.

Target: C:\Users\38909\Documents\worktrees\townscaper-engine-pin-1107\townscaper, frozen tree e1274237f44a780862db7b5aec20d668d4019a9a against previously reviewed tree 735ca09dd0881e4f59ff7b0e68961d81cc6ce8bd. Both `git diff --cached e1274237... --exit-code` and `git diff e1274237... --exit-code` returned empty, establishing that the index and tracked working tree matched the target at inspection. The tree-to-tree diff is exactly one file, scripts/engine-install.test.mjs, with 15 insertions and 3 deletions. No production, guard, package, lock, pin, or documentation bytes changed in this follow-up.

Findings: No material findings. The API expectation at scripts/engine-install.test.mjs:58 and CLI expectation at :127 now compare the entire installed-package path with the filesystem's canonical `realpath(installed)`. This preserves the physical-location contract while accepting equivalent checkout spellings such as Windows short-name/canonical-name differences; it does not reduce the assertion to a suffix, version-only check, or normalized self-comparison. The API assertion remains exact equality. The CLI retains status 0, empty stderr, the verified version/runtime success message, and the full canonical package path at :123–127.

The added checkout-root alias fixture at scripts/engine-install.test.mjs:61–71 creates a real junction on Windows (directory symlink elsewhere) in a separately owned temporary parent, invokes the API through that alias, requires the exact canonical physical packageRoot and pinned version, and explicitly rejects returning the alias spelling. Alias cleanup is already registered before invoking the guard; the unchanged afterEach at :48–50 unlinks owned aliases before recursively removing their owned temporary roots, including after assertion failure. No shared path is selected for cleanup. The existing copied-real-guard fixture at :17–40, direct/junction/Windows-case CLI success and failure routes at :106–138, shared engine/node_modules/dist link rejection at :95–103, and import-with-normal/absent/nonexistent-argv negatives at :140–150 remain intact.

Verified unchanged surrounding production citation: scripts/check-engine.mjs:14 derives packageRoot from `await realpath(root)`; :27–34 still require physical node_modules/package directories and private resolution, and :39–45 still verify compiled Node/browser runtime locations and ENGINE_VERSION. These lines explain why canonicalizing the expected path is correct and why permitting a checkout-root alias does not permit a shared package or dist installation. The direct CLI detection at :50–55 remains canonical and null-safe.

Verification: Read the complete changed test and surrounding guard, exact diff, output/engine-pin-1107/canonical-path-green.log (25/25 focused tests), output/engine-pin-1107/gates.json (test, typecheck, lint, build, full audit, production audit all exit 0 under Node v24.22.1/npm 11.6.2), and test.log (234 files, 2029 tests passed). Those are retained execution records, not reviewer reruns. I do not claim an independently reproduced RED for this Town follow-up. The earlier original-source review and separately delivered native-frame sample retain their stated bounds.

Round outcome: This exact test-only follow-up is acceptable. No further source repair or review round is requested. I performed no writes, test/gate executions, installs, network calls, browser/GUI launches, commits, staging, or external source/model exports.

## Findings and disposition

No material findings. Accepted the inherited Windows canonical-path portability repair: exact expected package location now comes from realpath, and the added real checkout alias case explicitly rejects returning the alias spelling. This is a test expectation correction; no assertion, timeout or runtime contract was weakened.

## Verification

Focused tests passed 25/25. Full required commands passed: npm test (234 files, 2029 tests), npm run typecheck, npm run lint, npm run build, npm audit --audit-level=high, npm audit --omit=dev --audit-level=high. Node 24.22.1/npm 11.6.2; full audit retains nine moderate development findings, production audit zero. Receipt observed 142 owned processes and zero leftovers. No new visual rerun was required for this test-only correction; round 1's production source is unchanged.

## Round outcome

Accepted exact follow-up. No material findings remain. Final documentation updates and integration acceptance are separate.
