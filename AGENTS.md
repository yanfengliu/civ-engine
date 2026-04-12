## Command Execution Rules

- **NEVER use compound shell commands.** Do not use `&&`, `|`, or `;` to chain commands together in a single Bash execution.
- If you need to run multiple commands (e.g., compiling then testing), execute them as separate, sequential tool calls.
- Do not use command substitution $(...) because it prompts for my permission and interrupts your flow.

# Git Command Rules
- CRITICAL: You are strictly forbidden from using compound commands with `cd` and `git` (e.g., `cd path && git commit`). This triggers a hardcoded CLI security block that halts automation. 
- You MUST ALWAYS use the `git -C <path> <command>` syntax for all git operations. Make sure to follow this both when you and your subagents are working.

# Documentation Maintenance Rules
- **When you add, remove, or change a public API** (new method on World, new standalone utility, changed function signature), update the relevant documentation:
  - `README.md` — API Reference tables, Feature Overview table, Project Structure
  - `docs/tutorials/`
  - `docs/guides/`
- **When you add a new module**, add it to the Project Structure section in README.md and the Component Map in ARCHITECTURE.md.
- **Tutorials must always compile.** If you change an API that tutorial code uses, update the tutorial code to match. Broken tutorials are worse than no tutorials.
- **Keep the API Reference in README.md complete.** Every public method on World and every export from standalone utility modules must appear in the reference tables.
- If you introduced any breaking change, increment the release version. Keep track of what is different since last release version in `docs/changelog.md`.
- If there are unfinished action items from `docs/reviews/todo`, do them, mark the doc as DONE, then move it to `docs/reviews/done`.