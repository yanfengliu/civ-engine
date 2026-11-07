# Review 0: implementation

## Target

civ-engine commit 4c4e989814d2fedc867363c6a2684a315a109c2a, tree cc413f9ae60463015809982b306705e26f2e7311 against 614c75a3ca4955f10083e552bf2217c6a221f955. Scope: publisher, CI workflow, regression/doc-claim tests, installation instructions and 2.8.1 metadata.

## Reviewers and coverage

Independent in-session gpt-6-astra/xhigh, read-only source and staged-diff review. Separate external CLI source export had been rejected by automatic approval review during work 78, so this review used the in-session lane. No external lane report is claimed. The owner explicitly approved retained release assets before this implementation.

## Reports

### gpt-6-astra / xhigh

No material findings in staged tree cc413f9ae60463015809982b306705e26f2e7311 against base 614c75a3ca4955f10083e552bf2217c6a221f955. Read-only Git comparisons confirmed the reviewed working files matched that tree.

Verified:

- Publisher lines 24–38: retained and rolling assets use the same captured bytes; existing archives require matching SHA-256; archive uploads omit --clobber; rolling replacement follows archive success. Concurrent archive creation fails closed.
- Cleanup and command handling, scripts/publish-dist.mjs:40: temporary files are removed on ordinary errors and runner exceptions. Argument validation and argument-array execution avoid shell interpolation.
- Workflow binding, .github/workflows/ci.yml:33: publication depends on the test matrix, runs only for main pushes, and follows checkout, installation, build, and packing.
- **Surrounding code outside the diff:** package allowlist at package.json:30 includes compiled dist and intended documentation; existing version checks at tests/version-sync.test.ts:59 cover both lockfiles and the changelog. Metadata consistently changes to 2.8.1. No dependency, runtime API, serialized-format, or credential additions found.

Tests adequately cover the principal publication branches. One nonblocking limitation: workflow assertions at tests/retained-dist.test.ts:105 inspect text rather than YAML structure; current ordering was verified manually.

Bounds: no tests, builds, installs, network requests, publication, or external reviewer CLI were run. Real GitHub upload/download semantics, published manifest/runtime identity, and a clean consumer installation still require delivery verification. Rolling replacement retains its existing non-atomic failure window; retained archives are not overwritten.

## Findings and disposition

No material findings. The workflow text-check limitation is retained as a review bound; behavioral publisher tests and manual workflow review cover this bounded change without introducing a YAML dependency.

## Verification

Root ran all eleven gates successfully: 1847 root tests plus one existing TODO, 22 MCP tests; root dev audit retains seven moderate findings, production/MCP audits clean. Final focused doc-claim/publisher/version run passed 58 tests. Staged whitespace, credential-pattern scan and work-record checks passed. Review tree matched the committed implementation.

## Round outcome

Accepted for integration and approved publication. Hosted CI, actual archive identity and consumer installation remain delivery gates.
