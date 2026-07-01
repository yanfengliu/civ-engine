// RTS-scale benchmark + regression gate entry point. Scenario/run logic lives
// here; comparison, calibration, baseline schema, and markdown rendering live
// in ./benchmark-gate.mjs. Design: docs/threads/done/benchmark-gate/DESIGN.md.
//
// Tier-1 determinism invariants every scenario MUST keep (the gate's exact
// counters depend on them): no Math.random / Date.now / wall-clock control
// flow (budgets are counts), integer-only component data, seeded WorldConfig.

import { performance } from 'node:perf_hooks';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_VERSION, World } from '../dist/index.js';
import {
  BASELINE_SCHEMA_VERSION,
  DEFAULT_RATIO_MAX,
  checkReport,
  formatFailures,
  renderMarkdown,
  round,
  runCalibration,
  validateBaseline,
} from './benchmark-gate.mjs';
import {
  benchmarkOccupancy,
  benchmarkPaths,
  createBenchmarkOccupancy,
} from './benchmark-workloads.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = join(REPO_ROOT, 'benchmarks', 'baseline.json');
const MEASURED_RUNS = 3; // median for tier-2; identical-counter assert for tier-1

const CHURN = {
  width: 96, height: 96,
  baseEntities: 4_000,
  perTick: 150,
  ticks: 20,
  warmup: 3,
};

// Command/event/many-system tick load — the aoe2-shaped profile the occupancy
// and churn scenarios under-weight (surfaced 2026-06-30 when aoe2 reported a
// "sim-throughput regression" the gate never saw: a strict world driven by
// per-tick external commands + in-tick event emission across many querying
// systems over thousands of ticks). Guards the strict-gate, command-queue,
// event-dispatch, and multi-system-per-tick paths against a future per-tick
// regression. Deterministic: arithmetic placement, count-based budgets.
const COMMANDS = {
  width: 96, height: 96,
  entities: 800,
  querySystems: 12,
  perTickCommands: 80,
  ticks: 60,
  warmup: 3,
};

const args = parseArgs(process.argv.slice(2));
const scenarios = [
  { name: 'medium', kind: 'standard', width: 128, height: 128, entities: 1024, ticks: 20, pathRequests: 64, pathBudget: 16 },
  { name: 'large', kind: 'standard', width: 512, height: 512, entities: 10_240, ticks: 8, pathRequests: 128, pathBudget: 24 },
  { name: 'churn', kind: 'churn', width: CHURN.width, height: CHURN.height, entities: CHURN.baseEntities, ticks: CHURN.ticks },
  { name: 'commands', kind: 'commands', width: COMMANDS.width, height: COMMANDS.height, entities: COMMANDS.entities, ticks: COMMANDS.ticks },
];

if (args.stress) {
  scenarios.push({ name: 'stress', kind: 'standard', width: 1024, height: 1024, entities: 50_000, ticks: 4, pathRequests: 256, pathBudget: 32 });
}

main();

function main() {
  const calibrationMs = runCalibration();
  const results = scenarios.map((config) => measureScenario(config, calibrationMs));
  const report = { command: 'npm run benchmark:rts', format: args.format, calibrationMs: round(calibrationMs), scenarios: results };

  if (args.updateBaseline) {
    writeBaseline(report);
    process.stdout.write(`baseline written to ${BASELINE_PATH}\n`);
    return;
  }
  if (args.check) {
    runCheck(report);
    return;
  }
  process.stdout.write(args.format === 'markdown' ? renderMarkdown(report) : `${JSON.stringify(report, null, 2)}\n`);
}

/** Run a scenario MEASURED_RUNS times: median wall time for tier 2, and an
 *  identical-counters assertion across runs (free determinism self-check). */
