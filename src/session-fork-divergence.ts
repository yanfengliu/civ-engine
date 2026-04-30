// Spec 5 — inline Divergence accumulator (PLAN.md Step 6).
//
// Two-walk implementation: a command-stream walk (groups by submissionTick,
// catches divergence at pre-advance failure ticks where SessionTickEntry was
// never written — commands are recorded BEFORE world.step()), plus a
// SessionTickEntry walk for events. Per-tick counts are keyed by
// submission-tick, matching DESIGN's public Divergence contract.

import type { RecordedCommand, SessionBundle } from './session-bundle.js';
import {
  commandsEquivalent,
  eventsEquivalent,
} from './session-bundle-equivalence.js';
import type {
  CommandSequenceMap,
  Divergence,
  DivergenceCounts,
} from './session-fork.js';

export function computeInlineDivergence<TEventMap, TCommandMap>(
  sourceBundle: SessionBundle<TEventMap, TCommandMap>,
  forkBundle: SessionBundle<TEventMap, TCommandMap>,
  commandSequenceMap: CommandSequenceMap,
  targetTick: number,
  overlapEndExclusive: number,
): Divergence {
  type MutableCounts = {
    commandsSourceOnly: number;
    commandsForkOnly: number;
    commandsChanged: number;
    eventsSourceOnly: number;
    eventsForkOnly: number;
    eventsChanged: number;
  };
  const counts = new Map<number, MutableCounts>();

  function ensure(tick: number): MutableCounts {
    let c = counts.get(tick);
    if (c === undefined) {
      c = {
        commandsSourceOnly: 0,
        commandsForkOnly: 0,
        commandsChanged: 0,
        eventsSourceOnly: 0,
        eventsForkOnly: 0,
        eventsChanged: 0,
      };
      counts.set(tick, c);
    }
    return c;
  }

  // ---- Command-stream walk ----
  const sourceCmdsByTick = new Map<number, RecordedCommand<TCommandMap>[]>();
  for (const rc of sourceBundle.commands) {
    if (rc.submissionTick < targetTick || rc.submissionTick >= overlapEndExclusive) continue;
    const list = sourceCmdsByTick.get(rc.submissionTick) ?? [];
    list.push(rc);
    sourceCmdsByTick.set(rc.submissionTick, list);
  }
  const forkCmdsByTick = new Map<number, RecordedCommand<TCommandMap>[]>();
  for (const rc of forkBundle.commands) {
    if (rc.submissionTick < targetTick || rc.submissionTick >= overlapEndExclusive) continue;
    const list = forkCmdsByTick.get(rc.submissionTick) ?? [];
    list.push(rc);
    forkCmdsByTick.set(rc.submissionTick, list);
  }

  // At targetTick, align via commandSequenceMap.
  {
    const sourceAtTarget = (sourceCmdsByTick.get(targetTick) ?? []).slice().sort(
      (a, b) => a.sequence - b.sequence,
    );
    const forkAtTarget = (forkCmdsByTick.get(targetTick) ?? []).slice().sort(
      (a, b) => a.sequence - b.sequence,
    );

    const originalToAssigned = new Map<number, number>();
    for (const e of commandSequenceMap.replaced) originalToAssigned.set(e.originalSequence, e.assignedSequence);
    for (const e of commandSequenceMap.preserved) originalToAssigned.set(e.originalSequence, e.assignedSequence);
    const droppedSet = new Set<number>(commandSequenceMap.dropped.map((e) => e.originalSequence));
    const insertedAssignedSet = new Set<number>(commandSequenceMap.inserted.map((e) => e.assignedSequence));

    const forkBySeq = new Map<number, RecordedCommand<TCommandMap>>();
    for (const fc of forkAtTarget) forkBySeq.set(fc.sequence, fc);

    for (const sc of sourceAtTarget) {
      if (droppedSet.has(sc.sequence)) {
        ensure(targetTick).commandsSourceOnly += 1;
        continue;
      }
      const assignedSeq = originalToAssigned.get(sc.sequence);
      if (assignedSeq === undefined) {
        ensure(targetTick).commandsSourceOnly += 1;
        continue;
      }
      const fc = forkBySeq.get(assignedSeq);
      if (fc === undefined) {
        ensure(targetTick).commandsSourceOnly += 1;
        continue;
      }
      // Both replaced and preserved: count as changed iff structurally
      // different. Identity replace (same payload + same accept/reject) is
      // not a divergence.
      if (!commandsEquivalent(sc, fc)) {
        ensure(targetTick).commandsChanged += 1;
      }
    }

    for (const fc of forkAtTarget) {
      if (insertedAssignedSet.has(fc.sequence)) {
        ensure(targetTick).commandsForkOnly += 1;
      }
    }
  }

  // For ticks > targetTick, align by per-tick submission-order index.
  for (let t = targetTick + 1; t < overlapEndExclusive; t++) {
    const sourceList = sourceCmdsByTick.get(t) ?? [];
    const forkList = forkCmdsByTick.get(t) ?? [];
    const len = Math.min(sourceList.length, forkList.length);
    for (let i = 0; i < len; i++) {
      if (!commandsEquivalent(sourceList[i], forkList[i])) {
        ensure(t).commandsChanged += 1;
      }
    }
    if (sourceList.length > forkList.length) {
      ensure(t).commandsSourceOnly += sourceList.length - forkList.length;
    } else if (forkList.length > sourceList.length) {
      ensure(t).commandsForkOnly += forkList.length - sourceList.length;
    }
  }

  // ---- SessionTickEntry walk (events) ----
  type SourceTick = SessionBundle<TEventMap, TCommandMap>['ticks'][number];
  const sourceTicksByTick = new Map<number, SourceTick>();
  for (const te of sourceBundle.ticks) sourceTicksByTick.set(te.tick, te);
  const forkTicksByTick = new Map<number, SourceTick>();
  for (const te of forkBundle.ticks) forkTicksByTick.set(te.tick, te);

  for (let t = targetTick; t < overlapEndExclusive; t++) {
    const entryTick = t + 1;
    const sourceTe = sourceTicksByTick.get(entryTick);
    const forkTe = forkTicksByTick.get(entryTick);
    const sourceEvents = sourceTe?.events ?? [];
    const forkEvents = forkTe?.events ?? [];
    const len = Math.min(sourceEvents.length, forkEvents.length);
    for (let i = 0; i < len; i++) {
      if (!eventsEquivalent(sourceEvents[i], forkEvents[i])) {
        ensure(t).eventsChanged += 1;
      }
    }
    if (sourceEvents.length > forkEvents.length) {
      ensure(t).eventsSourceOnly += sourceEvents.length - forkEvents.length;
    } else if (forkEvents.length > sourceEvents.length) {
      ensure(t).eventsForkOnly += forkEvents.length - sourceEvents.length;
    }
  }

  // Drop ticks where every count is zero.
  const finalCounts = new Map<number, DivergenceCounts>();
  for (const [t, c] of counts) {
    const total =
      c.commandsSourceOnly + c.commandsForkOnly + c.commandsChanged +
      c.eventsSourceOnly + c.eventsForkOnly + c.eventsChanged;
    if (total > 0) finalCounts.set(t, c);
  }

  let firstDivergentTick: number | null = null;
  if (finalCounts.size > 0) {
    let min = Infinity;
    for (const k of finalCounts.keys()) if (k < min) min = k;
    firstDivergentTick = min;
  }

  return {
    firstDivergentTick,
    perTickCounts: finalCounts,
    commandSequenceMap,
    equivalent: firstDivergentTick === null,
  };
}
