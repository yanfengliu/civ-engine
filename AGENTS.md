## Core rules

- Use test-driven development for behavior changes: write or update tests first, then make them pass. Test the contract, not the code: tests should focus exclusively on app experience and mechanisms.
- For each desired change, make the change easy, then make the easy change.
- Before implementing a change, write a plan.
- Use a subagent to implement the plan such that the tests pass. For example, if the tech stack uses node, it should make sure `npx vitest run`, `npx tsc --noEmit`, and `npx vite build` pass.
- When the change is visual:
  - Capture a before screenshot.
  - Apply the change.
  - Capture an after screenshot.
  - Generate a pixel diff and use that as verification alongside the normal test/build gates.

## Team of subagents

- For every task from the user, create a stateless, ephemeral team of subgents to work together on tasks, then turn down the agents when you are done to avoid context rot.
- **Team lead**:
  - Responsibility: Breaks the human's request into atomic tasks, selects the appropriate domain specialists, routes the tasks, and acts as the final gatekeeper before merging.
  - If tests (`npx vitest run`, `npx tsc --noEmit`, etc.) fail or review consensus is not reached after 3 iterations, the Team Lead must execute a hard abort. It will `git reset --hard` the branch, dump the error logs and the failed approach into `docs/learning/lessons.md`, and spin up a completely fresh Architect and Engineer to write a brand new plan that explicitly avoids the failed approach.
- **Architect**:
  - Responsibility: Act purely as a consultant rather than an active driver. The Lead queries the Architect to draft the initial implementation plan and verify it against ARCHITECTURE.md before dispatching work.
- **Game designer**:
  - Responsibility: Make sure the game mechanism works well and is fun. Research local and online sources to ground your opinions.
- **Software engineer**:
  - Responsibility: Handle all the code writing.
  - Reach out to the team if you have questions or need a second opinion. 
  - CRITICAL: After you are done coding, ask the code reviewer to review your code. Iterate with the code reviewer. Reviews might take a long time. Be patient.
  - After addressing review comments, ask the reviewer to verify that you have successfully done so.
  - If the Software Engineer and the Code Reviewer cannot reach consensus after 3 iterations, escalate to the Tie-Breaker agent.
  - Write down the reviewer feedback from previous round(s) under `code_review/` as temp files. The reviewer should consider this info + `docs/learning/lessons.md` + your diff. After you summarize reviewer feedback into devlog, delete the temp files.
  - Continue this iteration loop until the reviewers seem to start nit-picking instead of catching real bugs / giving substantial feedback. Do not get stuck in an infinite loop.
- **Code reviewer**: Follow the code review section for detailed rules.
- **Tie breaker**: Use the high-reasoning model. Its prompt dictates that it must definitively choose to either ACCEPT the current diff (overriding the reviewer) or REJECT it with a mandatory, prescriptive patch. The Tie-Breaker's decision is final.

## Code review

- Use all of Codex / Gemini / Claude in CLI to independently review every change on the following aspects:
  1. Design.
    - Can easily scale, generalize, debug, be understood and reasoned about, and stay lean.
  2. Test coverage.
  3. Correctness.
  4. Clean code, typing, efficiency, memory leaks.
    - No: god class, large files, duplicated logic, inconsistent implementations, violation of boundaries.
    - Prefer composition over inheritance.
    - Clean up dead code.
    - Do not change app mechanics or behavior unless explicitly asked.
  5. Documentation.
    - Dev logs should be updated and maintained.
    - References to code should be up to date.
    - No outdated comments.
    - Learnings from debugging and friction points should be documented in `docs/learning/lessons.md`. The file should be actively maintained to not become long, tedious, or outdated.
- `base_prompt` for the code review agent: "You are a senior code reviewer. Flag bugs, security issues, and performance concerns. Do NOT modify files or propose patches. Only return findings, explanations, and suggestions in plain text."
- Optionally, use the @ symbol within `base_prompt` to include directory context for the best reasoning results.
- Codex:
  - `git diff [branch] | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh -c approval_policy=never --sandbox read-only --ephemeral <base_prompt>`
- Gemini:
  - `git diff [branch] | gemini -p <base_prompt> --model gemini-3.1-pro-preview`.
- Claude:
  - `git diff [branch] | claude -p --model opus --effort xhigh --append-system-prompt <base_prompt> --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)"`
- For full-codebase reviews (no diff), drop the `git diff` pipe and let each CLI agentically explore the workspace from its CWD; keep the same model/effort flags.

## Git

- When you iterate, only run affected tests.
- In the end, after you are confident about your change, run the full suite of tests to make sure you didn't accidentally break anything.
- Create a short-lived branch for every task (e.g., `agent/fix-tick-start`). Run the test suite on the branch. Only after all tests and visual pixel-diffs pass, merge into main using a fast-forward merge, and delete the branch.
- Commit durable docs you added if you are not planning to remove them.
- Commit as soon as you have a coherent, self-contained unit of change.

## Project docs

- Read `docs/devlog/summary.md` and `docs/architecture/ARCHITECTURE.md` at session start.
- Key directories:
  - `src`: app code.
  - `docs`: architecture, devlogs, reviews, API, tutorials, reviews.
  - `design`: app and mechanism notes.

## Documentation discipline (mandatory; not optional)