function measureScenario(config, calibrationMs) {
  const runs = [];
  for (let i = 0; i < MEASURED_RUNS; i++) {
    const start = performance.now();
    const result =
      config.kind === 'churn' ? runChurnScenario(config)
      : config.kind === 'commands' ? runCommandScenario(config)
      : runScenario(config);
    result.wallMs = performance.now() - start;
    runs.push(result);
  }
  const first = JSON.stringify(runs[0].counters);
  for (let i = 1; i < runs.length; i++) {
    if (JSON.stringify(runs[i].counters) !== first) {
      throw new Error(
        `determinism violation in scenario '${config.name}': run 0 counters ${first} != run ${i} counters ${JSON.stringify(runs[i].counters)}`,
      );
    }
  }
  const sorted = runs.map((r) => r.wallMs).sort((a, b) => a - b);
  const medianWall = sorted[Math.floor(sorted.length / 2)];
  const chosen = runs[0];
  chosen.timeRatio = round(medianWall / calibrationMs);
  delete chosen.wallMs;
  return chosen;
}

function runScenario(config) {
  const memoryBefore = process.memoryUsage().heapUsed;
  const world = createBenchmarkWorld(config);

  for (let i = 0; i < 3; i++) world.step();

  const tickDurations = [];
  const queryHits = [];
  const queryMisses = [];
  const explicitSyncs = [];
  const diffSizes = [];
  const sums = { calls: 0, results: 0, cacheHits: 0, cacheMisses: 0, membershipChecks: 0, explicitSyncs: 0, diffBytes: 0 };

  for (let i = 0; i < config.ticks; i++) {
    world.step();
    const metrics = world.getMetrics();
    const diff = world.getDiff();
    const diffBytes = Buffer.byteLength(JSON.stringify(diff), 'utf8');
    tickDurations.push(metrics.durationMs.total);
    queryHits.push(metrics.query.cacheHits);
    queryMisses.push(metrics.query.cacheMisses);
    explicitSyncs.push(metrics.spatial.explicitSyncs);
    diffSizes.push(diffBytes);
    sums.calls += metrics.query.calls;
    sums.results += metrics.query.results;
    sums.cacheHits += metrics.query.cacheHits;
    sums.cacheMisses += metrics.query.cacheMisses;
    sums.membershipChecks += metrics.query.membershipChecks;
    sums.explicitSyncs += metrics.spatial.explicitSyncs;
    sums.diffBytes += diffBytes;
  }

  const occupancy = createBenchmarkOccupancy(config);
  const pathfinding = benchmarkPaths(config, occupancy);
  const occupancyCosts = benchmarkOccupancy(config);
  const memoryAfter = process.memoryUsage().heapUsed;

  const counters = {
    queryCalls: sums.calls,
    queryResults: sums.results,
    queryCacheHits: sums.cacheHits,
    queryCacheMisses: sums.cacheMisses,
    membershipChecks: sums.membershipChecks,
    explicitSyncs: sums.explicitSyncs,
    diffBytes: sums.diffBytes,
    pathCacheHitsSecondPass: pathfinding.cacheHitsSecondPass,
    pathCacheMissesSecondPass: pathfinding.cacheMissesSecondPass,
    occupancyBuildings: occupancyCosts.buildings,
    occupancyResources: occupancyCosts.resources,
    occupancyUnits: occupancyCosts.units,
    occupancyBlockedHits: occupancyCosts.blockedHits,
    occupancyCrowdedClaims: occupancyCosts.crowdedClaimsObserved,
    occupancyCellStatusQueries: occupancyCosts.bindingQueries.cellStatusQueries,
    occupancyCrowdedSlotChecks: occupancyCosts.bindingQueries.crowdedSlotChecks,
    occupancyBlockedQueries: occupancyCosts.occupancy.blockedQueries,
    occupancyClaimCellChecks: occupancyCosts.occupancy.claimCellChecks,
    subcellSlotChecks: occupancyCosts.crowding?.slotChecks ?? 0,
  };

  return {
    name: config.name,
    grid: { width: config.width, height: config.height },
    entities: config.entities,
    ticksMeasured: config.ticks,
    tickDurationMs: summarize(tickDurations),
    queryCacheHits: summarize(queryHits),
    queryCacheMisses: summarize(queryMisses),
    spatialExplicitSyncs: summarize(explicitSyncs),
    diffSizeBytes: summarize(diffSizes),
    counters,
    pathfinding,
    occupancyCosts,
    memory: {
      beforeMB: round(memoryBefore / (1024 * 1024)),
      afterMB: round(memoryAfter / (1024 * 1024)),
      deltaMB: round((memoryAfter - memoryBefore) / (1024 * 1024)),
    },
  };
}

