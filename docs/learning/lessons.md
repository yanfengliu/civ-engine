# Lessons

The one-line form of every lesson this repo has paid for. Read this file at session start; it is short by construction.

Each rule links into [lessons-evidence.md](lessons-evidence.md), which holds the war story and the anchor. Open that only when a rule is in doubt, or the work is in that area — it is not session-start reading.

A new lesson is an entry there plus one line here. Run `npm run lessons:check` to keep the two in step: a rule always has an entry, and an entry always has a rule.

When a lesson becomes a gate — a test, a lint rule, a fixed command — delete both halves. The machine enforces it, so nobody needs to read it.

## Rules

- A search tool that isn't on PATH returns empty *identically to "no matches"* — never prove ABSENCE with a `2>/dev/null`-suppressed command ([evidence](lessons-evidence.md#a-search-tool-that-isnt-on-path-returns-empty-identically-to-no-matches-never-prove-absence-with-a-2devnull-suppressed-command-2026-07-10))
- A `replace_all` on a call-shape pattern silently skips the differently-formatted call sites — and a test that only exercises the matched ones passes green ([evidence](lessons-evidence.md#a-replaceall-on-a-call-shape-pattern-silently-skips-the-differently-formatted-call-sites-and-a-test-that-only-exercises-the-matched-ones-passes-green-2026-07-10))
- A new method on an exported class is additive PUBLIC SURFACE (minor), even when intended internal — and the name-level surface fixture won't catch it ([evidence](lessons-evidence.md#a-new-method-on-an-exported-class-is-additive-public-surface-minor-even-when-intended-internal-and-the-name-level-surface-fixture-wont-catch-it-2026-06-13))
- Fan-out audits miss cross-surface duplication — grep ALL copies of a fact before claiming a fix is complete ([evidence](lessons-evidence.md#fan-out-audits-miss-cross-surface-duplication-grep-all-copies-of-a-fact-before-claiming-a-fix-is-complete-2026-06-13))
- Code-review prompts: use the AGENTS.md baseline verbatim, then extract only the review ([evidence](lessons-evidence.md#code-review-prompts-use-the-agentsmd-baseline-verbatim-then-extract-only-the-review-2026-04-29))
- 2026-06-11 — "Read-only" reviewer CLIs can write: audit the working tree after every review batch ([evidence](lessons-evidence.md#2026-06-11-read-only-reviewer-clis-can-write-audit-the-working-tree-after-every-review-batch))
- 2026-06-13 — Migrating a derived rule: sweep pure-data twins, cross-package consumers, AND the failure write-path — not just the engine's own `src/` ([evidence](lessons-evidence.md#2026-06-13-migrating-a-derived-rule-sweep-pure-data-twins-cross-package-consumers-and-the-failure-write-path-not-just-the-engines-own-src))
- 2026-06-13 — For an "additive, non-breaking" engine change, the symlinked-consumer typecheck is the back-compat proof — not the engine's own gates ([evidence](lessons-evidence.md#2026-06-13-for-an-additive-non-breaking-engine-change-the-symlinked-consumer-typecheck-is-the-back-compat-proof-not-the-engines-own-gates))
- 2026-07-08 — Run the gates AFTER the version bump; never hardcode a version literal a test means relatively ([evidence](lessons-evidence.md#2026-07-08-run-the-gates-after-the-version-bump-never-hardcode-a-version-literal-a-test-means-relatively))
- 2026-07-10 — A version bump has more than one source of truth; pin the sync or a green suite hides the drift ([evidence](lessons-evidence.md#2026-07-10-a-version-bump-has-more-than-one-source-of-truth-pin-the-sync-or-a-green-suite-hides-the-drift))
- 2026-07-15 — Condensing prose REGENERATES claims: a name-level doc check cannot catch a sentence that became false ([evidence](lessons-evidence.md#2026-07-15-condensing-prose-regenerates-claims-a-name-level-doc-check-cannot-catch-a-sentence-that-became-false))
- 2026-07-15 — `git add` aborts wholesale on one bad pathspec; the next `commit` then ships a message that lies about its contents ([evidence](lessons-evidence.md#2026-07-15-git-add-aborts-wholesale-on-one-bad-pathspec-the-next-commit-then-ships-a-message-that-lies-about-its-contents))
- 2026-07-15 — A doc-accuracy sweep scoped to API names is blind to PROCESS claims; those go stale from a policy commit, not a code change ([evidence](lessons-evidence.md#2026-07-15-a-doc-accuracy-sweep-scoped-to-api-names-is-blind-to-process-claims-those-go-stale-from-a-policy-commit-not-a-code-change))
- 2026-07-15 — A doc sweep that greps names verifies the nouns, never the verbs: every false README claim used 100% valid identifiers ([evidence](lessons-evidence.md#2026-07-15-a-doc-sweep-that-greps-names-verifies-the-nouns-never-the-verbs-every-false-readme-claim-used-100-valid-identifiers))