Code changes are not done until the docs match. Before declaring any task complete, run through this checklist for every shipped change. Skipping any item is a regression and will be caught by the next audit.

**Always update on every feature / behavior change:**

- `docs/changelog.md` — new version entry with what shipped, why, validation, and behavior callouts.
- `docs/devlog/summary.md` — one line per task; remove outdated info; compact if > 50 lines.
- `docs/devlog/detailed/<latest>.md` — full per-task entry per the Devlog section above.
- `package.json` — version bump per the Versioning section.

**Always update if the change introduces or removes API surface (new exports, new methods, new types, removed APIs, renamed APIs):**

- `docs/api-reference.md` — every new public type, method, and standalone utility gets its own section. Removed APIs get removed (not just struck through). Stale signatures must be updated.
- `README.md` — Feature Overview table mentions the new capability if it's a user-visible feature; Public Surface bullets list the new top-level export if applicable.
- `docs/README.md` — index links the new guide if one is added.

**Always update if the change is structural (new subsystem, new boundary, changed data flow):**

- `docs/architecture/ARCHITECTURE.md` — Component Map row + Boundaries paragraph for the new subsystem; tick lifecycle ASCII updated if the flow changes.
- `docs/architecture/drift-log.md` — append a row with date + change + reason.
- `docs/architecture/decisions.md` — append a Key Architectural Decision row when the change reflects a non-obvious tradeoff worth recording. Never delete an existing decision; add a newer one that supersedes it.

**Update if applicable to the change's topic:**

- `docs/guides/<topic>.md` — every guide whose subject overlaps the change. A new resource API → `resources.md`. A new system feature → `systems-and-simulation.md`. A new spatial primitive → `spatial-grid.md` / `rts-primitives.md`. A new AI-relevant surface → `ai-integration.md`. A new field-data utility → `map-generation.md`. A new tutorial-grade feature → `building-a-game.md` and `getting-started.md`. The `concepts.md` standalone-utilities list and tick-lifecycle ASCII must reflect new utilities and lifecycle changes.
- Examples and tutorials must use the current API. If a guide demonstrates the deprecated pattern, replace the demo, don't add a "new way" sidebar.

**Verification step (mandatory before declaring task done):**

- Invoke the `doc-review` skill or grep for removed-API names across `docs/` and `README.md`. The audit must come back clean for the change's diff. Stale references in historical changelog / devlog / drift-log entries are intentional context and should remain — every other surface must reflect current reality.
- The multi-CLI code review (Claude / Codex / Gemini) must explicitly verify doc accuracy as part of its review prompt — include "verify docs in the diff match implementation; flag any stale signatures, removed APIs still mentioned, or missing coverage of new APIs in canonical guides."

**Why this is mandatory:** doc drift compounds. A single stale signature in `api-reference.md` becomes the source of truth for the next reader, then for the next feature built on top, then for an external consumer. Every iter-N review on this repo has caught at least one doc-drift issue; treating documentation as part of the change (not after the change) is the only way to keep the surface trustworthy. If a feature is too small to merit a guide update, it is small enough to merit one sentence in the relevant existing guide — silence is not a valid signal.

## Architecture

- Respect the boundaries documented there. If a boundary seems wrong, flag it instead of silently violating it.
- If architecture changes, update the relevant sections in `docs/architecture/ARCHITECTURE.md`, append a row to `docs/architecture/drift-log.md`, and mention the update in the devlog.
- Do not update `docs/architecture/ARCHITECTURE.md` for non-structural fixes, refactors, UI tweaks, or test-only work.
- Never delete a Key Architectural Decision in `docs/architecture/decisions.md`; add a newer decision that supersedes it.

## Devlog

- Detailed devlogs live under `docs/devlog/detailed/` as append-only files named `YYYY-MM-DD_YYYY-MM-DD.md` (e.g. `2026-04-07_2026-04-13.md`).
- Always append new entries to the latest detailed devlog (the file with the most recent `END_DATE`). When looking something up, start from the latest file and work backwards.
- Periodically archive: when the active file grows larger than 500 lines or a significant time boundary is reached, close it (freeze its `END_DATE` in the filename) and start a new file whose `START_DATE` is the next entry's date. Check if the start and end dates of all previous devlogs are still accurate.
- After every completed task, append a detailed entry with:
  - timestamp
  - action
  - code reviewer comments, broken down by AI provider and theme as stated above
  - result
  - reasoning
  - notes
- Keep `docs/devlog/summary.md` current after updating the detailed log. Always remove outdated info. Compact when it grows larger than 50 lines.
- If a subagent handles summary work, it should extract facts only and avoid interpretation.

## Debugging

- When debugging, use `docs/debugging/template.md` to record your process. Create a new file per debugging session and use it to iterate until you solve the problem.
- If a future session makes you realize that your previous debug sessions on the same topic did not fully solve the problem, update past docs to avoid misunderstandings.
- Clean up the temporary files (such as stack dump, test results) created during debugging after you are done.

## Versioning

- Maintain a version number `a.b.c`
  - Only bump `a` when I tell you.
  - Whenever you introduce a breaking change, bump `b` and reset `c`.
  - Whenever you introduce a non-breaking change, bump `c`.
- Keep everything in `docs/` up to date when you introduce changes.
- Maintain an external-facing `docs/changelog.md` that tracks changes between every two versions. Check `docs/devlogs` for more info.