# Git Command Rules
- CRITICAL: You are strictly forbidden from using compound commands with `cd` and `git` (e.g., `cd path && git commit`). This triggers a hardcoded CLI security block that halts automation. 
- You MUST ALWAYS use the `git -C <path> <command>` syntax for all git operations. Make sure to follow this both when you and your subagents are working.

# Documentation Maintenance Rules
- **When you add, remove, or change a public API** (new method on World, new standalone utility, changed function signature), update the relevant documentation:
  - `README.md` — API Reference tables, Feature Overview table, Project Structure
  - `docs/tutorials/getting-started.md` — If the feature is a core concept that new users need
  - `docs/tutorials/building-a-game.md` — If the feature would be used in the tutorial game
- **When you add a new module**, add it to the Project Structure section in README.md and the Component Map in ARCHITECTURE.md.
- **Tutorials must always compile.** If you change an API that tutorial code uses, update the tutorial code to match. Broken tutorials are worse than no tutorials.
- **Keep the API Reference in README.md complete.** Every public method on World and every export from standalone utility modules must appear in the reference tables.
