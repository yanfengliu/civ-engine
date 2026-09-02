# Canon candidates

Knowledge with no mechanical trigger that is true fleet-wide, staged here for the parent to route.

This is a staging area, not a second index: an entry lives here only until it lands somewhere that binds, and the file is deleted when it empties. Four entries were staged on 2026-09-02; three of them landed in `../fleet/FLEET.md` (fleet `51ed9a6`, `44504c6`) — the `2>/dev/null` absence proof folded into "verify the instrument before trusting the measurement", the shared-flag coverage gap into the new green-gate rule, and the `git add` all-or-nothing failure into the new exit-status rule — and were deleted here in the commit that recorded this.

Delete a section once it lands.

---

## A reviewer CLI's read-only mode is an assumption to verify per version, not a property to trust: audit the working tree after every review batch, and pin the shapes a silent write would change.

**From:** civ-engine / "2026-06-11 — \"Read-only\" reviewer CLIs can write: audit the working tree after every review batch"

**Where this belongs:** `../fleet/docs/skills/multi-cli-review.md` rather than `FLEET.md` — it is a claim about a reviewer CLI and the review workflow, which the canon already routes to that skill doc. It is staged here because the parent owns `skill-candidates.md`.

**What it adds that the canon does not say:** the canon says to read the artifact a tool claims to have changed; it does not say to read the artifacts a tool claims **not** to have changed. A subprocess invoked in a plan/read-only mode is an unreviewed writer until `git status` says otherwise.

**Why it has no gate:** nothing in a repository can force a `git status` after a subprocess the agent chose to run. The structural half — pinning tests that make a silent mutation loud — is gateable and is in place here; the audit habit is not.

**Anchor:** v0.8.23 (v1-surface). `src/index.ts` was corrupted twice mid-objective (names re-attributed to wrong modules, invalid `.ts` import extensions, six public names silently dropped) and a hallucinated test was injected into `tests/engine-error.test.ts`. Every corruption window coincided with a running `gemini --approval-mode plan` review subprocess whose own stderr lists `replace` among its tools; corruption stopped permanently once no review subprocess was in flight. Incident recorded in `docs/threads/done/v1-surface/2026-06-11/1/REVIEW.md`; fixed in a53efc2.

**The transferring part:** the corrupted content was plausible — correct names, wrong modules — which is exactly why reading the diff is insufficient. The cheapest structural defense is a pinning test that turns silent mutation into a named delta, which is what caught the second corruption.
