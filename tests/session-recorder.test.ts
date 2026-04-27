import { describe, expect, it } from 'vitest';
import {
  MemorySink,
  SessionRecorder,
  World,
  type WorldConfig,
} from '../src/index.js';

const mkConfig = (): WorldConfig => ({
  gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position',
});

interface Cmds { spawn: { x: number; y: number; phase?: string } }

const mkWorld = () => {
  const w = new World<Record<string, never>, Cmds>(mkConfig());
  w.registerHandler('spawn', () => undefined);
  return w;
};

describe('SessionRecorder', () => {
  it('construction generates a sessionId; not yet connected', () => {
    const world = mkWorld();
    const rec = new SessionRecorder({ world });
    expect(rec.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(rec.isConnected).toBe(false);
    expect(rec.isClosed).toBe(false);
  });

  it('connect() captures initial snapshot', () => {
    const world = mkWorld();
    const sink = new MemorySink();
    const rec = new SessionRecorder({ world, sink });
    rec.connect();
    expect(rec.isConnected).toBe(true);
    expect(rec.snapshotCount).toBe(1);
    rec.disconnect();
  });

  it('connect() on a poisoned world throws RecorderClosedError', () => {
    const world = mkWorld();
    world.registerSystem({
      name: 'boom', phase: 'update',
      execute: () => { throw new Error('intentional'); },
    });
    expect(() => world.step()).toThrow();
    expect(world.isPoisoned()).toBe(true);
    const rec = new SessionRecorder({ world });
    expect(() => rec.connect()).toThrow(/world_poisoned|poisoned/);
  });

  it('connect() after disconnect() throws (single-use)', () => {
    const world = mkWorld();
    const rec = new SessionRecorder({ world });
    rec.connect();
    rec.disconnect();
    expect(() => rec.connect()).toThrow(/single-use|already_closed/);
  });

  it('two SessionRecorder instances on same world: second throws recorder_already_attached', () => {
    const world = mkWorld();
    const r1 = new SessionRecorder({ world });
    r1.connect();
    const r2 = new SessionRecorder({ world });
    expect(() => r2.connect()).toThrow(/already_attached|attached/);
    r1.disconnect();
  });

  it('per-tick: onDiff produces SessionTickEntry with diff and events', () => {
    const world = mkWorld();
    const sink = new MemorySink();
    const rec = new SessionRecorder({ world, sink });
    rec.connect();
    world.step();
    world.step();
    expect(rec.tickCount).toBe(2);
    rec.disconnect();
    const bundle = rec.toBundle();
    expect(bundle.ticks).toHaveLength(2);
    expect(bundle.ticks[0].tick).toBe(1);
    expect(bundle.ticks[1].tick).toBe(2);
  });

  it('submit/submitWithResult: capture into commands.jsonl via single wrap', () => {
    const world = mkWorld();
    const sink = new MemorySink();
    const rec = new SessionRecorder({ world, sink });
    rec.connect();
    world.submit('spawn', { x: 1, y: 2, phase: 's' });
    world.submitWithResult('spawn', { x: 3, y: 4, phase: 'sr' });
    world.step();
    rec.disconnect();
    const bundle = rec.toBundle();
    expect(bundle.commands).toHaveLength(2);
    expect(bundle.commands[0].data).toEqual({ x: 1, y: 2, phase: 's' });
    expect(bundle.commands[1].data).toEqual({ x: 3, y: 4, phase: 'sr' });
  });

  it('addMarker: live-tick path validates entity refs strictly', () => {
    const world = mkWorld();
    const sink = new MemorySink();
    const rec = new SessionRecorder({ world, sink });
    rec.connect();
    const id = world.createEntity();
    rec.addMarker({ kind: 'annotation', refs: { entities: [{ id, generation: 0 }] }, text: 'live' });
    expect(() => rec.addMarker({
      kind: 'annotation',
      refs: { entities: [{ id: 999, generation: 0 }] },
    })).toThrow(/entity|liveness/);
    rec.disconnect();
    const bundle = rec.toBundle();
    expect(bundle.markers).toHaveLength(1);
    expect(bundle.markers[0].kind).toBe('annotation');
    expect(bundle.markers[0].provenance).toBe('game');
  });

  it('addMarker: retroactive (tick < world.tick) skips entity liveness; sets validated:false', () => {
    const world = mkWorld();
    const sink = new MemorySink();
    const rec = new SessionRecorder({ world, sink });
    rec.connect();
    const id = world.createEntity();
    world.step(); world.step();
    expect(world.tick).toBe(2);
    world.destroyEntity(id);
    // Retroactive: refers to tick 0 when entity didn't yet exist; validated:false
    const mid = rec.addMarker({
      kind: 'checkpoint', tick: 0,
      refs: { entities: [{ id: 999, generation: 0 }] },  // would fail live validation
    });
    expect(typeof mid).toBe('string');
    rec.disconnect();
    const bundle = rec.toBundle();
    const m = bundle.markers.find((mk) => mk.kind === 'checkpoint');
    expect(m?.validated).toBe(false);
  });

  it('addMarker: rejects future tick', () => {
    const world = mkWorld();
    const rec = new SessionRecorder({ world });
    rec.connect();
    expect(() => rec.addMarker({ kind: 'annotation', tick: 999 })).toThrow(/exceed|future/);
    rec.disconnect();
  });

  it('addMarker: rejects negative tick', () => {
    const world = mkWorld();
    const rec = new SessionRecorder({ world });
    rec.connect();
    expect(() => rec.addMarker({ kind: 'annotation', tick: -1 })).toThrow(/>= 0|negative/);
    rec.disconnect();
  });

  it('after sink failure (terminated state), addMarker / attach / takeSnapshot throw RecorderClosedError(code: recorder_terminated)', () => {
    // Iter-2 review L2 regression: previously these methods only checked
    // !_connected || _closed; after a sink failure flipped _terminated=true
    // but kept _connected=true, subsequent calls re-entered the failed
    // sink path and re-threw SinkWriteError. Now they fail fast.
    const world = mkWorld();
    // Build a sink that throws on any write after a successful open().
    let metadataObj: { [k: string]: unknown } | null = null;
    const failingSink = {
      open(metadata: { [k: string]: unknown }): void { metadataObj = { ...metadata }; },
      writeTick(): void {},
      writeCommand(): void {},
      writeCommandExecution(): void {},
      writeTickFailure(): void {},
      writeSnapshot(): void { throw new Error('disk full'); },  // initial-snapshot write fails
      writeMarker(): void { throw new Error('disk full'); },
      writeAttachment(): never { throw new Error('disk full'); },
      close(): void {},
      get metadata(): { [k: string]: unknown } { return metadataObj ?? {}; },
      readSnapshot(): never { throw new Error('not opened'); },
      readSidecar(): never { throw new Error('not opened'); },
      *ticks() {},
      *commands() {},
      *executions() {},
      *failures() {},
      *markers() {},
      *attachments() {},
      toBundle(): never { throw new Error('not opened'); },
    } as never;
    const rec = new SessionRecorder({ world, sink: failingSink });
    rec.connect();  // initial-snapshot write throws → recorder enters _terminated
    expect(rec.lastError).not.toBeNull();
    // All three user-facing methods share the _assertOperational guard;
    // verify each independently to pin the call sites.
    expect(() => rec.addMarker({ kind: 'annotation' })).toThrow(/recorder_terminated|terminated/);
    expect(() => rec.attach({ mime: 'image/png', data: new Uint8Array([1, 2, 3]) })).toThrow(/recorder_terminated|terminated/);
    expect(() => rec.takeSnapshot()).toThrow(/recorder_terminated|terminated/);
    rec.disconnect();
  });

  it('addMarker after disconnect throws RecorderClosedError', () => {
    const world = mkWorld();
    const rec = new SessionRecorder({ world });
    rec.connect();
    rec.disconnect();
    expect(() => rec.addMarker({ kind: 'annotation' })).toThrow(/disconnected|closed/);
  });

  it('attach with sidecar:true forwards to sink', () => {
    const world = mkWorld();
    const sink = new MemorySink({ allowSidecar: true });
    const rec = new SessionRecorder({ world, sink });
    rec.connect();
    const id = rec.attach({ mime: 'image/png', data: new Uint8Array([1, 2, 3]) }, { sidecar: true });
    expect(typeof id).toBe('string');
    rec.disconnect();
    const recovered = sink.readSidecar(id);
    expect([...recovered]).toEqual([1, 2, 3]);
  });

  it('takeSnapshot writes a manual snapshot at current tick', () => {
    const world = mkWorld();
    const rec = new SessionRecorder({ world });
    rec.connect();
    world.step();
    const entry = rec.takeSnapshot();
    expect(entry.tick).toBe(1);
    rec.disconnect();
    expect(rec.snapshotCount).toBeGreaterThanOrEqual(2);
  });

  it('terminalSnapshot defaults to true; bundle has at least (initial, terminal) segment', () => {
    const world = mkWorld();
    const rec = new SessionRecorder({ world });
    rec.connect();
    world.step();
    rec.disconnect();
    // initial at tick 0; terminal at tick 1
    expect(rec.snapshotCount).toBe(2);
    const bundle = rec.toBundle();
    expect(bundle.snapshots).toHaveLength(1);
    expect(bundle.snapshots[0].tick).toBe(1);
  });

  it('terminalSnapshot:false skips the final snapshot', () => {
    const world = mkWorld();
    const rec = new SessionRecorder({ world, terminalSnapshot: false });
    rec.connect();
    world.step();
    rec.disconnect();
    expect(rec.snapshotCount).toBe(1);  // only the initial
  });

  it('periodic snapshot: snapshotInterval triggers writes at multiples after startTick', () => {
    const world = mkWorld();
    const rec = new SessionRecorder({ world, snapshotInterval: 2, terminalSnapshot: false });
    rec.connect();  // initial at tick 0
    world.step();   // tick 1 — no snapshot
    world.step();   // tick 2 — periodic at interval 2
    world.step();   // tick 3 — no
    world.step();   // tick 4 — periodic
    rec.disconnect();
    expect(rec.snapshotCount).toBe(3);  // initial + 2 periodic
  });

  it('snapshotInterval: null disables periodic snapshots', () => {
    const world = mkWorld();
    const rec = new SessionRecorder({ world, snapshotInterval: null, terminalSnapshot: false });
    rec.connect();
    for (let i = 0; i < 100; i++) world.step();
    rec.disconnect();
    expect(rec.snapshotCount).toBe(1);  // only initial
  });

  it('disconnect finalizes metadata with endTick + durationTicks', () => {
    const world = mkWorld();
    const rec = new SessionRecorder({ world });
    rec.connect();
    for (let i = 0; i < 5; i++) world.step();
    rec.disconnect();
    const bundle = rec.toBundle();
    expect(bundle.metadata.endTick).toBe(5);
    expect(bundle.metadata.durationTicks).toBe(5);
  });

  it('toBundle is JSON-serializable end-to-end', () => {
    const world = mkWorld();
    const rec = new SessionRecorder({ world });
    rec.connect();
    rec.addMarker({ kind: 'annotation', text: 'hi' });
    world.submit('spawn', { x: 1, y: 1 });
    world.step();
    rec.disconnect();
    const bundle = rec.toBundle();
    const round = JSON.parse(JSON.stringify(bundle));
    expect(round.schemaVersion).toBe(1);
    expect(round.markers[0].text).toBe('hi');
    expect(round.commands).toHaveLength(1);
  });
});
