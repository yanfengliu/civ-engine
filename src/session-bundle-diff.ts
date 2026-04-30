// Spec 5 / Steps 8-10b — diffBundles standalone utility.
// See docs/threads/done/counterfactual-replay/DESIGN.md (v4) §4 + §4.3.
//
// Walks the union of two bundles' tick ranges and produces per-tick deltas
// (commands, events, state) plus separate metadata/markers/attachments
// deltas (excluded from `equivalent` per ADR 7).

import type {
  AttachmentDescriptor,
  Marker,
  RecordedCommand,
  SessionBundle,
} from './session-bundle.js';
import type { TickDiff } from './diff.js';
import type { CommandSequenceMap } from './session-fork.js';
import { applyTickDiff } from './apply-tick-diff.js';
import { diffSnapshots } from './snapshot-diff.js';
import type { WorldSnapshot } from './serializer.js';
import {
  commandsEquivalent,
  eventsEquivalent,
  deepStructuralEqual,
} from './session-bundle-equivalence.js';

export interface DiffBundlesOptions {
  /** Optional CommandSequenceMap from a Divergence. With map, alignment at
   *  `targetTick` uses originalSequence → assignedSequence; the call is
   *  asymmetric (a MUST be source, b MUST be fork). Without map, alignment
   *  is per-tick submission-order index everywhere; the call is symmetric. */
  readonly commandSequenceMap?: CommandSequenceMap;
}

export interface BundleTickDelta<TEventMap, TCommandMap> {
  readonly commands: {
    readonly sourceOnly: ReadonlyArray<RecordedCommand<TCommandMap>>;
    readonly forkOnly: ReadonlyArray<RecordedCommand<TCommandMap>>;
    readonly changed: ReadonlyArray<{ a: RecordedCommand<TCommandMap>; b: RecordedCommand<TCommandMap> }>;
  };
  readonly events: {
    readonly sourceOnly: ReadonlyArray<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>;
    readonly forkOnly: ReadonlyArray<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>;
    readonly changed: ReadonlyArray<{
      a: { type: keyof TEventMap; data: TEventMap[keyof TEventMap] };
      b: { type: keyof TEventMap; data: TEventMap[keyof TEventMap] };
    }>;
  };
  /** State divergence at this tick: TickDiff between the source's hydrated
   *  state and the fork's hydrated state. Empty subfields = no divergence. */
  readonly stateDiff: TickDiff;
}

export interface BundleDiff<TEventMap, TCommandMap> {
  readonly firstDivergentTick: number | null;
  readonly equivalent: boolean;
  readonly perTickDeltas: ReadonlyMap<number, BundleTickDelta<TEventMap, TCommandMap>>;
  readonly metadataDeltas: ReadonlyArray<{ field: string; a: unknown; b: unknown }>;
  readonly markersDeltas: {
    readonly aOnly: ReadonlyArray<Marker>;
    readonly bOnly: ReadonlyArray<Marker>;
    readonly changed: ReadonlyArray<{ a: Marker; b: Marker }>;
  };
  readonly attachmentsDeltas: {
    readonly aOnly: ReadonlyArray<AttachmentDescriptor>;
    readonly bOnly: ReadonlyArray<AttachmentDescriptor>;
    readonly changed: ReadonlyArray<{ a: AttachmentDescriptor; b: AttachmentDescriptor }>;
  };
}

