- MEDIUM — `docs/guides/synthetic-playtest.md:229-239`  
  The new disk-backed corpus example writes each run into fixed `artifacts/playtests/${i}` directories without warning that those bundle directories must be fresh. `FileSink.open()` does not clear existing JSONL/snapshot state, so rerunning this exact snippet against an existing corpus will silently mix old and new bundle data. Because this is now the canonical bridge from synthetic playtests into `BundleCorpus`, the guide should either clean the output directories or explicitly require a fresh output root per run.

- MEDIUM — `README.md:5`  
  The pre-release status paragraph is stale after this release touch. It still says the recent breaking cadence stops at `0.7.0` and that the current hardening sweep is `iter-7`, but `0.8.0` was itself a breaking release and the review history recorded elsewhere in this diff is already past iter-7. Leaving the root README inaccurate weakens the public stability/version guidance for API consumers.

- LOW — `docs/devlog/detailed/2026-04-27_2026-04-27.md:107-109`  
  The Spec 7 devlog entry is still written as a provisional pre-commit note (“final verification review and final gate run remain required before commit”) even though the same staged diff already bumps to `0.8.3` and records the gate results in `docs/changelog.md`. AGENTS says this detailed entry should reflect the post-convergence final state, so the audit trail is currently self-contradictory.