/** Churn scenario (DESIGN §2): spawn/destroy waves under 8 populated cached
 *  query shapes — measures query-cache membership maintenance, the first
 *  RTS-scale wall identified by the 2026-06-10 full review. */
function runChurnScenario(config) {
  const markers = ['infantry', 'archer', 'cavalry', 'siege'];
  const world = new World({ gridWidth: config.width, gridHeight: config.height, tps: 20, seed: 'bench:churn' });
  for (const key of ['position', 'velocity', 'team', ...markers, 'projectile']) {
    world.registerComponent(key);
  }
  for (let i = 0; i < config.entities; i++) {
    const id = world.createEntity();
    world.setPosition(id, { x: (i * 37) % config.width, y: (i * 53) % config.height });
    world.addComponent(id, 'velocity', { dx: (i % 3) - 1 || 1, dy: ((i + 1) % 3) - 1 || -1 });
    world.addComponent(id, 'team', { team: i % 4 });
    world.addComponent(id, markers[i % markers.length], { tier: i % 3 });
  }

  // The 8 pinned cached shapes (movement, 4 markers, team, bare position,
  // projectile) — iterated every tick so their cache arrays stay populated
  // and every churned entity's signature change splices them.
  let checksum = 0;
  world.registerSystem({
    name: 'shapes', phase: 'update',
    execute: (w) => {
      for (const id of w.query('position', 'velocity')) checksum += id;
      for (const m of markers) for (const id of w.query('position', m)) checksum += id;
      for (const id of w.query('position', 'team')) checksum += id;
      for (const id of w.query('position')) checksum += id;
      for (const id of w.query('position', 'projectile')) checksum += id;
      if (checksum < 0) throw new Error('unreachable checksum guard');
    },
  });

  const cohorts = [];
  let created = 0;
  let destroyed = 0;
  let spawnSerial = 0;
  world.registerSystem({
    name: 'churn', phase: 'postUpdate',
    execute: (w) => {
      if (cohorts.length >= 2) {
        for (const id of cohorts.shift()) {
          w.destroyEntity(id);
          destroyed++;
        }
      }
      const cohort = [];
      for (let i = 0; i < CHURN.perTick; i++) {
        const id = w.createEntity();
        const n = spawnSerial++;
        w.setPosition(id, { x: (n * 7) % config.width, y: (n * 11) % config.height });
        w.addComponent(id, 'velocity', { dx: 1, dy: 0 });
        w.addComponent(id, 'projectile', { ttl: 2 });
        cohort.push(id);
        created++;
      }
      cohorts.push(cohort);
    },
  });

  for (let i = 0; i < CHURN.warmup; i++) world.step();
  created = 0;
  destroyed = 0;

  const tickDurations = [];
  const sums = { calls: 0, results: 0, cacheHits: 0, cacheMisses: 0, membershipChecks: 0, explicitSyncs: 0, diffBytes: 0 };
  for (let i = 0; i < config.ticks; i++) {
    world.step();
    const metrics = world.getMetrics();
    const diffBytes = Buffer.byteLength(JSON.stringify(world.getDiff()), 'utf8');
    tickDurations.push(metrics.durationMs.total);
    sums.calls += metrics.query.calls;
    sums.results += metrics.query.results;
    sums.cacheHits += metrics.query.cacheHits;
    sums.cacheMisses += metrics.query.cacheMisses;
    sums.membershipChecks += metrics.query.membershipChecks;
    sums.explicitSyncs += metrics.spatial.explicitSyncs;
    sums.diffBytes += diffBytes;
  }

  return {
    name: config.name,
    grid: { width: config.width, height: config.height },
    entities: config.entities,
    ticksMeasured: config.ticks,
    tickDurationMs: summarize(tickDurations),
    churn: { created, destroyed, perTick: CHURN.perTick, cachedShapes: 8 },
    counters: {
      queryCalls: sums.calls,
      queryResults: sums.results,
      queryCacheHits: sums.cacheHits,
      queryCacheMisses: sums.cacheMisses,
      membershipChecks: sums.membershipChecks,
      explicitSyncs: sums.explicitSyncs,
      diffBytes: sums.diffBytes,
      churnCreated: created,
      churnDestroyed: destroyed,
    },
  };
}

