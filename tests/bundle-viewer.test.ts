import { describe, expect, it } from 'vitest';
import {
  MemorySink,
  SessionRecorder,
  World,
  type Marker,
  type SessionBundle,
  type WorldConfig,
  type WorldSnapshot,
} from '../src/index.js';
import {
  BundleViewer,
  BundleViewerError,
  diffSnapshots,
} from '../src/bundle-viewer.js';

const mkConfig = (): WorldConfig => ({
  gridWidth: 10,
  gridHeight: 10,
  tps: 60,
  positionKey: 'position',
});

interface Cmds {
  spawn: { x: number; y: number; phase?: string };
  step: { value: number };
}
interface Events {
  spawned: { id: number };
}

const mkWorld = (): World<Events, Cmds> => {
  const w = new World<Events, Cmds>(mkConfig());
  w.registerHandler('spawn', () => undefined);
  w.registerHandler('step', () => undefined);
  return w;
};

const worldFactory = (snap: WorldSnapshot): World<Events, Cmds> => {
  const w = mkWorld();
  w.applySnapshot(snap);
  return w;
};

function recordSimpleBundle(steps: number, options?: { addMarker?: boolean }): SessionBundle<Events, Cmds> {
  const world = mkWorld();
  const sink = new MemorySink();
  const rec = new SessionRecorder<Events, Cmds>({ world, sink });
  rec.connect();
  for (let i = 0; i < steps; i++) {
    world.submit('step', { value: i });
    world.step();
  }
  rec.disconnect();
  const bundle = rec.toBundle();
  if (options?.addMarker) {
    bundle.markers = [
      ...bundle.markers,
      { id: 'm1', tick: 1, kind: 'annotation', provenance: 'engine', text: 'midpoint' },
    ];
  }
  return bundle as unknown as SessionBundle<Events, Cmds>;
}