export function diffBundles<TEventMap, TCommandMap>(
  a: SessionBundle<TEventMap, TCommandMap>,
  b: SessionBundle<TEventMap, TCommandMap>,
  options?: DiffBundlesOptions,
): BundleDiff<TEventMap, TCommandMap> {
  const commandSequenceMap = options?.commandSequenceMap;

  // Tick range = union of submission-tick ranges.
  const aFromSubmission = a.metadata.startTick;
  const aToSubmission = a.metadata.persistedEndTick - 1;
  const bFromSubmission = b.metadata.startTick;
  const bToSubmission = b.metadata.persistedEndTick - 1;
  const fromSubmission = Math.min(aFromSubmission, bFromSubmission);
  const toSubmission = Math.max(aToSubmission, bToSubmission);

  // Optional targetTick (the tick where commandSequenceMap aligns commands).
  // If a map is provided, derive targetTick from any of its entries — they all
  // share the same tick value per DESIGN §4.
  let targetTick: number | null = null;
  if (commandSequenceMap !== undefined) {
    const allEntries = [
      ...commandSequenceMap.preserved,
      ...commandSequenceMap.replaced,
      ...commandSequenceMap.inserted,
      ...commandSequenceMap.dropped,
    ];
    if (allEntries.length > 0) targetTick = allEntries[0].tick;
  }

  // Group commands by submissionTick on each side.
  const aCmdsByTick = groupCommandsBySubmissionTick(a.commands);
  const bCmdsByTick = groupCommandsBySubmissionTick(b.commands);

  // Per-tick delta accumulator.
  const perTickDeltas = new Map<number, MutableTickDelta<TEventMap, TCommandMap>>();
  function ensure(tick: number): MutableTickDelta<TEventMap, TCommandMap> {
    let d = perTickDeltas.get(tick);
    if (d === undefined) {
      d = {
        commands: { sourceOnly: [], forkOnly: [], changed: [] },
        events: { sourceOnly: [], forkOnly: [], changed: [] },
        stateDiff: emptyTickDiff(tick),
      };
      perTickDeltas.set(tick, d);
    }
    return d;
  }

  // ---- Per-tick command alignment ----
  for (let t = fromSubmission; t <= toSubmission; t++) {
    const aList = aCmdsByTick.get(t) ?? [];
    const bList = bCmdsByTick.get(t) ?? [];

    if (commandSequenceMap !== undefined && t === targetTick) {
      alignByCommandSequenceMap(aList, bList, commandSequenceMap, ensure(t).commands);
    } else {
      alignByPerTickIndex(aList, bList, ensure(t).commands);
    }
  }

  // ---- Per-tick event alignment (always per-index) ----
  type SrcTick = SessionBundle<TEventMap, TCommandMap>['ticks'][number];
  const aTicksByEntryTick = new Map<number, SrcTick>();
  for (const te of a.ticks) aTicksByEntryTick.set(te.tick, te);
  const bTicksByEntryTick = new Map<number, SrcTick>();
  for (const te of b.ticks) bTicksByEntryTick.set(te.tick, te);
  for (let t = fromSubmission; t <= toSubmission; t++) {
    const entryTick = t + 1;
    const aTe = aTicksByEntryTick.get(entryTick);
    const bTe = bTicksByEntryTick.get(entryTick);
    const aEvents = aTe?.events ?? [];
    const bEvents = bTe?.events ?? [];
    const len = Math.min(aEvents.length, bEvents.length);
    const evDelta = ensure(t).events;
    for (let i = 0; i < len; i++) {
      if (!eventsEquivalent(aEvents[i], bEvents[i])) {
        evDelta.changed.push({ a: aEvents[i], b: bEvents[i] });
      }
    }
    if (aEvents.length > bEvents.length) {
      for (let i = len; i < aEvents.length; i++) evDelta.sourceOnly.push(aEvents[i]);
    } else if (bEvents.length > aEvents.length) {
      for (let i = len; i < bEvents.length; i++) evDelta.forkOnly.push(bEvents[i]);
    }
  }

  // ---- State-diff fold (lockstep walk over the OVERLAP range only) ----
  // Per ADR 7, state divergence is meaningful only over the overlap where
  // both bundles have hydratable state. Outside the overlap, hydrateAtTick
  // would return a proxy (the bundle's initialSnapshot or a stale snapshot
  // for a tick the bundle doesn't cover), producing misleading deltas.
  const overlapStart = Math.max(aFromSubmission, bFromSubmission);
  const overlapEnd = Math.min(aToSubmission, bToSubmission);
  if (overlapStart <= overlapEnd) {
    let aRunning = hydrateAtTick(a, overlapStart);
    let bRunning = hydrateAtTick(b, overlapStart);
    for (let entryTick = overlapStart + 1; entryTick <= overlapEnd + 1; entryTick++) {
      const aTe = aTicksByEntryTick.get(entryTick);
      const bTe = bTicksByEntryTick.get(entryTick);
      if (aTe !== undefined) aRunning = applyTickDiff(aRunning, aTe.diff);
      if (bTe !== undefined) bRunning = applyTickDiff(bRunning, bTe.diff);
      const submissionTick = entryTick - 1;
      const stateDiff = diffSnapshots(aRunning, bRunning, { tick: entryTick });
      if (stateDiffNonEmpty(stateDiff)) {
        ensure(submissionTick).stateDiff = stateDiff;
      }
    }
  }

  // ---- Drop empty entries; compute firstDivergentTick + equivalent ----
  const finalDeltas = new Map<number, BundleTickDelta<TEventMap, TCommandMap>>();
  for (const [t, d] of perTickDeltas) {
    if (tickDeltaNonEmpty(d)) finalDeltas.set(t, d);
  }
  let firstDivergentTick: number | null = null;
  if (finalDeltas.size > 0) {
    let min = Infinity;
    for (const k of finalDeltas.keys()) if (k < min) min = k;
    firstDivergentTick = min;
  }

  // ---- Metadata deltas (separate from equivalent) ----
  const metadataDeltas = computeMetadataDeltas(a.metadata, b.metadata);

  // ---- Markers / attachments deltas (also separate from equivalent) ----
  const markersDeltas = diffById(
    (a.markers ?? []) as ReadonlyArray<Marker>,
    (b.markers ?? []) as ReadonlyArray<Marker>,
  );
  const attachmentsDeltas = diffById(
    (a.attachments ?? []) as ReadonlyArray<AttachmentDescriptor>,
    (b.attachments ?? []) as ReadonlyArray<AttachmentDescriptor>,
  );

  return {
    firstDivergentTick,
    equivalent: firstDivergentTick === null,
    perTickDeltas: finalDeltas,
    metadataDeltas,
    markersDeltas,
    attachmentsDeltas,
  };
}