/** Command/event/many-system scenario (COMMANDS): a STRICT world driven by
 *  per-tick external commands (validated, accepted + rejected branches) whose
 *  handlers mutate + emit, plus many querying systems and two in-tick writers/
 *  emitters, over dozens of ticks. Exercises the strict mutation-gate, the
 *  command queue, event dispatch, and multi-system-per-tick execution — the
 *  aoe2-shaped load the occupancy/churn scenarios under-weight. Deterministic:
 *  arithmetic ids/moves, count-based budgets, no wall-clock control flow. */
function runCommandScenario(config) {
  const roles = ['infantry', 'archer', 'cavalry', 'siege'];
  const phases = ['input', 'preUpdate', 'update', 'postUpdate', 'output'];
  const world = new World({
    gridWidth: config.width,
    gridHeight: config.height,
    tps: 20,
    seed: 'bench:commands',
    strict: true,
  });
  for (const key of ['position', 'velocity', 'health', 'team', ...roles]) {
    world.registerComponent(key);
  }

  // External command surface: a validator rejecting the no-op subset (exercises
  // the reject branch) and handlers that mutate + emit inside the tick phase.
  // `moveHandlerRuns` is an exact tier-1 counter that proves the accepted `move`
  // handler actually RAN and mutated — a regression that drops/no-ops handler
  // execution would zero it and fail the gate (a faster no-op can't hide behind
  // the time-only tier-2 ratio).
  let moveHandlerRuns = 0;
  world.registerValidator('move', (data) =>
    data.dx === 0 && data.dy === 0 ? { code: 'noop', message: 'zero move' } : true,
  );
  world.registerHandler('move', (data, w) => {
    const pos = w.getComponent(data.id, 'position');
    if (!pos) return;
    w.setPosition(data.id, {
      x: (pos.x + data.dx + config.width) % config.width,
      y: (pos.y + data.dy + config.height) % config.height,
    });
    moveHandlerRuns++;
  });
  world.registerHandler('damage', (data, w) => {
    const health = w.getComponent(data.id, 'health');
    if (!health) return;
    const next = health.hp - data.amount;
    const hp = next <= 0 ? 40 + (data.id % 20) : next; // deterministic respawn HP
    w.setComponent(data.id, 'health', { hp });
    w.emit('damaged', { id: data.id, hp });
  });

  // In-tick event listener (aoe2 combat/econ event fan-in).
  let eventsHandled = 0;
  world.on('damaged', () => { eventsHandled++; });

  for (let i = 0; i < config.entities; i++) {
    const id = world.createEntity();
    world.setPosition(id, { x: (i * 37) % config.width, y: (i * 53) % config.height });
    world.addComponent(id, 'velocity', { dx: (i % 3) - 1 || 1, dy: ((i + 1) % 3) - 1 || -1 });
    world.addComponent(id, 'health', { hp: 40 + (i % 20) });
    world.addComponent(id, 'team', { team: i % 4 });
    world.addComponent(id, roles[i % roles.length], { tier: i % 3 });
  }

  // Many querying systems spread across all five phases (aoe2 runs ~20).
  let checksum = 0;
  for (let s = 0; s < COMMANDS.querySystems; s++) {
    const role = roles[s % roles.length];
    world.registerSystem({
      name: `query-${s}`, phase: phases[s % phases.length],
      execute: (w) => {
        for (const id of w.query('position', role)) checksum += id;
        for (const id of w.query('position', 'team')) checksum += id % 7;
        if (checksum < 0) throw new Error('unreachable checksum guard');
      },
    });
  }
  // Movement writer — in-tick setPosition under strict.
  world.registerSystem({
    name: 'movement', phase: 'update',
    execute: (w) => {
      for (const id of w.query('position', 'velocity')) {
        const p = w.getComponent(id, 'position');
        const v = w.getComponent(id, 'velocity');
        w.setPosition(id, {
          x: (p.x + v.dx + config.width) % config.width,
          y: (p.y + v.dy + config.height) % config.height,
        });
      }
    },
  });
  // Combat emitter — in-tick emit under strict on every 4th entity.
  world.registerSystem({
    name: 'combat', phase: 'postUpdate',
    execute: (w) => {
      for (const id of w.query('position', 'health')) {
        if ((id & 3) === 0) w.emit('damaged', { id, hp: 0 });
      }
    },
  });

  for (let i = 0; i < COMMANDS.warmup; i++) world.step();

  let commandsAccepted = 0;
  let commandsRejected = 0;
  let commandsProcessed = 0;
  const tickDurations = [];
  const sums = { calls: 0, results: 0, cacheHits: 0, cacheMisses: 0, membershipChecks: 0 };
  for (let t = 0; t < config.ticks; t++) {
    for (let k = 0; k < COMMANDS.perTickCommands; k++) {
      // ids are 0-based (EntityManager.create() starts at 0), so target 0..entities-1.
      const id = ((t * COMMANDS.perTickCommands + k) * 7) % config.entities;
      // Every 5th command is a deterministic no-op (validator rejects it).
      const noop = k % 5 === 0;
      const dx = noop ? 0 : (k % 3) - 1 || 1;
      const dy = noop ? 0 : ((k + 1) % 3) - 1 || -1;
      if (world.submit('move', { id, dx, dy })) commandsAccepted++;
      else commandsRejected++;
      world.submit('damage', { id, amount: 5 });
    }
    world.step();
    const metrics = world.getMetrics();
    tickDurations.push(metrics.durationMs.total);
    commandsProcessed += metrics.commandStats.processed;
    sums.calls += metrics.query.calls;
    sums.results += metrics.query.results;
    sums.cacheHits += metrics.query.cacheHits;
    sums.cacheMisses += metrics.query.cacheMisses;
    sums.membershipChecks += metrics.query.membershipChecks;
  }

  return {
    name: config.name,
    grid: { width: config.width, height: config.height },
    entities: config.entities,
    ticksMeasured: config.ticks,
    strict: true,
    systems: COMMANDS.querySystems + 2,
    tickDurationMs: summarize(tickDurations),
    // Per tick: `perTickMoves` move submissions (accept + reject) + the same
    // count of always-accepted `damage` submissions.
    commands: {
      accepted: commandsAccepted,
      rejected: commandsRejected,
      processed: commandsProcessed,
      perTickMoves: COMMANDS.perTickCommands,
    },
    counters: {
      queryCalls: sums.calls,
      queryResults: sums.results,
      queryCacheHits: sums.cacheHits,
      queryCacheMisses: sums.cacheMisses,
      membershipChecks: sums.membershipChecks,
      commandsAccepted,
      commandsRejected,
      commandsProcessed, // engine-side: proves queued handlers executed
      moveHandlerRuns, // handler-side: proves accepted move handlers ran + mutated
      eventsHandled,
    },
  };
}

