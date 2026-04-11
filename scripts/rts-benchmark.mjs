import { performance } from 'node:perf_hooks';
import {
  OccupancyGrid,
  World,
  createGridPathQueue,
} from '../dist/index.js';

const args = parseArgs(process.argv.slice(2));
const scenarios = [
  {
    name: 'medium',
    width: 128,
    height: 128,
    entities: 1024,
    ticks: 20,
    pathRequests: 64,
    pathBudget: 16,
  },
  {
    name: 'large',
    width: 512,
    height: 512,
    entities: 10_240,
    ticks: 8,
    pathRequests: 128,
    pathBudget: 24,
  },
];

if (args.stress) {
  scenarios.push({
    name: 'stress',
    width: 1024,
    height: 1024,
    entities: 50_000,
    ticks: 4,
    pathRequests: 256,
    pathBudget: 32,
  });
}

const report = {
  command: 'npm run benchmark:rts',
  format: args.format,
  scenarios: scenarios.map(runScenario),
};

if (args.format === 'markdown') {
  process.stdout.write(renderMarkdown(report));
} else {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function runScenario(config) {
  const memoryBefore = process.memoryUsage().heapUsed;
  const world = createBenchmarkWorld(config);

  for (let i = 0; i < 3; i++) {
    world.step();
  }

  const tickDurations = [];
  const queryHits = [];
  const queryMisses = [];
  const spatialFullScans = [];
  const spatialScannedEntities = [];
  const diffSizes = [];

  for (let i = 0; i < config.ticks; i++) {
    world.step();
    const metrics = world.getMetrics();
    const diff = world.getDiff();
    tickDurations.push(metrics.durationMs.total);
    queryHits.push(metrics.query.cacheHits);
    queryMisses.push(metrics.query.cacheMisses);
    spatialFullScans.push(metrics.spatial.fullScans);
    spatialScannedEntities.push(metrics.spatial.scannedEntities);
    diffSizes.push(Buffer.byteLength(JSON.stringify(diff), 'utf8'));
  }

  const occupancy = createBenchmarkOccupancy(config);
  const pathfinding = benchmarkPaths(config, occupancy);
  const memoryAfter = process.memoryUsage().heapUsed;

  return {
    name: config.name,
    grid: { width: config.width, height: config.height },
    entities: config.entities,
    ticksMeasured: config.ticks,
    tickDurationMs: summarize(tickDurations),
    queryCacheHits: summarize(queryHits),
    queryCacheMisses: summarize(queryMisses),
    spatialFullScans: summarize(spatialFullScans),
    spatialScannedEntities: summarize(spatialScannedEntities),
    diffSizeBytes: summarize(diffSizes),
    pathfinding,
    memory: {
      beforeMB: round(memoryBefore / (1024 * 1024)),
      afterMB: round(memoryAfter / (1024 * 1024)),
      deltaMB: round((memoryAfter - memoryBefore) / (1024 * 1024)),
    },
  };
}

function createBenchmarkWorld(config) {
  const world = new World({
    gridWidth: config.width,
    gridHeight: config.height,
    tps: 20,
    seed: `bench:${config.name}`,
    detectInPlacePositionMutations: false,
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

function createBenchmarkOccupancy(config) {
  const occupancy = new OccupancyGrid(config.width, config.height);
  const spacing = Math.max(8, Math.floor(config.width / 24));

  for (let x = spacing; x < config.width; x += spacing) {
    for (let y = 0; y < config.height; y++) {
      if (y % 11 === 0) continue;
      occupancy.block([{ x, y }]);
    }
  }

  for (let i = 0; i < Math.min(256, config.pathRequests); i++) {
    const x = (i * 29 + 7) % config.width;
    const y = (i * 31 + 5) % config.height;
    if (!occupancy.isBlocked(x, y, { includeReservations: false })) {
      occupancy.reserve(10_000 + i, [{ x, y }]);
    }
  }

  return occupancy;
}

function benchmarkPaths(config, occupancy) {
  const queue = createGridPathQueue({ occupancy });
  const requests = [];

  for (let i = 0; i < config.pathRequests; i++) {
    requests.push({
      start: findOpenCell(occupancy, config.width, config.height, i * 17),
      goal: findOpenCell(
        occupancy,
        config.width,
        config.height,
        config.width * config.height - 1 - i * 19,
      ),
    });
  }

  const uncachedMs = processQueue(queue, requests, config.pathBudget);
  const afterFirst = queue.getStats();
  const cachedMs = processQueue(queue, requests, config.pathBudget);
  const afterSecond = queue.getStats();

  return {
    requests: config.pathRequests,
    budgetPerProcessCall: config.pathBudget,
    uncachedDurationMs: round(uncachedMs),
    cachedDurationMs: round(cachedMs),
    uncachedMsPerRequest: round(uncachedMs / config.pathRequests),
    cachedMsPerRequest: round(cachedMs / config.pathRequests),
    cacheHitsSecondPass: afterSecond.cacheHits - afterFirst.cacheHits,
    cacheMissesSecondPass: afterSecond.cacheMisses - afterFirst.cacheMisses,
  };
}

function processQueue(queue, requests, budget) {
  for (const request of requests) {
    queue.enqueue(request);
  }

  const start = performance.now();
  while (queue.pendingCount > 0) {
    queue.process(budget);
  }
  return performance.now() - start;
}

function findOpenCell(occupancy, width, height, seed) {
  const total = width * height;
  for (let i = 0; i < total; i++) {
    const index = (seed + i * 97) % total;
    const x = index % width;
    const y = Math.floor(index / width);
    if (!occupancy.isBlocked(x, y)) {
      return { x, y };
    }
  }
  throw new Error('No open cell available for benchmark path request');
}

function summarize(values) {
  return {
    min: round(Math.min(...values)),
    avg: round(values.reduce((sum, value) => sum + value, 0) / values.length),
    max: round(Math.max(...values)),
  };
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function parseArgs(argv) {
  let format = 'json';
  let stress = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--stress') {
      stress = true;
      continue;
    }
    if (arg === '--format' && i + 1 < argv.length) {
      format = argv[++i];
      continue;
    }
    if (arg.startsWith('--format=')) {
      format = arg.slice('--format='.length);
    }
  }

  if (format !== 'json' && format !== 'markdown') {
    throw new Error("format must be 'json' or 'markdown'");
  }

  return { format, stress };
}

function renderMarkdown(report) {
  const lines = ['# RTS Benchmark', '', 'Command: `npm run benchmark:rts`', ''];
  for (const scenario of report.scenarios) {
    lines.push(`## ${scenario.name}`);
    lines.push('');
    lines.push(
      `- Grid: ${scenario.grid.width}x${scenario.grid.height}, entities: ${scenario.entities}, ticks: ${scenario.ticksMeasured}`,
    );
    lines.push(
      `- Tick duration ms (min/avg/max): ${scenario.tickDurationMs.min} / ${scenario.tickDurationMs.avg} / ${scenario.tickDurationMs.max}`,
    );
    lines.push(
      `- Query cache hits (min/avg/max): ${scenario.queryCacheHits.min} / ${scenario.queryCacheHits.avg} / ${scenario.queryCacheHits.max}`,
    );
    lines.push(
      `- Query cache misses (min/avg/max): ${scenario.queryCacheMisses.min} / ${scenario.queryCacheMisses.avg} / ${scenario.queryCacheMisses.max}`,
    );
    lines.push(
      `- Spatial full scans (min/avg/max): ${scenario.spatialFullScans.min} / ${scenario.spatialFullScans.avg} / ${scenario.spatialFullScans.max}`,
    );
    lines.push(
      `- Spatial scanned entities (min/avg/max): ${scenario.spatialScannedEntities.min} / ${scenario.spatialScannedEntities.avg} / ${scenario.spatialScannedEntities.max}`,
    );
    lines.push(
      `- Diff size bytes (min/avg/max): ${scenario.diffSizeBytes.min} / ${scenario.diffSizeBytes.avg} / ${scenario.diffSizeBytes.max}`,
    );
    lines.push(
      `- Path requests: ${scenario.pathfinding.requests}, uncached ms/request: ${scenario.pathfinding.uncachedMsPerRequest}, cached ms/request: ${scenario.pathfinding.cachedMsPerRequest}`,
    );
    lines.push(
      `- Path cache hits on second pass: ${scenario.pathfinding.cacheHitsSecondPass}`,
    );
    lines.push(`- Memory delta MB: ${scenario.memory.deltaMB}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}
