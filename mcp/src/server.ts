// civ-engine-mcp server (DESIGN: docs/threads/done/mcp-server/DESIGN.md).
// v1 scope: READ-ONLY recorded-artifact interrogation over one corpus root.
// The server never constructs Worlds, never writes files; every bundle access
// goes through BundleCorpus key lookups (containment is inherent — ids are
// Map lookups over scan-derived keys, never paths). Tool descriptions embed
// the agent guidance the guides teach so the surface is self-navigating.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  bundleHotspots,
  diffSnapshots,
  getErrorCode,
  bundleSummary,
  compareMetricsResults,
  diffBundles,
  runMetrics,
  snapshotAtTick,
} from 'civ-engine';
import type { BundleQuery, Metric, SessionBundle } from 'civ-engine';
import { CorpusState } from './state.js';
import { DEFAULT_LIST_LIMIT, bounded, guarded, mapToObject } from './format.js';
import { METRIC_FACTORIES, entrySummary, frameView, queryFromInput } from './views.js';

export const QUERY_SHAPE = {
  key: z.string().optional().describe('exact bundle key'),
  keyPattern: z.string().optional().describe('regex source matched against bundle keys (JSON cannot carry RegExp); mutually exclusive with key'),
  sessionId: z.string().optional(),
  sourceKind: z.enum(['scenario', 'synthetic', 'session']).optional(),
  sourceLabel: z.string().optional(),
  engineVersion: z.string().optional(),
  nodeVersion: z.string().optional(),
  incomplete: z.boolean().optional(),
  minDurationTicks: z.number().int().optional(),
  maxDurationTicks: z.number().int().optional(),
  minFailedTickCount: z.number().int().optional(),
  maxFailedTickCount: z.number().int().optional(),
  policySeed: z.number().int().optional(),
  recordedAfter: z.string().optional().describe('ISO time lower bound'),
  recordedBefore: z.string().optional().describe('ISO time upper bound'),
  attachmentMime: z.string().optional(),
} as const;

const LIMIT = z.number().int().min(1).max(2000).optional()
  .describe(`max items returned (default ${DEFAULT_LIST_LIMIT}); responses carry total + truncated`);