function runCheck(report) {
  let baselineRaw;
  try {
    baselineRaw = JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'));
  } catch (e) {
    process.stderr.write(`cannot read baseline at ${BASELINE_PATH}: ${e.message}\nrun: npm run benchmark:update-baseline\n`);
    process.exit(1);
  }
  const valid = validateBaseline(baselineRaw);
  if (!valid.ok) {
    process.stderr.write(`baseline invalid:\n${valid.errors.map((x) => `  - ${x}`).join('\n')}\n`);
    process.exit(1);
  }
  let ratioMax = DEFAULT_RATIO_MAX;
  if (process.env.BENCH_RATIO_MAX !== undefined) {
    ratioMax = Number(process.env.BENCH_RATIO_MAX);
    if (!Number.isFinite(ratioMax) || ratioMax <= 0) {
      process.stderr.write(`BENCH_RATIO_MAX must be a finite positive number (got ${process.env.BENCH_RATIO_MAX}); a malformed value would silently disable the time gate\n`);
      process.exit(1);
    }
  }
  const result = checkReport(baselineRaw, report, { ratioMax });
  for (const scenario of report.scenarios) {
    const base = baselineRaw.scenarios[scenario.name];
    process.stdout.write(`${scenario.name}: timeRatio ${scenario.timeRatio} (baseline ${base ? base.timeRatio : 'n/a'}, allowed ×${ratioMax})\n`);
  }
  if (!result.ok) {
    process.stderr.write(`BENCHMARK GATE FAILED (${result.failures.length} failure(s)):\n`);
    for (const line of formatFailures(result.failures)) {
      process.stderr.write(`  - ${line}\n`);
    }
    process.exit(1);
  }
  process.stdout.write('benchmark gate OK: all counters exact, time ratios within bound\n');
}

