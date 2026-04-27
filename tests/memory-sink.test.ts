import { describe, expect, it } from 'vitest';
import { MemorySink, type SessionMetadata } from '../src/index.js';

const mkMetadata = (): SessionMetadata => ({
  sessionId: '00000000-0000-0000-0000-000000000000',
  engineVersion: '0.7.7',
  nodeVersion: 'v22.0.0',
  recordedAt: '2026-04-27T00:00:00Z',
  startTick: 0, endTick: 0, persistedEndTick: 0, durationTicks: 0,
  sourceKind: 'session',
});

const mkSnapshot = (tick: number) => ({
  version: 5, tick,
  config: { gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' },
  entities: { generations: [], alive: [], freeList: [] },
  components: {}, resources: { pools: {}, rates: {}, transfers: {} },
  rng: { state: '0' }, state: {}, tags: {}, metadata: {},
} as never);

describe('MemorySink', () => {
  it('toBundle() throws when no snapshots have been written', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    expect(() => sink.toBundle()).toThrow(/snapshots/);
  });

  it('toBundle() throws when not opened', () => {
    const sink = new MemorySink();
    expect(() => sink.toBundle()).toThrow(/not opened/);
  });

  it('open() + writeSnapshot() + toBundle() produces a bundle with that snapshot as initialSnapshot', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    const bundle = sink.toBundle();
    expect(bundle.schemaVersion).toBe(1);
    expect((bundle.initialSnapshot as { tick: number }).tick).toBe(0);
    expect(bundle.snapshots).toEqual([]);
  });

  it('writeMarker accumulates markers in the bundle', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.writeMarker({ id: 'a', tick: 0, kind: 'annotation', provenance: 'game', text: 'hi' });
    sink.writeMarker({ id: 'b', tick: 1, kind: 'checkpoint', provenance: 'game' });
    const bundle = sink.toBundle();
    expect(bundle.markers).toHaveLength(2);
    expect(bundle.markers[0].text).toBe('hi');
  });

  it('writeAttachment under threshold stores as dataUrl and returns the finalized descriptor', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    const desc = sink.writeAttachment(
      { id: 'x', mime: 'image/png', sizeBytes: 4, ref: { dataUrl: '' } },
      new Uint8Array([1, 2, 3, 4]),
    );
    expect('dataUrl' in desc.ref).toBe(true);
    if ('dataUrl' in desc.ref) {
      expect(desc.ref.dataUrl).toMatch(/^data:image\/png;base64,/);
    }
    const bundle = sink.toBundle();
    expect(bundle.attachments[0].ref).toEqual(desc.ref);
  });

  it('writeAttachment over threshold without sidecar opt-in throws SinkWriteError', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    const huge = new Uint8Array(65537);
    expect(() => sink.writeAttachment(
      { id: 'x', mime: 'application/octet-stream', sizeBytes: huge.byteLength, ref: { dataUrl: '' } },
      huge,
    )).toThrow(/sidecar/);
  });

  it('writeAttachment over threshold with allowSidecar stores as sidecar; readSidecar retrieves bytes', () => {
    const sink = new MemorySink({ allowSidecar: true });
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    const huge = new Uint8Array(65537);
    huge[0] = 99; huge[65536] = 7;
    const desc = sink.writeAttachment(
      { id: 'big', mime: 'application/octet-stream', sizeBytes: huge.byteLength, ref: { sidecar: true } },
      huge,
    );
    expect(desc.ref).toEqual({ sidecar: true });
    const recovered = sink.readSidecar('big');
    expect(recovered.byteLength).toBe(65537);
    expect(recovered[0]).toBe(99);
    expect(recovered[65536]).toBe(7);
  });

  it('writeAttachment with explicit { sidecar: true } stores as sidecar regardless of size', () => {
    const sink = new MemorySink({ allowSidecar: true });
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    const desc = sink.writeAttachment(
      { id: 'small', mime: 'image/png', sizeBytes: 4, ref: { sidecar: true } },
      new Uint8Array([1, 2, 3, 4]),
    );
    expect(desc.ref).toEqual({ sidecar: true });
    expect(sink.readSidecar('small').byteLength).toBe(4);
  });

  it('readSidecar throws on unknown id', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    expect(() => sink.readSidecar('missing')).toThrow(/not found/);
  });

  it('writeMarker after close throws', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.close();
    expect(() => sink.writeMarker({ id: 'a', tick: 0, kind: 'annotation', provenance: 'game' })).toThrow(/closed/);
  });

  it('writeTick / writeCommand / writeSnapshot accumulate in order; subsequent snapshots populate snapshots[]', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.writeTick({ tick: 1, diff: { tick: 1 } as never, events: [], metrics: null, debug: null });
    sink.writeTick({ tick: 2, diff: { tick: 2 } as never, events: [], metrics: null, debug: null });
    sink.writeCommand({
      type: 'spawn', data: {}, sequence: 1, submissionTick: 1,
      result: {
        schemaVersion: 1 as never, accepted: true, commandType: 'spawn',
        code: 'ok', message: '', details: null, tick: 1, sequence: 1, validatorIndex: null,
      },
    });
    sink.writeSnapshot({ tick: 2, snapshot: mkSnapshot(2) });
    const bundle = sink.toBundle();
    expect(bundle.ticks).toHaveLength(2);
    expect(bundle.commands).toHaveLength(1);
    expect(bundle.snapshots).toHaveLength(1);
    expect(bundle.snapshots[0].tick).toBe(2);
  });

  it('writeSnapshot advances metadata.persistedEndTick', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 100, snapshot: mkSnapshot(100) });
    sink.writeSnapshot({ tick: 200, snapshot: mkSnapshot(200) });
    const bundle = sink.toBundle();
    expect(bundle.metadata.persistedEndTick).toBe(200);
  });

  it('writeTickFailure populates metadata.failedTicks', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.writeTickFailure({ tick: 5, code: 'system_throw', message: 'boom', details: null } as never);
    const bundle = sink.toBundle();
    expect(bundle.metadata.failedTicks).toEqual([5]);
    expect(bundle.failures).toHaveLength(1);
  });

  it('toBundle() is JSON-stringify-roundtrippable', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.writeMarker({ id: 'a', tick: 0, kind: 'annotation', provenance: 'game' });
    const bundle = sink.toBundle();
    const round = JSON.parse(JSON.stringify(bundle));
    expect(round.markers[0].id).toBe('a');
    expect(round.schemaVersion).toBe(1);
  });

  it('SessionSource iterators yield in write order', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.writeTick({ tick: 1, diff: { tick: 1 } as never, events: [], metrics: null, debug: null });
    sink.writeTick({ tick: 2, diff: { tick: 2 } as never, events: [], metrics: null, debug: null });
    expect([...sink.ticks()].map((t) => t.tick)).toEqual([1, 2]);
  });
});