export function buildServer(corpusRoot: string): McpServer {
  const state = new CorpusState(corpusRoot);
  const server = new McpServer({ name: 'civ-engine-mcp', version: '0.1.0' });

  server.registerTool('corpus_overview', {
    description:
      'Corpus-wide overview: bundle count, tick/time ranges, failure and incomplete tallies, invalid entries (skipped corrupt manifests). Start here, then corpus_query to narrow, bundle_hotspots to triage one bundle.',
  }, async () => guarded(() => {
    const entries = state.current.entries();
    const failures = entries.filter((e) => e.hasFailures);
    const incomplete = entries.filter((e) => e.metadata.incomplete === true);
    return {
      root: corpusRoot,
      bundleCount: entries.length,
      withFailures: failures.length,
      incomplete: incomplete.length,
      recordedAt: {
        // entries() is construction-time sorted by recordedAt.
        earliest: entries[0]?.metadata.recordedAt ?? null,
        latest: entries.at(-1)?.metadata.recordedAt ?? null,
      },
      invalidEntries: state.current.invalidEntries.map((ie) => ({
        path: ie.path, code: ie.error.code, message: ie.error.message,
      })),
    };
  }));

  server.registerTool('corpus_query', {
    description:
      'Filter bundles by manifest metadata (16-field surface; markers are NOT filterable — they live in bundle bodies). Returns entry metadata, not bundle contents.',
    inputSchema: { ...QUERY_SHAPE, limit: LIMIT },
  }, async (input) => guarded(() => {
    const entries = state.current.entries(queryFromInput(input));
    const page = bounded(entries, input.limit);
    return { ...page, items: page.items.map(entrySummary) };
  }));

  server.registerTool('corpus_refresh', {
    description:
      'Re-scan the corpus directory (new instance; flushes viewer caches). Use after recordings land or incomplete bundles finalize.',
  }, async () => guarded(() => {
    const corpus = state.refresh();
    return { bundleCount: corpus.entries().length, invalidEntries: corpus.invalidEntries.length };
  }));

  server.registerTool('bundle_summary', {
    description:
      'JSON-flat summary of one bundle designed for LLM context (ticks, commands, events, failures, markers). The first call to make about any specific bundle.',
    inputSchema: { key: z.string() },
  }, async ({ key }) => guarded(() => bundleSummary(state.loadBundle(key))));

  server.registerTool('bundle_hotspots', {
    description:
      'Triage list for one bundle: tick failures, execution failures, duration outliers, markers — sorted by tick. Then viewer_frame the hot tick.',
    inputSchema: {
      key: z.string(),
      durationStdevThreshold: z.number().optional(),
      includeMarkers: z.boolean().optional(),
      maxDurationOutliers: z.number().int().optional(),
      limit: LIMIT,
    },
  }, async ({ key, limit, ...options }) => guarded(() => {
    const hotspots = bundleHotspots(state.loadBundle(key), options);
    return bounded(hotspots, limit);
  }));

  server.registerTool('bundle_markers', {
    description: 'Markers recorded in one bundle, with refs (entities, cells, tick ranges) and provenance.',
    inputSchema: { key: z.string(), limit: LIMIT },
  }, async ({ key, limit }) => guarded(() => bounded(state.loadBundle(key).markers, limit)));

  server.registerTool('bundle_snapshots', {
    description:
      'Recorded snapshot ticks for one bundle; fetch one (or hydrate an arbitrary in-range tick via pure data folding — no game code). Surfaces the v6 poisoned field: this is the terminal-state inspection path the replay_across_failure error points at.',
    inputSchema: {
      key: z.string(),
      tick: z.number().int().optional()
        .describe('omit to list available snapshot ticks; set to fetch/hydrate state at that submission tick'),
    },
  }, async ({ key, tick }) => guarded(() => {
    const bundle = state.loadBundle(key);
    const upper = bundle.metadata.incomplete
      ? bundle.metadata.persistedEndTick
      : bundle.metadata.endTick;
    if (tick === undefined) {
      return {
        startTick: bundle.metadata.startTick,
        endTick: bundle.metadata.endTick,
        effectiveUpperBound: upper,
        incomplete: bundle.metadata.incomplete ?? false,
        recordedSnapshotTicks: [
          bundle.metadata.startTick,
          ...bundle.snapshots.map((s) => s.tick),
        ],
        failedTicks: bundle.metadata.failedTicks ?? [],
      };
    }
    // A tick matching a RECORDED snapshot returns it verbatim (recorded:
    // true) — this is what makes the poisoned terminal snapshot of a
    // failure-terminated bundle inspectable, which hydration correctly
    // refuses (review M1). Other in-range ticks hydrate (pure data fold).
    if (tick === bundle.metadata.startTick) {
      return { recorded: true, tick, snapshot: bundle.initialSnapshot };
    }
    const recorded = bundle.snapshots.find((sn) => sn.tick === tick);
    if (recorded) return { recorded: true, tick, snapshot: recorded.snapshot };
    return { recorded: false, tick, snapshot: snapshotAtTick(bundle, tick) };
  }));

  server.registerTool('viewer_frame', {
    description:
      "One tick's recorded activity: events, commands, executions, markers, that tick's TickDiff, and any failure at the tick. Set includeState for the full hydrated component state (can be large).",
    inputSchema: { key: z.string(), tick: z.number().int(), includeState: z.boolean().optional() },
  }, async ({ key, tick, includeState }) => guarded(() => frameView(state, key, tick, includeState === true)));

  server.registerTool('viewer_diff', {
    description:
      'Aggregated change set over (fromTick, toTick]: folded TickDiffs when possible, snapshot-hydration comparison otherwise (works without game code). Refuses ranges crossing a recorded failure.',
    inputSchema: { key: z.string(), fromTick: z.number().int(), toTick: z.number().int() },
  }, async ({ key, fromTick, toTick }) => guarded(() => {
    const frame = state.viewer(key).atTick(toTick);
    try {
      return frame.diffSince(fromTick);
    } catch (e) {
      // The fold path bails (e.g. an entity created AND destroyed within the
      // range — the normal case on long ranges) and the viewer's snapshot
      // path needs worldFactory. The 1.1.0 pure-data hydration covers it
      // (DESIGN H1); failure-crossing errors still propagate.
      if (getErrorCode(e) !== 'world_factory_required') throw e;
      const bundle = state.loadBundle(key);
      return {
        fromTick,
        toTick,
        source: 'snapshot' as const,
        diff: diffSnapshots(snapshotAtTick(bundle, fromTick), snapshotAtTick(bundle, toTick)),
      };
    }
  }));

  server.registerTool('bundle_commands', {
    description: 'Recorded commands of one bundle, filterable by tick range and type.',
    inputSchema: {
      key: z.string(),
      fromTick: z.number().int().optional(),
      toTick: z.number().int().optional(),
      type: z.string().optional(),
      limit: LIMIT,
    },
  }, async ({ key, fromTick, toTick, type, limit }) => guarded(() => {
    const all = [...state.viewer(key).commands({
      ...(fromTick !== undefined ? { from: fromTick } : {}),
      ...(toTick !== undefined ? { to: toTick } : {}),
      ...(type !== undefined ? { type } : {}),
    })];
    return bounded(all, limit);
  }));

  server.registerTool('bundle_events', {
    description: 'Recorded events of one bundle, filterable by tick range and type.',
    inputSchema: {
      key: z.string(),
      fromTick: z.number().int().optional(),
      toTick: z.number().int().optional(),
      type: z.string().optional(),
      limit: LIMIT,
    },
  }, async ({ key, fromTick, toTick, type, limit }) => guarded(() => {
    const all = [...state.viewer(key).events({
      ...(fromTick !== undefined ? { from: fromTick } : {}),
      ...(toTick !== undefined ? { to: toTick } : {}),
      ...(type !== undefined ? { type } : {}),
    })];
    return bounded(all, limit);
  }));

  server.registerTool('diff_bundles', {
    description:
      'Compare two bundles tick by tick (commands, events, state). Defaults to a summary (firstDivergentTick + per-tick delta counts); set full for complete deltas. Compare over the OVERLAPPING tick range — non-overlapping heads surface as spurious source-only deltas.',
    inputSchema: { keyA: z.string(), keyB: z.string(), full: z.boolean().optional(), limit: LIMIT },
  }, async ({ keyA, keyB, full, limit }) => guarded(() => {
    const diff = diffBundles(state.loadBundle(keyA), state.loadBundle(keyB));
    const perTick = mapToObject(diff.perTickDeltas);
    if (full === true) {
      const entries = Object.entries(perTick);
      const page = bounded(entries, limit);
      return { ...diff, perTickDeltas: Object.fromEntries(page.items), perTickTotal: page.total, perTickTruncated: page.truncated };
    }
    return {
      equivalent: diff.equivalent,
      firstDivergentTick: diff.firstDivergentTick,
      metadataDeltas: diff.metadataDeltas,
      perTickCounts: Object.fromEntries(
        Object.entries(perTick).map(([t, d]) => [t, {
          commands: d.commands.sourceOnly.length + d.commands.forkOnly.length + d.commands.changed.length,
          events: d.events.sourceOnly.length + d.events.forkOnly.length + d.events.changed.length,
          stateChanged: d.stateDiff.entities.created.length + d.stateDiff.entities.destroyed.length
            + Object.keys(d.stateDiff.components).length + Object.keys(d.stateDiff.resources).length
            + Object.keys(d.stateDiff.state.set).length + d.stateDiff.state.removed.length
            + d.stateDiff.tags.length + d.stateDiff.metadata.length > 0,
        }]),
      ),
    };
  }));

  server.registerTool('run_metrics', {
    description:
      `Behavioral metrics over the bundles matching a corpus query. Available metrics: ${Object.keys(METRIC_FACTORIES).join(', ')}.`,
    inputSchema: { metrics: z.array(z.string()).min(1), ...QUERY_SHAPE },
  }, async ({ metrics, ...query }) => guarded(() => {
    const selected = metrics.map((name) => {
      const factory = METRIC_FACTORIES[name];
      if (!factory) throw new Error(`unknown metric "${name}" — available: ${Object.keys(METRIC_FACTORIES).join(', ')}`);
      return factory() as Metric<unknown, SessionBundle>;
    });
    return runMetrics(state.current.bundles(queryFromInput(query)), selected);
  }));

  server.registerTool('compare_metrics', {
    description:
      'Run the same metrics over two corpus queries (baseline vs current) and return the deltas — e.g. compare agent versions via sourceLabel.',
    inputSchema: {
      metrics: z.array(z.string()).min(1),
      baseline: z.object(QUERY_SHAPE),
      current: z.object(QUERY_SHAPE),
    },
  }, async ({ metrics, baseline, current }) => guarded(() => {
    const make = (): Array<Metric<unknown, SessionBundle>> => metrics.map((name) => {
      const factory = METRIC_FACTORIES[name];
      if (!factory) throw new Error(`unknown metric "${name}" — available: ${Object.keys(METRIC_FACTORIES).join(', ')}`);
      return factory() as Metric<unknown, SessionBundle>;
    });
    const a = runMetrics(state.current.bundles(queryFromInput(baseline) as BundleQuery), make());
    const b = runMetrics(state.current.bundles(queryFromInput(current) as BundleQuery), make());
    return compareMetricsResults(a, b);
  }));

  return server;
}