function writeBaseline(report) {
  const baseline = {
    schemaVersion: BASELINE_SCHEMA_VERSION,
    generatedWith: {
      engineVersion: ENGINE_VERSION,
      node: process.version,
      date: new Date().toISOString().slice(0, 10),
    },
    scenarios: Object.fromEntries(
      report.scenarios.map((s) => [s.name, { counters: s.counters, timeRatio: s.timeRatio }]),
    ),
  };
  mkdirSync(dirname(BASELINE_PATH), { recursive: true });
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
}

function createBenchmarkWorld(config) {
  const world = new World({
    gridWidth: config.width,
    gridHeight: config.height,
    tps: 20,
    seed: `bench:${config.name}`,
  });

  world.registerComponent('position');
  world.registerComponent('velocity');
  world.registerComponent('team');

  for (let i = 0; i < config.entities; i++) {
    const id = world.createEntity();
    const x = (i * 37) % config.width;
    const y = (i * 53) % config.height;
    world.setPosition(id, { x, y });
    world.addComponent(id, 'velocity', {
      dx: (i % 3) - 1 || 1,
      dy: ((i + 1) % 3) - 1 || -1,
    });
    world.addComponent(id, 'team', { team: i % 4 });
  }

  world.registerSystem({
    name: 'Movement',
    phase: 'update',
    execute: (w) => {
      for (const id of w.query('position', 'velocity')) {
        const position = w.getComponent(id, 'position');
        const velocity = w.getComponent(id, 'velocity');
        w.setPosition(id, {
          x: (position.x + velocity.dx + config.width) % config.width,
          y: (position.y + velocity.dy + config.height) % config.height,
        });
      }
    },
  });

  world.registerSystem({
    name: 'ScanTeams',
    phase: 'postUpdate',
    execute: (w) => {
      let checksum = 0;
      for (const id of w.query('position', 'team')) {
        checksum += w.getComponent(id, 'team').team;
      }
      if (checksum < 0) {
        throw new Error('Unreachable checksum guard');
      }
    },
  });

  return world;
}

function summarize(values) {
  return {
    min: round(Math.min(...values)),
    avg: round(values.reduce((sum, value) => sum + value, 0) / values.length),
    max: round(Math.max(...values)),
  };
}

function parseArgs(argv) {
  let format = 'json';
  let stress = false;
  let check = false;
  let updateBaseline = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--stress') { stress = true; continue; }
    if (arg === '--check') { check = true; continue; }
    if (arg === '--update-baseline') { updateBaseline = true; continue; }
    if (arg === '--format' && i + 1 < argv.length) { format = argv[++i]; continue; }
    if (arg.startsWith('--format=')) { format = arg.slice('--format='.length); }
  }

  if (format !== 'json' && format !== 'markdown') {
    throw new Error("format must be 'json' or 'markdown'");
  }
  if ((check || updateBaseline) && stress) {
    throw new Error('--check/--update-baseline cover the default scenario set; --stress is not part of the committed baseline');
  }
  if (check && updateBaseline) {
    throw new Error('--check and --update-baseline are mutually exclusive');
  }

  return { format, stress, check, updateBaseline };
}