describe('BundleViewer', () => {
  describe('construction', () => {
    it('builds with a valid bundle and exposes metadata + ranges', () => {
      const bundle = recordSimpleBundle(3);
      const viewer = new BundleViewer(bundle);
      expect(viewer.bundle).toBe(bundle);
      expect(viewer.metadata.sessionId).toBe(bundle.metadata.sessionId);
      expect(viewer.recordedRange.start).toBe(bundle.metadata.startTick);
      expect(viewer.recordedRange.end).toBe(bundle.metadata.endTick);
      expect(viewer.replayableRange.start).toBe(bundle.metadata.startTick);
      expect(viewer.replayableRange.end).toBe(bundle.metadata.endTick);
    });

    it('throws BundleVersionError on schemaVersion mismatch', () => {
      const bundle = recordSimpleBundle(1);
      const bad = { ...bundle, schemaVersion: 999 } as unknown as SessionBundle<Events, Cmds>;
      expect(() => new BundleViewer(bad)).toThrow(/schemaVersion|version/i);
    });

    it('throws BundleIntegrityError on duplicate marker ids', () => {
      const bundle = recordSimpleBundle(1);
      const m: Marker = { id: 'm', tick: 1, kind: 'annotation', provenance: 'engine' };
      const dup = { ...bundle, markers: [m, { ...m }] };
      expect(() => new BundleViewer(dup as unknown as SessionBundle<Events, Cmds>)).toThrow(/duplicate.*marker/i);
    });

    it('exposes a markerIndex map populated from bundle.markers', () => {
      const bundle = recordSimpleBundle(2, { addMarker: true });
      const viewer = new BundleViewer(bundle);
      expect(viewer.markerIndex.size).toBe(1);
      expect(viewer.markerIndex.get('m1')?.text).toBe('midpoint');
    });
  });

  describe('atTick / atMarker / timeline', () => {
    it('returns frozen frames for in-range ticks', () => {
      const bundle = recordSimpleBundle(3);
      const viewer = new BundleViewer(bundle);
      const frame = viewer.atTick(2);
      expect(frame.tick).toBe(2);
      expect(Object.isFrozen(frame)).toBe(true);
      // The per-tick arrays are frozen too:
      expect(Object.isFrozen(frame.events)).toBe(true);
      expect(Object.isFrozen(frame.commands)).toBe(true);
    });

    it('throws tick_out_of_range below recordedRange.start', () => {
      const bundle = recordSimpleBundle(2);
      const viewer = new BundleViewer(bundle);
      const below = bundle.metadata.startTick - 1;
      try {
        viewer.atTick(below);
        expect.fail('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(BundleViewerError);
        expect((e as BundleViewerError).details.code).toBe('tick_out_of_range');
      }
    });

    it('throws tick_out_of_range above recordedRange.end', () => {
      const bundle = recordSimpleBundle(2);
      const viewer = new BundleViewer(bundle);
      const above = bundle.metadata.endTick + 1;
      expect(() => viewer.atTick(above)).toThrow(BundleViewerError);
    });

    it('atMarker returns a frame for the marker tick', () => {
      const bundle = recordSimpleBundle(2, { addMarker: true });
      const viewer = new BundleViewer(bundle);
      const frame = viewer.atMarker('m1');
      expect(frame.tick).toBe(bundle.markers[0].tick);
    });

    it('atMarker throws marker_missing for unknown id', () => {
      const bundle = recordSimpleBundle(1);
      const viewer = new BundleViewer(bundle);
      try {
        viewer.atMarker('nope');
        expect.fail('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(BundleViewerError);
        expect((e as BundleViewerError).details.code).toBe('marker_missing');
      }
    });

    it('timeline iterates only ticks with SessionTickEntry, ascending', () => {
      const bundle = recordSimpleBundle(3);
      const viewer = new BundleViewer(bundle);
      const ticks = [...viewer.timeline()].map((f) => f.tick);
      expect(ticks).toEqual(bundle.ticks.map((t) => t.tick));
      expect(ticks).toEqual([...ticks].sort((a, b) => a - b));
    });

    it('viewer.ticks() returns ascending list matching bundle.ticks', () => {
      const bundle = recordSimpleBundle(3);
      const viewer = new BundleViewer(bundle);
      expect(viewer.ticks()).toEqual(bundle.ticks.map((t) => t.tick));
    });
  });

  describe('frame contents', () => {
    it('frame.events surfaces events from the bundle SessionTickEntry', () => {
      const bundle = recordSimpleBundle(1);
      // Inject a synthetic event into tick 1 for testing.
      const tickEntry = bundle.ticks[0];
      tickEntry.events = [{ type: 'spawned', data: { id: 7 } }];
      const viewer = new BundleViewer(bundle);
      const frame = viewer.atTick(tickEntry.tick);
      expect(frame.events).toEqual([{ type: 'spawned', data: { id: 7 } }]);
    });

    it('frame.commands surfaces commands keyed by submissionTick (independent of SessionTickEntry)', () => {
      const bundle = recordSimpleBundle(2);
      // We submitted one 'step' command per tick before stepping, so at submissionTick 0 there's the first.
      // The bundle's commands[].submissionTick is 0 (submitted before step 1 advanced tick).
      const viewer = new BundleViewer(bundle);
      const frameAtZero = viewer.atTick(0);
      expect(frameAtZero.commands.length).toBeGreaterThanOrEqual(1);
    });

    it('sparse ticks return empty events/diff/metrics/debug but still surface independent streams', () => {
      // Construct a bundle where tick=2 has no SessionTickEntry but has a marker.
      const baseBundle = recordSimpleBundle(2);
      const synthetic: SessionBundle<Events, Cmds> = {
        ...baseBundle,
        markers: [
          ...baseBundle.markers,
          { id: 'sparse', tick: 5, kind: 'annotation', provenance: 'engine' },
        ],
        metadata: { ...baseBundle.metadata, endTick: 5, durationTicks: 5 },
      };
      const viewer = new BundleViewer(synthetic);
      const frame = viewer.atTick(5);
      expect(frame.events).toEqual([]);
      expect(frame.diff).toBeNull();
      expect(frame.metrics).toBeNull();
      expect(frame.debug).toBeNull();
      expect(frame.markers.map((m) => m.id)).toContain('sparse');
    });
  });

  describe('frame freezing (layered)', () => {
    it('frame object is frozen — direct property assignment throws', () => {
      const bundle = recordSimpleBundle(1);
      const viewer = new BundleViewer(bundle);
      const frame = viewer.atTick(1);
      // Strict mode is implied for ES modules — Object.freeze + assignment throws TypeError.
      expect(() => {
        (frame as unknown as { tick: number }).tick = 99;
      }).toThrow();
    });

    it('frame arrays are frozen — push throws', () => {
      const bundle = recordSimpleBundle(1);
      const viewer = new BundleViewer(bundle);
      const frame = viewer.atTick(1);
      expect(() => {
        (frame.events as unknown as { push: (x: unknown) => void }).push({ type: 'foo', data: {} });
      }).toThrow();
    });

    it('array elements are NOT individually frozen — element bypass succeeds, mutation visible across reads (documented contract)', () => {
      const bundle = recordSimpleBundle(1);
      bundle.ticks[0].events = [{ type: 'spawned', data: { id: 1 } }];
      const viewer = new BundleViewer(bundle);
      const frame = viewer.atTick(1);
      // Documented bypass: cast away readonly and mutate an element's data field.
      const ev = frame.events[0] as { type: string; data: { id: number } };
      expect(() => { ev.data.id = 999; }).not.toThrow();
      // Mutation is visible on subsequent reads of the same frame's array (shared reference).
      expect((frame.events[0] as { data: { id: number } }).data.id).toBe(999);
      // And via a fresh atTick call against the same viewer, since the per-tick array is reused.
      const refetched = viewer.atTick(1);
      expect((refetched.events[0] as { data: { id: number } }).data.id).toBe(999);
    });
  });

  describe('iterators', () => {
    it('events() yields entries with tick, type, data in tick-ASC order', () => {
      const bundle = recordSimpleBundle(2);
      bundle.ticks[0].events = [{ type: 'spawned', data: { id: 1 } }];
      bundle.ticks[1].events = [{ type: 'spawned', data: { id: 2 } }];
      const viewer = new BundleViewer(bundle);
      const events = [...viewer.events()];
      expect(events).toEqual([
        { tick: 1, type: 'spawned', data: { id: 1 } },
        { tick: 2, type: 'spawned', data: { id: 2 } },
      ]);
    });

    it('events({ from, to }) honors the tick range', () => {
      const bundle = recordSimpleBundle(3);
      bundle.ticks.forEach((t, i) => { t.events = [{ type: 'spawned', data: { id: i } }]; });
      const viewer = new BundleViewer(bundle);
      const events = [...viewer.events({ from: 2, to: 2 })];
      expect(events).toEqual([{ tick: 2, type: 'spawned', data: { id: 1 } }]);
    });

    it('events({ type }) filters by type via OneOrMany', () => {
      const bundle = recordSimpleBundle(2);
      bundle.ticks[0].events = [
        { type: 'spawned', data: { id: 1 } },
        { type: 'other' as 'spawned', data: { id: 99 } as { id: number } },
      ];
      const viewer = new BundleViewer(bundle);
      const events = [...viewer.events({ type: 'spawned' })];
      expect(events.every((e) => e.type === 'spawned')).toBe(true);
    });

    it('commands() yields in tick-then-sequence order', () => {
      const bundle = recordSimpleBundle(2);
      const viewer = new BundleViewer(bundle);
      const cmds = [...viewer.commands()];
      // Should be sorted by submissionTick ASC, then sequence ASC.
      for (let i = 1; i < cmds.length; i++) {
        const prev = cmds[i - 1];
        const cur = cmds[i];
        expect(prev.submissionTick <= cur.submissionTick).toBe(true);
        if (prev.submissionTick === cur.submissionTick) {
          expect(prev.sequence < cur.sequence).toBe(true);
        }
      }
    });

    it('markers() iterates in tick-then-id ASC order, optionally filtered', () => {
      const bundle = recordSimpleBundle(3);
      bundle.markers = [
        { id: 'b', tick: 2, kind: 'annotation', provenance: 'engine' },
        { id: 'a', tick: 2, kind: 'annotation', provenance: 'engine' },
        { id: 'c', tick: 1, kind: 'checkpoint', provenance: 'engine' },
      ];
      const viewer = new BundleViewer(bundle);
      const ids = [...viewer.markers()].map((m) => m.id);
      expect(ids).toEqual(['c', 'a', 'b']);
      const ckp = [...viewer.markers({ kind: 'checkpoint' })];
      expect(ckp.map((m) => m.id)).toEqual(['c']);
    });

    it('eager bound validation: NaN from throws synchronously', () => {
      const bundle = recordSimpleBundle(1);
      const viewer = new BundleViewer(bundle);
      try {
        viewer.events({ from: NaN });
        expect.fail('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(BundleViewerError);
        expect((e as BundleViewerError).details.code).toBe('query_invalid');
      }
    });

    it('from > to is a no-op (yields nothing) rather than throwing', () => {
      const bundle = recordSimpleBundle(3);
      const viewer = new BundleViewer(bundle);
      expect([...viewer.events({ from: 3, to: 1 })]).toEqual([]);
    });
  });

  describe('state / snapshot / replayer', () => {
    it('frame.state() throws world_factory_required without worldFactory', () => {
      const bundle = recordSimpleBundle(1);
      const viewer = new BundleViewer(bundle);
      const frame = viewer.atTick(1);
      try {
        frame.state();
        expect.fail('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(BundleViewerError);
        expect((e as BundleViewerError).details.code).toBe('world_factory_required');
      }
    });

    it('frame.state() with worldFactory returns a paused World at that tick', () => {
      const bundle = recordSimpleBundle(2);
      const viewer = new BundleViewer(bundle, { worldFactory });
      const frame = viewer.atTick(1);
      const world = frame.state();
      expect(world.tick).toBe(1);
    });

    it('frame.snapshot() returns a WorldSnapshot at the tick', () => {
      const bundle = recordSimpleBundle(2);
      const viewer = new BundleViewer(bundle, { worldFactory });
      const frame = viewer.atTick(1);
      const snap = frame.snapshot();
      expect(snap.tick).toBe(1);
    });

    it('viewer.replayer() is memoized — same instance across calls', () => {
      const bundle = recordSimpleBundle(2);
      const viewer = new BundleViewer(bundle, { worldFactory });
      const r1 = viewer.replayer();
      const r2 = viewer.replayer();
      expect(r1).toBe(r2);
    });
  });

  // diffSince correctness tests live in tests/bundle-viewer-diff.test.ts to keep
  // each test file under the 500-LOC review cap. Those tests cover failure-in-range,
  // automatic sparse + recycling fallback, folded path coalescing, equal endpoints,
  // direction normalization, NaN guard, and out-of-range otherTick.

  describe('diffSince (smoke)', () => {
    it('equal endpoints return empty BundleStateDiff with source tick-diffs', () => {
      const bundle = recordSimpleBundle(3);
      const viewer = new BundleViewer(bundle);
      const frame = viewer.atTick(1);
      const d = frame.diffSince(1);
      expect(d.fromTick).toBe(1);
      expect(d.toTick).toBe(1);
      expect(d.source).toBe('tick-diffs');
      expect(d.diff.entities.created).toEqual([]);
      expect(d.diff.entities.destroyed).toEqual([]);
    });

  });

  describe('fromSource', () => {
    it('materializes a bundle through SessionSource and constructs a viewer', () => {
      const world = mkWorld();
      const sink = new MemorySink();
      const rec = new SessionRecorder<Events, Cmds>({ world, sink });
      rec.connect();
      world.step();
      world.step();
      rec.disconnect();
      const viewer = BundleViewer.fromSource<Events, Cmds>(sink);
      expect(viewer.recordedRange.start).toBe(0);
      expect(viewer.recordedRange.end).toBe(2);
    });
  });

  describe('content-bounded recordedRange', () => {
    it('clamps recordedRange.end to the highest stream tick when metadata.endTick overstates', () => {
      // Construct a bundle that fakes a "terminated past last entry" scenario.
      const bundle = recordSimpleBundle(2);
      bundle.metadata.endTick = 99;        // metadata claims tick 99
      bundle.metadata.incomplete = true;
      bundle.metadata.persistedEndTick = 50;
      const viewer = new BundleViewer(bundle);
      // Highest content tick across streams is 2 (last SessionTickEntry).
      expect(viewer.recordedRange.end).toBe(2);
      // replayableRange uses persistedEndTick for incomplete bundles.
      expect(viewer.replayableRange.end).toBe(50);
    });
  });

  describe('exports', () => {
    it('exposes diffSnapshots from the bundle-viewer module', () => {
      expect(typeof diffSnapshots).toBe('function');
    });
  });
});
