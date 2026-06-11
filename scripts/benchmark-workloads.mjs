// Occupancy + pathfinding benchmark workloads shared by the standard
// scenarios in rts-benchmark.mjs. Deterministic: count-based budgets,
// arithmetic placement, no wall-clock control flow (timings are observed,
// never branched on).

import { performance } from 'node:perf_hooks';
import {
  OccupancyBinding,
  OccupancyGrid,
  createGridPathQueue,
} from '../dist/index.js';
import { round } from './benchmark-gate.mjs';

export function createBenchmarkOccupancy(config) {
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

export function benchmarkPaths(config, occupancy) {
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

export function benchmarkOccupancy(config) {
  const binding = new OccupancyBinding(config.width, config.height);
  let nextEntityId = 1;

  const buildingTarget = Math.max(192, Math.floor(config.width / 2));
  const resourceTarget = buildingTarget * 2;
  const unitTarget = Math.max(1024, Math.floor(config.entities / 2));

  let buildings = 0;
  for (let y = 2; y < config.height - 2 && buildings < buildingTarget; y += 6) {
    for (let x = 2; x < config.width - 2 && buildings < buildingTarget; x += 6) {
      if (
        binding.occupy(
          nextEntityId++,
          { x, y, width: 2, height: 2 },
          { metadata: { kind: 'building' } },
        )
      ) {
        buildings++;
      }
    }
  }

  let resources = 0;
  for (let y = 1; y < config.height && resources < resourceTarget; y += 3) {
    const startX = y % 2 === 0 ? 1 : 3;
    for (let x = startX; x < config.width && resources < resourceTarget; x += 5) {
      if (binding.isBlocked(x, y, { includeReservations: false })) {
        continue;
      }
      if (
        binding.occupy(
          nextEntityId++,
          [{ x, y }],
          { metadata: { kind: 'resource' } },
        )
      ) {
        resources++;
      }
    }
  }

  let units = 0;
  const unitPlacements = [];
  for (let y = 0; y < config.height && units < unitTarget; y++) {
    for (let x = 0; x < config.width && units < unitTarget; x++) {
      if (binding.isBlocked(x, y, { includeReservations: false })) {
        continue;
      }
      for (let slot = 0; slot < 4 && units < unitTarget; slot++) {
        const entity = nextEntityId++;
        const placement = binding.occupySubcell(entity, { x, y }, {
          preferredSlot: slot,
          metadata: { kind: 'unit' },
        });
        if (!placement) {
          break;
        }
        unitPlacements.push({ entity, position: { x, y } });
        units++;
      }
    }
  }

  binding.resetMetrics();

  const queryCount = Math.min(
    unitPlacements.length,
    Math.max(512, Math.floor(unitTarget / 2)),
  );
  let blockedHits = 0;
  let crowdedClaimsObserved = 0;
  const start = performance.now();

  for (let i = 0; i < queryCount; i++) {
    const sample = unitPlacements[i % unitPlacements.length];
    const inspectX = (i * 17 + 3) % config.width;
    const inspectY = (i * 31 + 7) % config.height;

    if (binding.isBlocked(inspectX, inspectY)) {
      blockedHits++;
    }

    const status = binding.getCellStatus(inspectX, inspectY);
    crowdedClaimsObserved += status.crowdedBy.length;
    binding.neighborsWithSpace(sample.entity, sample.position);
  }

  const metrics = binding.getMetrics();
  return {
    buildings,
    resources,
    units,
    queryCount,
    blockedHits,
    crowdedClaimsObserved,
    durationMs: round(performance.now() - start),
    bindingQueries: {
      cellStatusQueries: metrics.cellStatusQueries,
      crowdedSlotChecks: metrics.crowdedSlotChecks,
    },
    occupancy: metrics.occupancy,
    crowding: metrics.crowding,
  };
}

export function processQueue(queue, requests, budget) {
  for (const request of requests) {
    queue.enqueue(request);
  }

  const start = performance.now();
  while (queue.pendingCount > 0) {
    queue.process(budget);
  }
  return performance.now() - start;
}

export function findOpenCell(occupancy, width, height, seed) {
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
