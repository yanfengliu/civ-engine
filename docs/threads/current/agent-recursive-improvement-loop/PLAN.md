# Agent Recursive Improvement Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the active recursive-improvement-loop design into a first working cross-repo slice: finish the current `aoe2` work, add shared improvement-loop types/helpers to `civ-engine`, then migrate `aoe2`'s proven visual/conformance adapter to use the shared surface.

**Architecture:** Keep the engine boundary small and additive. `civ-engine` owns shared machine-readable vocabulary and zero-dependency conversion/validation helpers; `aoe2` keeps browser/model/game-specific loop control, command tools, conformance categories, gates, and visual rendering.

**Tech Stack:** TypeScript, Vitest, npm scripts, existing `civ-engine` visual playtest marker bridge, `aoe2`'s `src/game/playtest/visualPlaytestAdapter.ts`.

---

### Task 0: Wrap Current `aoe2` Dirty Visual Unit

**Files:**
- Modify: `C:/Users/38909/Documents/github/aoe2/src/phaser/scenes/gameScene/buildingRoofAccents.ts`
- Modify: `C:/Users/38909/Documents/github/aoe2/tests/phaser/buildingRoofAccents.test.ts`
- Modify: `C:/Users/38909/Documents/github/aoe2/package.json`
- Modify: `C:/Users/38909/Documents/github/aoe2/docs/changelog.md`
- Modify: `C:/Users/38909/Documents/github/aoe2/docs/devlog/summary.md`
- Modify: latest `C:/Users/38909/Documents/github/aoe2/docs/devlog/detailed/*.md`
- Modify: `C:/Users/38909/Documents/github/aoe2/design/spec-final.md`

- [ ] **Step 1: Inspect the dirty diff**

Run: `git -C C:/Users/38909/Documents/github/aoe2 diff -- src/phaser/scenes/gameScene/buildingRoofAccents.ts tests/phaser/buildingRoofAccents.test.ts`

Expected: the only dirty code/test change is Town Center roof post strokes plus a unit test counting `lineBetween` calls.

- [ ] **Step 2: Run the focused existing test**

Run: `npm.cmd test -- tests/phaser/buildingRoofAccents.test.ts`

Expected: PASS. If it fails, fix only the Town Center roof-post test/implementation.

- [ ] **Step 3: Add missing release/spec/devlog surfaces**

Update `aoe2` to treat this as v0.1.125, a user-visible render-only polish slice. The changelog/spec/devlog wording must say the change is visual only and preserves simulation, saves, replays, hit testing, fog memory, and camera math.

- [ ] **Step 4: Run full `aoe2` gates**

