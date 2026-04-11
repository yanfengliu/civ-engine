# Expert Review Remaining Candidates

These items from the expert architecture review are real capabilities, but they are not needed until the engine has workloads that justify their complexity.

## Struct-of-Arrays Components

Introduce typed-array backed numeric components only after metrics show plain object component iteration is the bottleneck. This would add a second component model and should come with benchmarks and migration guidance.

## Dependency Graph Scheduling

The engine now has lightweight phases. A full topological dependency graph and parallel system execution should wait until games have enough systems and ordering constraints that phase ordering becomes insufficient.

## Multiplayer Tick Locking and Rollback

Tick-targeted commands, rollback, prediction, and binary snapshots are valuable for deterministic multiplayer. They should be designed together with a real network protocol and client prediction use case rather than added speculatively.