// ---- Helpers ----

interface MutableTickDelta<TEventMap, TCommandMap> {
  commands: {
    sourceOnly: RecordedCommand<TCommandMap>[];
    forkOnly: RecordedCommand<TCommandMap>[];
    changed: Array<{ a: RecordedCommand<TCommandMap>; b: RecordedCommand<TCommandMap> }>;
  };
  events: {
    sourceOnly: Array<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>;
    forkOnly: Array<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>;
    changed: Array<{
      a: { type: keyof TEventMap; data: TEventMap[keyof TEventMap] };
      b: { type: keyof TEventMap; data: TEventMap[keyof TEventMap] };
    }>;
  };
  stateDiff: TickDiff;
}

function emptyTickDiff(tick: number): TickDiff {
  return {
    tick,
    entities: { created: [], destroyed: [] },
    components: {},
    resources: {},
    state: { set: {}, removed: [] },
    tags: [],
    metadata: [],
  };
}

function groupCommandsBySubmissionTick<TCommandMap>(
  cmds: ReadonlyArray<RecordedCommand<TCommandMap>>,
): Map<number, RecordedCommand<TCommandMap>[]> {
  const out = new Map<number, RecordedCommand<TCommandMap>[]>();
  for (const rc of cmds) {
    const list = out.get(rc.submissionTick) ?? [];
    list.push(rc);
    out.set(rc.submissionTick, list);
  }
  return out;
}

function alignByCommandSequenceMap<TCommandMap>(
  aList: ReadonlyArray<RecordedCommand<TCommandMap>>,
  bList: ReadonlyArray<RecordedCommand<TCommandMap>>,
  map: CommandSequenceMap,
  delta: MutableTickDelta<unknown, TCommandMap>['commands'],
): void {
  const sortedA = aList.slice().sort((x, y) => x.sequence - y.sequence);
  const sortedB = bList.slice().sort((x, y) => x.sequence - y.sequence);

  const originalToAssigned = new Map<number, number>();
  for (const e of map.replaced) originalToAssigned.set(e.originalSequence, e.assignedSequence);
  for (const e of map.preserved) originalToAssigned.set(e.originalSequence, e.assignedSequence);
  const droppedSet = new Set(map.dropped.map((e) => e.originalSequence));
  const insertedSet = new Set(map.inserted.map((e) => e.assignedSequence));

  const bBySeq = new Map<number, RecordedCommand<TCommandMap>>();
  for (const fc of sortedB) bBySeq.set(fc.sequence, fc);

  for (const sc of sortedA) {
    if (droppedSet.has(sc.sequence)) {
      delta.sourceOnly.push(sc);
      continue;
    }
    const assignedSeq = originalToAssigned.get(sc.sequence);
    if (assignedSeq === undefined) {
      delta.sourceOnly.push(sc);
      continue;
    }
    const fc = bBySeq.get(assignedSeq);
    if (fc === undefined) {
      delta.sourceOnly.push(sc);
      continue;
    }
    // Replaced and preserved both: count as changed iff structurally
    // different. An identity replace (replacement payload identical to the
    // original + same accept/reject result) is not a divergence.
    if (!commandsEquivalent(sc, fc)) {
      delta.changed.push({ a: sc, b: fc });
    }
  }
  for (const fc of sortedB) {
    if (insertedSet.has(fc.sequence)) {
      delta.forkOnly.push(fc);
    }
  }
}

function alignByPerTickIndex<TCommandMap>(
  aList: ReadonlyArray<RecordedCommand<TCommandMap>>,
  bList: ReadonlyArray<RecordedCommand<TCommandMap>>,
  delta: MutableTickDelta<unknown, TCommandMap>['commands'],
): void {
  const len = Math.min(aList.length, bList.length);
  for (let i = 0; i < len; i++) {
    if (!commandsEquivalent(aList[i], bList[i])) {
      delta.changed.push({ a: aList[i], b: bList[i] });
    }
  }
  if (aList.length > bList.length) {
    for (let i = len; i < aList.length; i++) delta.sourceOnly.push(aList[i]);
  } else if (bList.length > aList.length) {
    for (let i = len; i < bList.length; i++) delta.forkOnly.push(bList[i]);
  }
}


