# AI-First Game Development Roadmap

**Status:** Living document. Updated whenever a spec lands or scope shifts.

**Vision:** civ-engine should support an environment where AI agents do as much game-development work as possible without human intervention — generating, exercising, debugging, and verifying game logic autonomously, with humans involved only for design intent and judgment calls. This document captures the multi-spec roadmap that delivers that environment.

A single recording-and-replay spec is the substrate. The full vision spans nine specs across three tiers; specs are tracked individually under `docs/design/<date>-<topic>-design.md`.

## Tier 1 — Foundational

Without these, "AI-first" is aspirational. They are the irreducible substrate for autonomous feedback loops.

### Spec 1: Session Recording & Replay (engine primitives)

Status: **Drafted 2026-04-26.** See `2026-04-26-session-recording-and-replay-design.md`.

What it delivers: deterministic capture of any World run as a portable `SessionBundle`; replay engine that opens a paused World at any tick; marker API for human and programmatic annotations; sink interface for memory and disk persistence; unification with `ScenarioRunner` so test runs and live captures share the same bundle format and replayer.

What it unlocks: every other spec in this roadmap.

### Spec 3: Synthetic Playtest Harness

Status: **Proposed.**

What it delivers: a harness that constructs a `World`, attaches a `SessionRecorder`, drives `world.submit()` from a pluggable policy (random / scripted / LLM-driven / heuristic agents), runs for N ticks, and saves the bundle. Trivially parallelizable across cores or machines. Produces a corpus of bundles per commit.

What it unlocks: the actual feedback loop. Without synthetic playtest, recording just makes human bug reports nicer; with it, every commit gets autonomous exploration. Agents review the corpus and self-file regressions before any human plays the game.

Why it depends on Spec 1: synthetic playtest is just "policy → submit() → SessionBundle"; without recording there is no artifact to analyze.

### Spec 8: Behavioral Metrics over Corpus

Status: **Proposed.**

What it delivers: a metrics layer that ingests bundles from the synthetic playtest corpus, computes design-relevant statistics (median session length, decision points per minute, resource Gini, time-to-first-conflict, dominant strategy distribution, etc.), and tracks these across commits. Regression detection: "the median session length dropped 30% after this commit" gets surfaced automatically.

What it unlocks: a meaningful definition of "regression" for emergent behavior, which unit tests can't capture. Designers and agents share a common quantitative vocabulary for "is the game still doing what we want."

### Scenario library (continuous, no spec)

The convention that every annotated bug bundle gets promoted to a permanent regression scenario. Implemented incrementally as part of Specs 1, 3, and 4. The library compounds: it becomes the project's institutional memory of "what's known to be hard."

## Tier 2 — Multipliers

Tier 1 makes AI-first possible. Tier 2 makes it powerful.

### Spec 9: AI Playtester Agent

Status: **Proposed.**

What it delivers: a separate LLM-driven agent that plays the game (via the same `submit()` boundary), then writes natural-language qualitative feedback ("I found myself doing X repetitively in the early game; the second hour felt aimless"). Distinct from coding agents — its job is to *play and report*, not to edit code.

What it unlocks: the closest approximation to "is it fun?" that doesn't require a human. Combined with Spec 8's quantitative metrics, the design loop closes.

Why it depends on Spec 3: the playtester is just a specific class of policy plugged into the synthetic harness, plus an LLM-driven post-run report.

### Spec 7: Bundle Search / Corpus Index

Status: **Proposed.**

What it delivers: an index over the bundle corpus with structured query: "show me all sessions where pathfinding flagged stuck units in the first 1000 ticks," "find sessions with high decision-point variance," "find sessions where the player's resource balance crashed below threshold X." Bundle metadata is indexed; bundle content is queryable on demand via the replayer.

What it unlocks: the corpus stops being a folder of files and becomes a query surface for both agents and humans.

Why it depends on Specs 3 and 4: the corpus needs to exist (3) and be navigable (4) before indexing it earns its keep.

### Anomaly detection over the corpus (continuous, no spec)

A continuous capability that surfaces statistical outliers in tick timing, state divergences, surprise event sequences, etc. Implemented incrementally on top of Specs 7 and 8. The agent surfaces these and investigates without prompting.

## Tier 3 — Productivity Tooling

Tier 3 is leverage on top of an already-working autonomous loop. Defer until Tier 1 and 2 are mature.

### Spec 4: Standalone Bundle Viewer

Status: **Proposed.**

What it delivers: a separate package (in this repo, sibling to engine sources) that loads bundles, scrubs a timeline, jumps to markers, diffs state between any two ticks, and replays into a paused World. Includes a programmatic agent-driver API: `bundle.atMarker(id).state(...).events(...).diffSince(...)`. UI optional in v1; CLI / library is sufficient.

What it unlocks: human productivity. Agents can drive the bundle programmatically without it; humans benefit from the GUI scrubber.

Why it depends on Spec 1: the viewer reads bundles.

### Spec 2: Game-Side Annotation UI

Status: **Proposed.**

What it delivers: in-game hotkey + annotation form + drawing tools (entity selection, region lasso, suggested-path arrow, freehand scribble, screenshot capture). Resolves visual gestures to engine references (entity IDs, world coordinates) at annotation time, attaching the resolved refs to the marker. Free-text and screenshot blob travel as supplementary attachments. Game-specific code per game; this spec defines the conventions.

What it unlocks: rich, structured human bug reports. Player annotations populate the scenario library (Tier 1).

