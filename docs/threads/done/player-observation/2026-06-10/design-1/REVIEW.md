# player-observation — design review iteration 1

**Reviewers:** Codex xhigh, Gemini plan-mode, Claude max (DESIGN v1 piped; Codex/Claude with file tools).

**Verdicts:** Gemini approved all six questions; Codex 3 HIGH + 2 MEDIUM (sections NOT APPROVED as written); Claude approved-architecture + 5 IMPORTANT shape/spec gaps. The stateful observer primitive itself was unanimously endorsed — Claude verified the load-bearing argument in code (`buildDiff` is dirty-set-only, so fog-recede produces no diff entry: stateless filtering fundamentally cannot emit entered-with-full-data).

| # | Sev | Reviewer(s) | Finding | v2 disposition |
|---|-----|-------------|---------|----------------|
| 1 | HIGH | Codex | Bare `EntityId` identity breaks under immediate id recycling (free-list pop; RenderAdapter solved this with `EntityRef` + generation). | All observation shapes use `EntityRef`; prior-visible tracking keyed by ref. |
| 2 | HIGH | Codex + Claude (convergent) | Components-only observation omits the three other entity-keyed surfaces (resources/tags/metadata) — a visible enemy's hp pool is exactly what an honest agent inspects; silence forces cheating. | `ObservedEntity` carries all four surfaces; `updated` mirrors the diff including removals. |
| 3 | HIGH | Codex + Claude (convergent) | The destroyed-vs-fog rule ("destruction cell was visible") is not implementable: the diff carries no final positions of destroyed entities (`ComponentStore.remove` deletes from dirtySet), so same-tick move-then-die mis-attributes. The onDestroy capture alternative was evaluated and REJECTED: registering a destroy callback mutates the registration surface the v0.8.18 manifest verifies — a read-side observer must not alter `destroyCallbackCount`. | Honest respecification: attribution at last OBSERVED position under POST-tick visibility, mis-attribution case documented and pinned by test. |
| 4 | MEDIUM | Codex + Claude | `updated` couldn't express component removals (worldState had `removed`, components didn't). | Per-entry removal channels across surfaces. |
| 5 | MEDIUM | Codex | Lifecycle under-specified: `reset()` absent from the surface; `snapshot()` priming ambiguous; recover()/applySnapshot interactions unstated. | `reset()` on the surface; `snapshot()` documented as priming; recover/applySnapshot detected as gaps → throw → `reset()`. |
| 6 | MEDIUM | Codex (Gemini dissented — approved v1 defaults as ergonomic) | `positionless: 'visible'` + `worldState: 'all'` leak the places games commonly park player/economy/director state. | Lead call: **safe-by-default wins for a primitive whose purpose is not leaking** — defaults flipped to `'hidden'` / `'none'`; guide shows the common relaxation. Dissent recorded. |
| 7 | IMPORTANT | Claude | `snapshot()` with worldState enumeration has no public API to stand on (only `getState(key)` exists). | Engine prerequisite: tiny additive `World.getStateKeys()`. |
| 8 | NOTES | Claude / Gemini | Visibility-sync-before-observe ordering requirement; `getVisibleCells` verified sorted; entity lists sorted by ref id (Set iteration order not relied on); 'fog' naming considered, kept. | All written into v2. |
