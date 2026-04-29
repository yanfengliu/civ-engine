// Spec 9.1 (v0.8.11): AgentDriverContext.addMarker / attach extension.
// Per AGENTS.md TDD discipline these tests are written first; the
// implementation in src/ai-playtester.ts follows. Tests 1-4 fail until
// the implementation lands; test 5 (regression) passes immediately.

import { describe, expect, it } from 'vitest';
import {
  MarkerValidationError,
  runAgentPlaytest,
  type AgentDriver,
  type NewMarker,
  World,
  type WorldConfig,
} from '../src/index.js';

const mkConfig = (): WorldConfig => ({
  gridWidth: 10,
  gridHeight: 10,
  tps: 60,
  positionKey: 'position',
});

interface Cmds { tick: { v: number } }
interface Events { e: { id: number } }

const mkWorld = (): World<Events, Cmds> => {
  const w = new World<Events, Cmds>(mkConfig());
  w.registerHandler('tick', () => undefined);
  return w;
};

describe('AgentDriverContext.addMarker (v0.8.11)', () => {
  it('emits a marker via ctx.addMarker with no tick; recorder defaults tick to world.tick', async () => {
    const w = mkWorld();
    const agent: AgentDriver<Events, Cmds> = {
      decide: (ctx) => {
        const input: NewMarker = {
          kind: 'annotation',
          text: 'hello',
          refs: { tickRange: { from: ctx.world.tick, to: ctx.world.tick } },
        };
        ctx.addMarker(input);
        return [];
      },
    };
    const result = await runAgentPlaytest({ world: w, agent, maxTicks: 5 });
    expect(result.ok).toBe(true);
    expect(result.bundle.markers.length).toBe(5);
    // CE-0 verified: decide runs BEFORE world.step. So at the moment a marker
    // is emitted from inside decide for tickIndex N, world.tick is N (the
    // just-completed previous tick); world.tick + 1 (= ctx.tick) is the
    // upcoming tick. Recorder defaults marker.tick to world.tick.
    // Tick 0: world.tick was 0 BEFORE decide ran (initial); after step it became 1.
    // But the recorder reads world.tick AT THE MOMENT addMarker fires (inside decide).
    // So markers[0].tick === 0 (decide ran with world.tick = 0), markers[1].tick === 1, etc.
    expect(result.bundle.markers.map((m) => m.tick)).toEqual([0, 1, 2, 3, 4]);
  });

  it('attaches a 100 KiB PNG via ctx.attach; recorder survives (default sink allowSidecar)', async () => {
    const w = mkWorld();
    const png = new Uint8Array(100 * 1024); // 100 KiB > 64 KiB threshold
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG magic
    let emittedAttachmentId: string | null = null;
    const agent: AgentDriver<Events, Cmds> = {
      decide: (ctx) => {
        if (ctx.tickIndex !== 0) return [];
        const id = ctx.attach({ mime: 'image/png', data: png });
        emittedAttachmentId = id;
        ctx.addMarker({
          kind: 'annotation',
          text: 'screenshot',
          refs: { tickRange: { from: ctx.world.tick, to: ctx.world.tick } },
          attachments: [id],
        });
        return [];
      },
    };
    const result = await runAgentPlaytest({ world: w, agent, maxTicks: 1 });
    expect(result.ok).toBe(true);
    expect(emittedAttachmentId).not.toBeNull();
    expect(result.bundle.attachments.length).toBe(1);
    // Default sink is now MemorySink({ allowSidecar: true }) so an oversize
    // attachment routes to sidecar instead of throwing oversize_attachment.
    expect(result.bundle.attachments[0].ref).toEqual({ sidecar: true });
    expect(result.bundle.attachments[0].id).toBe(emittedAttachmentId);
    expect(result.bundle.markers.length).toBe(1);
    expect(result.bundle.markers[0].attachments).toEqual([emittedAttachmentId]);
    // Spec 9.1 (v0.8.11): result.source exposes the sink so default-sink callers
    // can recover sidecar bytes. Without this surface, sidecar descriptors would
    // be unreachable for the default-sink path.
    const recovered = result.source.readSidecar(emittedAttachmentId!);
    expect(recovered.byteLength).toBe(png.byteLength);
    expect(recovered[0]).toBe(0x89); // PNG magic preserved
  });

  it('rejects ctx.addMarker with input.tick = ctx.tick (= world.tick + 1) as MarkerValidationError 6.1.tick_future', async () => {
    const w = mkWorld();
    const agent: AgentDriver<Events, Cmds> = {
      decide: (ctx) => {
        ctx.addMarker({
          kind: 'annotation',
          text: 'future',
          tick: ctx.tick, // ctx.tick === world.tick + 1; recorder rejects future ticks
          refs: { tickRange: { from: ctx.world.tick, to: ctx.world.tick } },
        });
        return [];
      },
    };
    const result = await runAgentPlaytest({ world: w, agent, maxTicks: 5 });
    expect(result.ok).toBe(false);
    expect(result.stopReason).toBe('agentError');
    expect(result.agentError).toBeDefined();
    expect(result.agentError!.error.name).toBe('MarkerValidationError');
    // Documented constraint: marker.tick must not exceed current world tick.
    expect(result.agentError!.error.message).toMatch(
      /marker\.tick \(\d+\) must not exceed current world tick \(\d+\)/,
    );
    // Sanity: surface MarkerValidationError type from civ-engine for callers.
    expect(MarkerValidationError).toBeDefined();
    // Defensive: the recorder MUST throw BEFORE writeMarker (session-recorder.ts
    // validates tick at lines 276-280, before the writeMarker at line 350). Verify
    // no marker was persisted to the bundle. A future regression that reordered
    // validation after the write would leak the future-tick marker into the bundle.
    expect(result.bundle.markers.length).toBe(0);
  });

  // Defensive coverage of the MarkerValidationError rule code that the runner's
  // errorShape (ai-playtester.ts:errorShape) flattens away. The agentError exposes
  // only { name, message, stack }, so the existing future-tick test cannot directly
  // assert the rule code '6.1.tick_future'. Bypass the runner: call
  // recorder.addMarker directly so the error is observable in its full shape.
  it('MarkerValidationError on future tick carries referencesValidationRule = "6.1.tick_future"', async () => {
    const { MemorySink, SessionRecorder } = await import('../src/index.js');
    const w = mkWorld();
    const sink = new MemorySink();
    const recorder = new SessionRecorder<Events, Cmds>({ world: w, sink });
    recorder.connect();
    try {
      recorder.addMarker({
        kind: 'annotation',
        tick: w.tick + 1, // future tick (= 1; world.tick === 0 right after connect)
        text: 'should-throw',
        refs: { tickRange: { from: w.tick, to: w.tick } },
      });
      throw new Error('expected addMarker to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(MarkerValidationError);
      expect((e as MarkerValidationError).referencesValidationRule).toBe('6.1.tick_future');
    } finally {
      recorder.disconnect();
    }
  });

  it('explicit ctx.addMarker with input.tick === ctx.world.tick succeeds (= just-completed tick)', async () => {
    const w = mkWorld();
    const agent: AgentDriver<Events, Cmds> = {
      decide: (ctx) => {
        ctx.addMarker({
          kind: 'annotation',
          text: 'explicit-tick',
          tick: ctx.world.tick, // explicit, equal to default
          refs: { tickRange: { from: ctx.world.tick, to: ctx.world.tick } },
        });
        return [];
      },
    };
    const result = await runAgentPlaytest({ world: w, agent, maxTicks: 3 });
    expect(result.ok).toBe(true);
    expect(result.bundle.markers.map((m) => m.tick)).toEqual([0, 1, 2]);
  });

  it('regression: existing AgentDriver implementations that destructure { world, tick, startTick, tickIndex } continue to work', async () => {
    const w = mkWorld();
    const visitedTicks: number[] = [];
    const agent: AgentDriver<Events, Cmds> = {
      // Intentionally only destructure the v0.8.10 fields; verify v0.8.11
      // additions don't break this consumer.
      decide: ({ world, tick, startTick, tickIndex }) => {
        expect(world).toBeDefined();
        expect(typeof tick).toBe('number');
        expect(startTick).toBe(0);
        expect(typeof tickIndex).toBe('number');
        visitedTicks.push(tick);
        return [];
      },
    };
    const result = await runAgentPlaytest({ world: w, agent, maxTicks: 3 });
    expect(result.ok).toBe(true);
    expect(result.bundle.markers.length).toBe(0); // no markers emitted
    expect(visitedTicks).toEqual([1, 2, 3]); // ctx.tick = world.tick + 1
  });
});