function tickDeltaNonEmpty<TEventMap, TCommandMap>(d: MutableTickDelta<TEventMap, TCommandMap>): boolean {
  return (
    d.commands.sourceOnly.length > 0 ||
    d.commands.forkOnly.length > 0 ||
    d.commands.changed.length > 0 ||
    d.events.sourceOnly.length > 0 ||
    d.events.forkOnly.length > 0 ||
    d.events.changed.length > 0 ||
    stateDiffNonEmpty(d.stateDiff)
  );
}

function stateDiffNonEmpty(d: TickDiff): boolean {
  return (
    d.entities.created.length > 0 ||
    d.entities.destroyed.length > 0 ||
    Object.keys(d.components).length > 0 ||
    Object.keys(d.resources).length > 0 ||
    Object.keys(d.state.set).length > 0 ||
    d.state.removed.length > 0 ||
    d.tags.length > 0 ||
    d.metadata.length > 0
  );
}

/** Hydrate the world's snapshot at the given submission-tick by walking the
 *  bundle's snapshots[] (closest preceding snapshot wins) and folding any
 *  TickDiffs from that snapshot up to (entryTick === submissionTick + 1). */
function hydrateAtTick<TEventMap, TCommandMap>(
  bundle: SessionBundle<TEventMap, TCommandMap>,
  submissionTick: number,
): WorldSnapshot {
  // entryTick = submissionTick + 1 corresponds to the SessionTickEntry produced
  // by stepping submission-tick `submissionTick`. Hydrate to the world state
  // BEFORE that step (= state after stepping submissionTick - 1).
  // For submissionTick = startTick, hydrate to initialSnapshot (which is at
  // metadata.startTick).
  const allSnapshots = [
    { tick: bundle.metadata.startTick, snapshot: bundle.initialSnapshot },
    ...bundle.snapshots,
  ];
  let best = allSnapshots[0];
  for (const s of allSnapshots) {
    if (s.tick <= submissionTick && s.tick > best.tick) best = s;
  }
  let running = best.snapshot;
  // Fold TickDiffs from best.tick up to submissionTick.
  // SessionTickEntry.tick = T+1 represents the diff produced by stepping T.
  // To get state-at-submissionTick, we need to apply diffs whose
  // entry.tick is in (best.tick, submissionTick + 1]? Wait — we want state
  // BEFORE stepping submissionTick. That is state-after-stepping-(submissionTick-1).
  // SessionTickEntry.tick = submissionTick is produced by stepping submissionTick-1.
  // So we want all entries with entryTick in (best.tick, submissionTick] inclusive.
  for (const te of bundle.ticks) {
    if (te.tick > best.tick && te.tick <= submissionTick) {
      running = applyTickDiff(running, te.diff);
    }
  }
  return running;
}


function computeMetadataDeltas(
  a: SessionBundle['metadata'],
  b: SessionBundle['metadata'],
): Array<{ field: string; a: unknown; b: unknown }> {
  const deltas: Array<{ field: string; a: unknown; b: unknown }> = [];
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of allKeys) {
    const av = (a as unknown as Record<string, unknown>)[k];
    const bv = (b as unknown as Record<string, unknown>)[k];
    if (!deepStructuralEqual(av, bv)) {
      deltas.push({ field: k, a: av, b: bv });
    }
  }
  return deltas;
}

function diffById<T extends { id: string }>(
  aList: ReadonlyArray<T>,
  bList: ReadonlyArray<T>,
): {
  aOnly: T[];
  bOnly: T[];
  changed: Array<{ a: T; b: T }>;
} {
  const aById = new Map<string, T>();
  for (const m of aList) aById.set(m.id, m);
  const bById = new Map<string, T>();
  for (const m of bList) bById.set(m.id, m);
  const aOnly: T[] = [];
  const bOnly: T[] = [];
  const changed: Array<{ a: T; b: T }> = [];
  for (const [id, av] of aById) {
    const bv = bById.get(id);
    if (bv === undefined) aOnly.push(av);
    else if (!deepStructuralEqual(av, bv)) changed.push({ a: av, b: bv });
  }
  for (const [id, bv] of bById) {
    if (!aById.has(id)) bOnly.push(bv);
  }
  return { aOnly, bOnly, changed };
}