Why it depends on Spec 1: the marker schema is engine-side; the UI just produces markers.

### Spec 5: Counterfactual Replay / Fork

Status: **Proposed.**

What it delivers: `SessionReplayer.forkAt(tick).substitute(commands).run()` — change inputs at tick N, replay forward, observe how the simulation diverges from the original. Two-bundle diff utility for visualizing divergence. Substitution semantics, divergence detection, replay-fork tree.

What it unlocks: the most powerful debugging primitive. "If the player had done X instead of Y, what would have happened?" becomes a single API call.

Why it's deferred: high architectural complexity (input substitution, divergence representation, fork trees), and the agent's main debugging workflow (load, jump to marker, inspect, step) is fully served by Spec 1's `openAt`. Build it when synthetic playtest reveals concrete counterfactual queries the agent wants to issue.

### Spec 6: Engine Strict-Mode Determinism Enforcement

Status: **Proposed.** Independent of the other specs in this roadmap.

What it delivers: `World({ strict: true })` flag that rejects mutations from outside system phases. All external state changes must go through `submit()`. Includes escape hatches for setup, deserialization, and explicit out-of-tick maintenance. Auditing of all mutation methods to gate on inside-tick state.

What it unlocks: structural enforcement of the determinism contract that Spec 1 only documents. Replays can no longer silently diverge — violations throw at the source.

Why it's deferred: it's a meaty engine-wide behavioral change with its own design problem (escape hatches, migration, false-positive risk for legitimate setup code). Best handled as a focused spec when its costs and benefits can be evaluated standalone. Spec 1's `selfCheck()` provides 80% of the safety with 0% of the engine surgery in the meantime.

## Spec Dependency Graph

```
                       ┌──────────────────────────────────────┐
                       │  Spec 1: Session Recording & Replay  │
                       │           (foundation)               │
                       └─┬────────────┬───────────────┬───────┘
                         │            │               │
                ┌────────┴───┐  ┌─────┴─────┐   ┌─────┴─────────┐
                │ Spec 2:    │  │ Spec 3:   │   │ Spec 4:       │
                │ Annotation │  │ Synthetic │   │ Standalone    │
                │ UI (game)  │  │ Playtest  │   │ Viewer        │
                └────────────┘  └─┬───────┬─┘   └────────────┬──┘
                                  │       │                  │
                          ┌───────┴──┐  ┌─┴────────┐  ┌──────┴───┐
                          │ Spec 8:  │  │ Spec 9:  │  │ Spec 7:  │
                          │ Behav.   │  │ AI Play- │  │ Corpus   │
                          │ Metrics  │  │ tester   │  │ Index    │
                          └──────────┘  └──────────┘  └──────────┘

       (independent, parallelizable)
       ┌──────────────────────────────────────┐
       │  Spec 5: Counterfactual / Fork       │  → depends on Spec 1
       └──────────────────────────────────────┘
       ┌──────────────────────────────────────┐
       │  Spec 6: Strict-Mode Enforcement     │  → independent of all
       └──────────────────────────────────────┘
```

## Suggested Build Order

1. Spec 1 (recording & replay) — substrate for everything.
2. Spec 3 (synthetic playtest) — turns recording from "improve human bug reports" into "infinite autonomous bug discovery." Highest leverage.
3. Spec 8 (behavioral metrics) — pairs with Spec 3 to define regressions for emergent behavior.
4. Spec 2 (game-side annotation UI) — humans plug into the same system; game-specific work that can ship in parallel with Spec 4.
5. Spec 4 (standalone viewer) — productivity multiplier for both agents and humans.
6. Spec 7 (corpus index) — once corpus is large enough that browsing it linearly hurts.
7. Spec 9 (AI playtester) — once Specs 3 and 8 are mature enough to drive qualitative feedback usefully.
8. Spec 5 (counterfactual) — once concrete counterfactual queries emerge from agent workflows.
9. Spec 6 (strict-mode) — independent, can ship at any point. Schedule based on determinism-bug pain.

## Status Tracker

| Spec | Title                                | Status     | File                                                      |
| ---- | ------------------------------------ | ---------- | --------------------------------------------------------- |
| 1    | Session Recording & Replay           | **Implemented** (v0.7.7-pre → v0.7.19) | `2026-04-26-session-recording-and-replay-design.md` (v5)  |
| 2    | Game-Side Annotation UI              | Proposed   | not yet drafted                                           |
| 3    | Synthetic Playtest Harness           | **Implemented** (v0.7.20 + v0.8.0 + v0.8.1) | `2026-04-27-synthetic-playtest-harness-design.md` (v10) + `2026-04-27-synthetic-playtest-implementation-plan.md` (v7) |
| 4    | Standalone Bundle Viewer             | Proposed   | not yet drafted                                           |
| 5    | Counterfactual Replay / Fork         | Proposed   | not yet drafted                                           |
| 6    | Strict-Mode Determinism Enforcement  | Proposed   | not yet drafted                                           |
| 7    | Bundle Search / Corpus Index         | Proposed   | not yet drafted                                           |
| 8    | Behavioral Metrics over Corpus       | **Implemented** (v0.8.2) | `2026-04-27-behavioral-metrics-design.md` (v4) + `2026-04-27-behavioral-metrics-implementation-plan.md` (v4) |
| 9    | AI Playtester Agent                  | Proposed   | not yet drafted                                           |

Update this row as specs are drafted, accepted, implemented, and merged.
