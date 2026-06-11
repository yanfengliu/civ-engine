# registration-manifest — design review iteration 1

**Artifact:** DESIGN.md v1 (piped as text). **Reviewers:** Codex `gpt-5.5` xhigh (file tools), Gemini `gemini-3.1-pro-preview` plan-mode, Claude `claude-fable-5[1m]` max (file tools).

## Verdicts

- **Gemini:** approved 5 of 6 questions; 1 implementation requirement (selfCheck bypass) + 1 resolved open question (corpus strips unknown fields) + 1 plumbing note (ScenarioResult must carry the manifest).
- **Codex:** NOT APPROVED — 5 findings (selfCheck bypass + per-construction verification; corpus stripping; scenario plumbing; details typing/ordered lists; destroyCallbackCount). Approved: capture-at-connect, error taxonomy, viewer path split, escape hatch (with viewer plumbing condition), old-bundle compatibility.
- **Claude:** conditional — **1 HIGH** (comparison semantics ignore `applySnapshot` healing: missing components/options/resources self-heal so those checks are dead; resource/component "extras" fire as false positives on mid-recording registration; memoized once-per-replayer makes the verdict call-order-dependent) + selfCheck gap (convergent), corpus field (convergent), viewer flag plumbing, detail-shape fixes, destroyCallbackCount + positionKey, `ResourceStore` key-accessor prerequisite. Verified the full capture/pass-through chain (both sinks spread-copy metadata; fork bundles inherit free via the fork's own recorder; equivalence normalizers already exclude metadata per ADR 7).

## Findings → v2 dispositions (all adopted)

| # | Sev | Reviewer(s) | Finding | v2 treatment |
|---|-----|-------------|---------|--------------|
| 1 | HIGH | Claude | Snapshot-healed categories (components/options/resources) must not be compared strictly — dead checks, false positives, call-order-dependent verdicts. | §1 split: capture all, compare systems/handlers/validators/destroyCallbackCount/positionKey strictly; components extras-only vs manifest ∪ snapshot keys; resources capture-only. Test plan rows corrected (heal verified clean). |
| 2 | MEDIUM | all three (convergent) | `selfCheck` calls `worldFactory` directly, bypassing `openAt`; "memoized once" also too weak for snapshot-dependent factories. | §5: shared `_constructReplayWorld` wrapper at the only two factory call sites; verification per construction, unmemoized. |
| 3 | MEDIUM | Codex + Gemini + Claude (convergent) | Corpus `validateMetadata` silently strips unknown metadata fields → index loses `registration`. | §6: explicit light-shape pass-through. |
| 4 | MEDIUM | Codex + Gemini (convergent) | `runScenario` cannot "populate options" for a later caller. | §4: `ScenarioResult.registration` captured in `captureScenarioState`; adapter copies with option override. |
| 5 | MEDIUM | Claude | `skipRegistrationCheck` unreachable from `BundleViewer` (ADR 35 forbids BYO replayers). | §5: `BundleViewerOptions` gains + forwards the flag. |
| 6 | LOW | Codex + Claude | Details shape: `JsonValue`-safe typing; ordered system-name arrays instead of `reorderedSystems: boolean` (duplicates stay positional); prune fields finding 1 made dead; message names the escape hatch. | §5 details shape rewritten. |
| 7 | LOW | Codex + Claude | Manifest completeness: `destroyCallbackCount` (state-evolution-relevant, factory-preserved, count precedent = validators); `positionKey` (factory-preserved, replay-relevant). | §1/§2: count added; positionKey asserted against `snapshot.config.positionKey` (snapshot already carries it). |
| 8 | NOTE | Claude | `ResourceStore` lacks a key-enumeration accessor; bit-assignment rationale for component order was inexact. | §3 prerequisite noted; rationale corrected (informational for components). |

## Disposition

Substantive iteration — the HIGH reshaped the comparison semantics. All prescriptions adopted in DESIGN v2; design-2 confirmation round verifies before PLAN.