Run in `C:/Users/38909/Documents/github/aoe2`: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`.

Expected: all four gates pass.

- [ ] **Step 5: Commit and push the existing `aoe2` queue**

Stage only the dirty visual/docs/version files and commit with `feat(graphics): add town center roof posts`. Then push `main`, which will also publish the ten already-committed local `aoe2` commits ahead of origin.

### Task 1: Add Shared Improvement Types And Helpers To `civ-engine`

**Files:**
- Create: `src/improvement-loop-types.ts`
- Create: `src/improvement-loop.ts`
- Modify: `src/index.ts`
- Modify: `tests/visual-playtest.test.ts` or create `tests/improvement-loop.test.ts`
- Modify: `tests/fixtures/public-surface.json`
- Modify: `README.md`
- Modify: `docs/api-reference.md`
- Modify: `docs/guides/ai-integration.md`
- Modify: `docs/guides/visual-playtest-harness.md`
- Modify: `docs/architecture/ARCHITECTURE.md`
- Modify: `docs/architecture/drift-log.md`
- Modify: `docs/architecture/decisions.md`
- Modify: `docs/changelog.md`
- Modify: `docs/devlog/summary.md`
- Modify: latest `docs/devlog/detailed/*.md`
- Modify: `package.json`

- [ ] **Step 1: Write failing engine tests first**

Add tests that prove:

```ts
const finding: ImprovementFinding = {
  schemaVersion: 1,
  id: 'aoe2-command-card-1',
  title: 'ux-gap - command-card',
  severity: 'medium',
  category: 'usability',
  observed: 'no command to advance past Feudal',
  expected: 'researching Castle Age at the Town Center',
  suggestion: 'implement the age-up command',
  evidence: [{ kind: 'tick', tick: 250 }],
  verificationStatus: 'unverified',
  nextAction: 'proposalOnly',
  data: { aoe2FindingCategory: 'ux-gap' },
};

expect(improvementFindingToVisualPlaytestFinding(finding)).toMatchObject({
  title: 'ux-gap - command-card',
  severity: 'medium',
  category: 'usability',
  evidence: { tick: 250 },
});
```

Also test that `improvementFindingToMarker(finding)` embeds both `data.improvementLoop` and the existing `data.visualPlaytest` payload, and that `improvementFindingsFromMarkers` ignores unrelated markers while recovering valid findings.

- [ ] **Step 2: Run the focused tests to verify RED**

Run: `npx.cmd vitest run tests/improvement-loop.test.ts tests/visual-playtest.test.ts`

Expected: FAIL because the shared improvement-loop module does not exist yet.

- [ ] **Step 3: Implement the minimal shared surface**

Add `ImprovementFinding`, `ImprovementEvidenceRef`, `ImprovementRunManifest`, `ImprovementDisposition`, `ImprovementVerificationStatus`, `ImprovementNextAction`, `improvementFindingToVisualPlaytestFinding`, `improvementFindingToMarker`, `improvementFindingsFromMarkers`, and `assertImprovementFinding`. Keep helpers zero-dependency and avoid owning browser/provider/game logic.

- [ ] **Step 4: Run the focused tests to verify GREEN**

Run: `npx.cmd vitest run tests/improvement-loop.test.ts tests/visual-playtest.test.ts`

Expected: PASS.

- [ ] **Step 5: Update public surface and docs**

Bump `civ-engine` minor version because this is additive public API. Update README, API reference, AI Integration, visual harness guide, architecture component map/boundary, drift log, ADR, changelog, and devlog. Update the public-surface fixture to pin the new exports.

- [ ] **Step 6: Run full `civ-engine` gates**

Run: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`.

Expected: all four gates pass.

- [ ] **Step 7: Commit and push `civ-engine`**

Commit with `feat: add improvement loop finding contracts`, then push `main`.

### Task 2: Migrate `aoe2` Adapter Onto The Shared Engine Helpers

**Files:**
- Modify: `C:/Users/38909/Documents/github/aoe2/src/game/playtest/visualPlaytestAdapter.ts`
- Modify: `C:/Users/38909/Documents/github/aoe2/tests/playtest/findingsToMarkers.test.ts`
- Modify: `C:/Users/38909/Documents/github/aoe2/docs/devlog/summary.md`
- Modify: latest `C:/Users/38909/Documents/github/aoe2/docs/devlog/detailed/*.md`
- Modify if package version changed through file dependency resolution: `C:/Users/38909/Documents/github/aoe2/package-lock.json`

- [ ] **Step 1: Write the failing adapter expectation**

Extend `findingsToMarkers.test.ts` so the existing marker expectation also asserts a shared `data.improvementLoop` payload with `schemaVersion: 1`, `verificationStatus: 'unverified'`, `nextAction: 'proposalOnly'`, and an evidence ref for tick 250.

- [ ] **Step 2: Run focused test to verify RED**

Run: `npm.cmd test -- tests/playtest/findingsToMarkers.test.ts`

Expected: FAIL because `aoe2` still only embeds `data.visualPlaytest`.

- [ ] **Step 3: Use the shared helpers**

Update `visualPlaytestAdapter.ts` so `ConformanceFinding` becomes an engine `ImprovementFinding`, then call the new engine helper to derive the marker payload / visual finding. Preserve the existing aoe2 marker schema fields (`author`, `category`, deterministic marker ids, severity mapping, text, anchor tick) so replay UI and `isAoeMarkerData` keep passing.

- [ ] **Step 4: Run focused test to verify GREEN**

Run: `npm.cmd test -- tests/playtest/findingsToMarkers.test.ts`

Expected: PASS.

- [ ] **Step 5: Update docs/devlog**

Record that `aoe2` now consumes the shared `civ-engine` improvement finding helper while keeping its local LLM runner, command tools, browser/provider code, and game-specific conformance taxonomy.

- [ ] **Step 6: Run full `aoe2` gates**

Run: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`.

Expected: all four gates pass.

- [ ] **Step 7: Commit and push `aoe2`**

Commit with `test(playtest): use shared improvement finding payloads`, then push `main`.

### Task 3: Final Cross-Repo Verification

**Files:**
- Read-only verification over both repos.

- [ ] **Step 1: Verify both repos are clean and synced**

Run:

```powershell
git -C C:/Users/38909/Documents/github/civ-engine status --short --branch
git -C C:/Users/38909/Documents/github/aoe2 status --short --branch
```

Expected: both repos report `main...origin/main` with no dirty files.

- [ ] **Step 2: Verify the live cross-repo use**

Run:

```powershell
rg -n "ImprovementFinding|improvementFindingToMarker|improvementLoop" C:/Users/38909/Documents/github/civ-engine/src C:/Users/38909/Documents/github/aoe2/src C:/Users/38909/Documents/github/aoe2/tests
```

Expected: engine exports define the shared surface, and `aoe2` imports/uses it in `visualPlaytestAdapter.ts` with tests pinning the marker payload.
