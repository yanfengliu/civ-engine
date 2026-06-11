# registration-manifest — implementation review iteration 1

**Diff:** working tree vs HEAD `1e2ef2f` (single-objective). **Reviewers:** Codex `gpt-5.5` xhigh, Gemini `gemini-3.1-pro-preview`, Claude `claude-fable-5[1m]` max.

## Verdicts

- **Gemini:** clean APPROVE across all seven review questions ("no modifications necessary").
- **Claude:** "no correctness bugs found" — verified the comparator edges (validator extras both directions, JsonValue-safety incl. the normalize-time defaulting that prevents undefined leaks, positionKey non-healability making that check live, the two serialize/_replaceStateFrom invariants the extras-union rests on), the single-construction-path claim (one factory call site in src), capture isolation, fork-under-skip semantics, and the updated old-contract tests preserving their original subjects. Findings were coverage + docs (below).
- **Codex:** 1 HIGH + 2 MEDIUM.

## Findings → dispositions

| # | Sev | Reviewer | Finding | Disposition |
|---|-----|----------|---------|-------------|
| 1 | HIGH | Codex | **Duplicate-name length drift passed verification**: set-based missing/extra + min-length detail loop + no length term in the clean predicate → recorded `['a','b','a']` vs factory `['a','b']` returned clean. Duplicate unconstrained names are legal, so this violated the duplicates-stay-positional contract. | **Fixed**: ordered name-array equality (`length` + positional `every`) is now the strict criterion; set diffs remain diagnostics. Regression test records a duplicate system and asserts the mismatch with order arrays as evidence (sets blind, as the test documents). |
| 2 | MEDIUM | Codex | Adapter aliased the caller-owned manifest (`result.registration` / override) into bundle metadata — later caller mutation would silently mutate the replay contract the verifier reads. | **Fixed**: deep-cloned via `cloneJsonValue` at the adapter. |
| 3 | MEDIUM | Codex + Claude (convergent) | api-reference listings stale: `SessionMetadata` snippet missing the field; `ScenarioResultToBundleOptions` listing contradicting its prose; no `RegistrationManifest` interface section despite it being a public export; the `ReplayHandlerMissingError` sentence now unconditionally wrong; README Public Surface bullet missing. | **Fixed**: all five surfaces. |
| 4 | MEDIUM | Claude | Test-plan rows unimplemented (interval-drift details, extra-handler/validator details, extra-system details asserted, before-stepping assertion) — the changelog overclaimed "every strict mismatch class". | **Fixed**: five fixtures added (incl. the HIGH's regression); the before-stepping test proves zero handler invocations when the mismatch fires. |
| 5 | LOW | Claude | "22 new tests" miscounted (18); stability fixture couldn't catch the regression it named (resolved order == registration order); guide stated the mid-recording limitation in one direction only (scenario manifests are end-of-run). | **Fixed**: counts corrected (now 23 after the added fixtures); cross-phase `omega` fixture pins registration-vs-resolved order; guide sentence qualified. |
| 6 | NIT | Claude | Stray double blank line; adapter clone asymmetry (subsumed by finding 2). | Fixed / subsumed. |

## Disposition

One real comparator HIGH — found by Codex probing exactly the duplicate-name edge the design called out as legal — plus isolation and doc findings, all fixed inline with failing-first regressions. Gates green (1138 passed + 2 todo, benchmark gate included). Iteration 2 verifies the fixes.
