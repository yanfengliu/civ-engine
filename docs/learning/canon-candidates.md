# Canon candidates

Knowledge with no mechanical trigger that is true fleet-wide, staged here for the parent to promote into `../fleet/FLEET.md`.

The canon: "An entry that can name no gate is not a lesson — fleet-wide knowledge is staged in `canon-candidates.md` for this constitution." Until promoted, this file is the only copy, so each section carries its provenance.

Delete a section once it lands in FLEET.md.

---

## An empty result proves nothing until the instrument is proved to have run: never establish an ABSENCE with a command whose stderr is suppressed.

**From:** civ-engine / "A search tool that isn't on PATH returns empty *identically to \"no matches\"* — never prove ABSENCE with a `2>/dev/null`-suppressed command"

**Why it has no gate:** it constrains how an agent runs an ad-hoc command during investigation, not what the repository contains; there is no artifact to check.

**Anchor:** full-review H2 reachability check, 2026-07-10 (devlog `2026-07-07_2026-07-10.md` → "Notes"). `rg -n … 2>/dev/null | grep …` over the sibling repos returned empty, and the read taken from it was "no consumer uses the `ImprovementFinding` contract" — which would have mis-scoped a versioning decision. `rg` is not on this machine's Git-Bash PATH, so the invocation errored to stderr, the redirect hid it, and a broken command was indistinguishable from a clean codebase. Re-running with `grep -rn --include --exclude-dir` showed aoe2 IS a live consumer.

**Practical form:** run a positive control first (grep for something you KNOW exists and confirm it is found), or `which <tool>`; do not suppress stderr when a search result gates a decision; treat "empty" as "unproven", not "absent". This is the same family as the existing canon line "Verify the instrument before trusting the measurement" and may be best folded into it as a concrete instance rather than added as a separate rule.

---

## When a fix claims to cover N cases, the check must know what N is: a shared flag that any one case can satisfy is not coverage of the others.

**From:** civ-engine / "A `replace_all` on a call-shape pattern silently skips the differently-formatted call sites — and a test that only exercises the matched ones passes green"

**Why it has no gate fleet-wide:** the concrete instance IS gated in civ-engine (`tests/bounded-stream-truncation.test.ts`, mutation-proved at all five call sites — see `gate-proofs.md`). What does not localise is the editing discipline: after a structural `replace_all`, grep the negative and prove the match count equals the intended count, because a literal pattern silently skips the differently-formatted call sites.

**Anchor:** full-review 2026-07-10 iter-2, `docs/threads/done/full/2026-07-10/2/REVIEW.md`. `replace_all` on `pushBounded(this.` matched the ONE single-line call and not the four written with a newline and indent between `(` and `this.`. Re-measured 2026-09-02: reintroducing the defect at a different call site left the repo's own regression test green at 5/5 and the whole suite green at 1382/1382, because the assertion was on one shared flag that any of three sibling streams satisfied.

**Why it belongs in canon:** it is the general statement of the campaign's most common finding — the gate tests the fixed unit while the defect lives at another call site — and it gives that finding an actionable form: name N before writing the check.

---

## A reviewer CLI's read-only mode is an assumption to verify per version, not a property to trust: audit the working tree after every review batch, and pin the shapes a silent write would change.

**From:** civ-engine / "2026-06-11 — \"Read-only\" reviewer CLIs can write: audit the working tree after every review batch"

**Why it has no gate:** nothing in a repository can force a `git status` after a subprocess the agent chose to run. The structural half — pinning tests that make a silent mutation loud — is gateable and is in place here; the audit habit is not.

**Anchor:** v0.8.23 (v1-surface). `src/index.ts` was corrupted twice mid-objective (names re-attributed to wrong modules, invalid `.ts` import extensions, six public names silently dropped) and a hallucinated test was injected into `tests/engine-error.test.ts`. Every corruption window coincided with a running `gemini --approval-mode plan` review subprocess whose own stderr lists `replace` among its tools; corruption stopped permanently once no review subprocess was in flight. Incident recorded in `docs/threads/done/v1-surface/2026-06-11/1/REVIEW.md`; fixed in a53efc2.

**The transferring part:** the corrupted content was plausible — correct names, wrong modules — which is exactly why reading the diff is insufficient. The cheapest structural defense is a pinning test that turns silent mutation into a named delta, which is what caught the second corruption.

---

## `git add` fails all-or-nothing and the `commit` after it still succeeds: read `git diff --cached --stat` before committing, and verify a push landed its contents rather than its exit code.

**From:** civ-engine / "2026-07-15 — `git add` aborts wholesale on one bad pathspec; the next `commit` then ships a message that lies about its contents"

**Why it has no gate:** it is a property of the VCS command sequence an agent types, not of the repository. A pre-commit hook could approximate it, but hooks are per-machine, are not run by any gate command, and would not catch the case at all — the index was non-empty, so nothing was anomalous to a hook.

**Anchor:** README restructure, 2026-07-15. `git add <7 real files> <1 stale path>` was passed a pre-rename devlog filename that an earlier `git mv` had already staged. `git add` treats an unmatched pathspec as `fatal:` and stages **nothing** — but the index still held the `git mv` rename, so the very next `git commit` succeeded, produced a 0-insertion/0-deletion rename-only commit carrying a 40-line message describing the full restructure, and pushed it to `main` (48d3361). Every content change sat unstaged and invisible in the "success" output. Landed honestly as 00ee3b6.

**The tell:** a "restructure" commit reporting `1 file changed, 0 insertions(+), 0 deletions(-)`. The `--stat` is the receipt. Corollary: once pushed, prefer an honest follow-up commit over a history rewrite.
