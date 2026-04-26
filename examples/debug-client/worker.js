import {
  OccupancyGrid,
  RenderAdapter,
  VisibilityMap,
  World,
  WorldDebugger,
  createGridPathQueue,
  createOccupancyDebugProbe,
  createPathQueueDebugProbe,
  createVisibilityDebugProbe,
} from '../../dist/index.js';

const GRID_WIDTH = 24;
const GRID_HEIGHT = 24;
const DEFAULT_TICK_MS = 180;
const VIEW_PLAYER = 'blue';
const TEAM_IDS = ['blue', 'red'];

const world = new World({
  gridWidth: GRID_WIDTH,
  gridHeight: GRID_HEIGHT,
  tps: 1000 / DEFAULT_TICK_MS,
  seed: 'debug-client',
});
const occupancy = new OccupancyGrid(GRID_WIDTH, GRID_HEIGHT);
const visibility = new VisibilityMap(GRID_WIDTH, GRID_HEIGHT);
const pathQueue = createGridPathQueue({
  width: GRID_WIDTH,
  height: GRID_HEIGHT,
  occupancy,
  allowDiagonal: true,
  preventCornerCutting: true,
  trackExplored: true,
});

const unitIds = new Set();
const buildingIds = new Set();
const pendingPathRequests = new Map();
const pendingByEntity = new Map();

let tickMs = DEFAULT_TICK_MS;
let running = true;
let loopHandle = null;

registerComponents();
registerWorldHooks();
seedScenario();
registerSystems();

const debuggerView = new WorldDebugger({
  world,
  probes: [
    createOccupancyDebugProbe('occupancy', occupancy),
    createVisibilityDebugProbe('visibility', visibility),
    createPathQueueDebugProbe('paths', pathQueue),
    {
      key: 'overlay',
      capture: captureOverlayDebug,
    },
  ],
});

const renderAdapter = new RenderAdapter({
  world,
  projector: {
    projectEntity: (ref, activeWorld) => projectEntity(ref, activeWorld),
    projectFrame: (activeWorld, diff) => ({
      tick: diff?.tick ?? activeWorld.tick,
      gridWidth: GRID_WIDTH,
      gridHeight: GRID_HEIGHT,
      running,
      tickMs,
      focusPlayer: VIEW_PLAYER,
    }),
  },
  debug: debuggerView,
  send: (message) => self.postMessage(message),
  onError: (error) => postStatus('error', `Render stream failed: ${formatError(error)}`),
});

self.addEventListener('message', (event) => {
  try {
    handleControl(event.data);
  } catch (error) {
    postStatus('error', formatError(error));
  }
});

self.addEventListener('error', (event) => {
  postStatus('error', event.message || 'Worker execution failed.');
});

renderAdapter.connect();
postStatus('info', 'Debug client ready.');
startLoop();

function registerComponents() {
  world.registerComponent('position');
  world.registerComponent('renderable');
  world.registerComponent('health');
  world.registerComponent('team');
  world.registerComponent('footprint');
  world.registerComponent('vision');
  world.registerComponent('moveTarget');
  world.registerComponent('movePath');
  world.registerComponent('wander');
}

function registerWorldHooks() {
  world.onDestroy((id, activeWorld) => {
    unitIds.delete(id);
    buildingIds.delete(id);
    occupancy.release(id);
    clearPendingForEntity(id);

    const team = activeWorld.getComponent(id, 'team');
    if (team) {
      visibility.removeSource(team.id, id);
    }
  });

  world.registerValidator('setMoveTarget', (command, activeWorld) => {
    if (!command || typeof command !== 'object') return false;
    if (!command.ref || !activeWorld.isCurrent(command.ref)) return false;
    const renderable = activeWorld.getComponent(command.ref.id, 'renderable');
    if (!renderable || renderable.kind !== 'unit') return false;
    return isGridCell(command.target);
  });

  world.registerHandler('setMoveTarget', (command) => {
    const result = applyMoveTarget(command.ref, command.target, 'command');
    if (!result.ok) {
      postStatus('warn', `Move target rejected: ${result.reason}.`);
    }
  });
}

function registerSystems() {
  world.registerSystem({
    name: 'syncOccupancy',
    phase: 'preUpdate',
    execute: () => syncOccupancyState(),
  });

  world.registerSystem({
    name: 'assignIdleTargets',
    phase: 'update',
    execute: () => {
      for (const id of sortedUnits()) {
        if (!world.isAlive(id)) continue;
        if (!world.getComponent(id, 'wander')) continue;
        if (world.getComponent(id, 'moveTarget')) continue;
        if (pendingByEntity.has(id)) continue;
        const movePath = world.getComponent(id, 'movePath');
        if (movePath && movePath.cells.length > 1) continue;
        assignRandomGoal(id, 'wander');
      }
    },
  });

  world.registerSystem({
    name: 'queuePaths',
    phase: 'update',
    execute: () => {
      for (const id of sortedUnits()) {
        if (!world.isAlive(id) || pendingByEntity.has(id)) continue;

        const position = world.getComponent(id, 'position');
        const moveTarget = world.getComponent(id, 'moveTarget');
        const footprint = world.getComponent(id, 'footprint');
        const ref = world.getEntityRef(id);
        if (!position || !moveTarget || !footprint || !ref) continue;

        if (position.x === moveTarget.x && position.y === moveTarget.y) {
          clearMovementState(id);
          continue;
        }

        const requestId = pathQueue.enqueue({
          start: { x: position.x, y: position.y },
          goal: { x: moveTarget.x, y: moveTarget.y },
          width: GRID_WIDTH,
          height: GRID_HEIGHT,
          occupancy,
          movingEntity: id,
          trackExplored: true,
        });
        pendingPathRequests.set(requestId, {
          ref,
          goalKey: pointKey(moveTarget),
        });
        pendingByEntity.set(id, requestId);
        world.emit('pathQueued', {
          entity: id,
          requestId,
          target: { x: moveTarget.x, y: moveTarget.y },
        });
      }
    },
  });

  world.registerSystem({
    name: 'resolvePaths',
    phase: 'update',
    execute: () => {
      const completed = pathQueue.process(6);
      for (const entry of completed) {
        const pending = pendingPathRequests.get(entry.id);
        pendingPathRequests.delete(entry.id);
        if (!pending) continue;

        pendingByEntity.delete(pending.ref.id);
        if (!world.isCurrent(pending.ref)) continue;

        const moveTarget = world.getComponent(pending.ref.id, 'moveTarget');
        if (!moveTarget || pointKey(moveTarget) !== pending.goalKey) {
          continue;
        }

        if (!entry.result || entry.result.path.length <= 1) {
          world.removeComponent(pending.ref.id, 'movePath');
          world.removeComponent(pending.ref.id, 'moveTarget');
          world.emit('pathFailed', {
            entity: pending.ref.id,
            requestId: entry.id,
          });
          continue;
        }

        world.setComponent(pending.ref.id, 'movePath', {
          cells: entry.result.path,
          fromCache: entry.fromCache,
          explored: entry.result.explored ?? null,
        });
        world.emit('pathResolved', {
          entity: pending.ref.id,
          requestId: entry.id,
          length: entry.result.path.length,
          fromCache: entry.fromCache,
        });
      }
    },
  });

  world.registerSystem({
    name: 'moveUnits',
    phase: 'postUpdate',
    execute: () => {
      for (const id of sortedUnits()) {
        if (!world.isAlive(id)) continue;

        const movePath = world.getComponent(id, 'movePath');
        const footprint = world.getComponent(id, 'footprint');
        if (!movePath || movePath.cells.length <= 1 || !footprint) continue;

        const current = world.getComponent(id, 'position');
        const next = movePath.cells[1];
        if (!current || !next) continue;

        if (
          !occupancy.canOccupy(id, areaForFootprint(next, footprint), {
            includeReservations: true,
          })
        ) {
          world.removeComponent(id, 'movePath');
          world.emit('moveBlocked', {
            entity: id,
            next,
          });
          continue;
        }

        occupancy.release(id);
        world.setPosition(id, next);
        occupancy.occupy(id, areaForFootprint(next, footprint));

        movePath.cells = movePath.cells.slice(1);
        if (movePath.cells.length <= 1) {
          clearMovementState(id);
          world.emit('goalReached', {
            entity: id,
            position: next,
          });
        } else {
          world.setComponent(id, 'movePath', movePath);
          world.emit('unitMoved', {
            entity: id,
            position: next,
          });
        }
      }
    },
  });

  world.registerSystem({
    name: 'pulseHealth',
    phase: 'postUpdate',
    execute: () => {
      for (const id of sortedUnits()) {
        const health = world.getComponent(id, 'health');
        if (!health) continue;
        if ((world.tick + id) % 18 !== 0) continue;

        const direction = id % 2 === 0 ? 1 : -1;
        const next = clamp(health.current + direction, 4, health.max);
        if (next !== health.current) {
          world.setComponent(id, 'health', {
            current: next,
            max: health.max,
          });
          world.emit('healthPulse', {
            entity: id,
            current: next,
          });
        }
      }
    },
  });

  world.registerSystem({
    name: 'updateVisibility',
    phase: 'output',
    execute: () => {
      for (const id of [...unitIds, ...buildingIds].sort((a, b) => a - b)) {
        if (!world.isAlive(id)) continue;
        const position = world.getComponent(id, 'position');
        const team = world.getComponent(id, 'team');
        const vision = world.getComponent(id, 'vision');
        if (!position || !team || !vision) continue;
        visibility.setSource(team.id, id, {
          x: position.x,
          y: position.y,
          radius: vision.radius,
        });
      }
      visibility.update();
    },
  });
}

function seedScenario() {
  for (const area of [
    { x: 11, y: 1, width: 1, height: 7 },
    { x: 11, y: 12, width: 1, height: 11 },
    { x: 5, y: 8, width: 5, height: 1 },
    { x: 14, y: 15, width: 6, height: 1 },
    { x: 7, y: 17, width: 4, height: 2 },
    { x: 15, y: 5, width: 3, height: 2 },
  ]) {
    occupancy.block(area);
  }

  createBuilding({
    label: 'Blue Town Center',
    x: 2,
    y: 2,
    width: 3,
    height: 3,
    team: 'blue',
    hp: 60,
    vision: 6,
  });
  createBuilding({
    label: 'Red Fort',
    x: 18,
    y: 17,
    width: 3,
    height: 3,
    team: 'red',
    hp: 60,
    vision: 6,
  });

  createUnit({
    label: 'Blue Scout',
    x: 3,
    y: 6,
    team: 'blue',
    hp: 14,
    vision: 6,
    wander: { minX: 1, minY: 1, maxX: 20, maxY: 21 },
  });
  createUnit({
    label: 'Blue Villager',
    x: 5,
    y: 6,
    team: 'blue',
    hp: 12,
    vision: 5,
    wander: { minX: 1, minY: 2, maxX: 21, maxY: 20 },
  });
  createUnit({
    label: 'Blue Spearman',
    x: 6,
    y: 4,
    team: 'blue',
    hp: 16,
    vision: 5,
    wander: { minX: 2, minY: 1, maxX: 21, maxY: 20 },
  });
  createUnit({
    label: 'Red Scout',
    x: 18,
    y: 15,
    team: 'red',
    hp: 14,
    vision: 6,
    wander: { minX: 2, minY: 2, maxX: 22, maxY: 22 },
  });
  createUnit({
    label: 'Red Archer',
    x: 20,
    y: 15,
    team: 'red',
    hp: 12,
    vision: 5,
    wander: { minX: 3, minY: 2, maxX: 22, maxY: 22 },
  });
  createUnit({
    label: 'Red Guard',
    x: 21,
    y: 18,
    team: 'red',
    hp: 18,
    vision: 5,
    wander: { minX: 2, minY: 2, maxX: 22, maxY: 22 },
  });

  syncOccupancyState();
  visibility.update();

  for (const id of sortedUnits()) {
    assignRandomGoal(id, 'initial');
  }
}

function createBuilding(config) {
  const id = world.createEntity();
  buildingIds.add(id);
  world.setPosition(id, { x: config.x, y: config.y });
  world.addComponent(id, 'renderable', {
    kind: 'building',
    label: config.label,
  });
  world.addComponent(id, 'team', { id: config.team });
  world.addComponent(id, 'footprint', {
    width: config.width,
    height: config.height,
  });
  world.addComponent(id, 'health', {
    current: config.hp,
    max: config.hp,
  });
  world.addComponent(id, 'vision', { radius: config.vision });
  occupancy.occupy(
    id,
    areaForFootprint(
      { x: config.x, y: config.y },
      {
        width: config.width,
        height: config.height,
      },
    ),
  );
  visibility.setSource(config.team, id, {
    x: config.x,
    y: config.y,
    radius: config.vision,
  });
  return id;
}

function createUnit(config) {
  const id = world.createEntity();
  unitIds.add(id);
  world.setPosition(id, { x: config.x, y: config.y });
  world.addComponent(id, 'renderable', {
    kind: 'unit',
    label: config.label,
  });
  world.addComponent(id, 'team', { id: config.team });
  world.addComponent(id, 'footprint', { width: 1, height: 1 });
  world.addComponent(id, 'health', {
    current: config.hp,
    max: config.hp,
  });
  world.addComponent(id, 'vision', { radius: config.vision });
  world.addComponent(id, 'wander', config.wander);
  occupancy.occupy(id, { x: config.x, y: config.y, width: 1, height: 1 });
  visibility.setSource(config.team, id, {
    x: config.x,
    y: config.y,
    radius: config.vision,
  });
  return id;
}

function handleControl(message) {
  if (!message || typeof message !== 'object') return;

  switch (message.type) {
    case 'toggle-run':
      running = !running;
      if (running) {
        startLoop();
      } else {
        stopLoop();
      }
      postStatus('info', running ? 'Simulation resumed.' : 'Simulation paused.');
      sendSnapshot();
      break;
    case 'step':
      stepWorld();
      break;
    case 'snapshot':
      sendSnapshot();
      break;
    case 'set-tick-ms':
      if (!Number.isFinite(message.value)) return;
      tickMs = clamp(Math.round(message.value), 120, 420);
      if (running) {
        startLoop();
      }
      postStatus('info', `Tick interval set to ${tickMs} ms.`);
      sendSnapshot();
      break;
    case 'set-target':
      handleSetTarget(message);
      break;
    case 'randomize-goals':
      for (const id of sortedUnits()) {
        assignRandomGoal(id, 'shuffle');
      }
      postStatus(
        'info',
        running
          ? 'Queued fresh goals for all units.'
          : 'Queued fresh goals. Step or resume to process them.',
      );
      break;
    default:
      break;
  }
}

function handleSetTarget(message) {
  if (!message.ref || !isGridCell(message.target)) {
    postStatus('warn', 'Ignored invalid target command.');
    return;
  }
  const accepted = world.submit('setMoveTarget', {
    ref: message.ref,
    target: message.target,
  });
  if (!accepted) {
    postStatus('warn', 'Move target rejected for a stale or invalid entity.');
    return;
  }
  if (!running) {
    postStatus('info', 'Move target queued. Step or resume to process it.');
  }
}

function stepWorld() {
  try {
    world.step();
  } catch (error) {
    stopLoop();
    running = false;
    postStatus('error', formatError(error));
    sendSnapshot();
  }
}

function startLoop() {
  stopLoop();
  loopHandle = setInterval(() => {
    stepWorld();
  }, tickMs);
}

function stopLoop() {
  if (loopHandle !== null) {
    clearInterval(loopHandle);
    loopHandle = null;
  }
}

function sendSnapshot() {
  renderAdapter.disconnect();
  renderAdapter.connect();
}

function syncOccupancyState() {
  const entities = [...buildingIds, ...unitIds].sort((a, b) => a - b);
  for (const id of entities) {
    occupancy.release(id);
  }

  for (const id of [...buildingIds].sort((a, b) => a - b)) {
    if (!world.isAlive(id)) continue;
    const position = world.getComponent(id, 'position');
    const footprint = world.getComponent(id, 'footprint');
    if (!position || !footprint) continue;
    occupancy.occupy(id, areaForFootprint(position, footprint));
  }

  for (const id of sortedUnits()) {
    if (!world.isAlive(id)) continue;
    const position = world.getComponent(id, 'position');
    const footprint = world.getComponent(id, 'footprint');
    if (!position || !footprint) continue;
    occupancy.occupy(id, areaForFootprint(position, footprint));
  }

  for (const id of sortedUnits()) {
    if (!world.isAlive(id)) continue;
    const movePath = world.getComponent(id, 'movePath');
    const footprint = world.getComponent(id, 'footprint');
    if (!movePath || movePath.cells.length <= 1 || !footprint) continue;
    occupancy.reserve(id, areaForFootprint(movePath.cells[1], footprint));
  }
}

function assignRandomGoal(id, source) {
  const wander = world.getComponent(id, 'wander');
  const ref = world.getEntityRef(id);
  if (!wander || !ref) return false;

  const target = findOpenCellInBounds(id, wander, 36);
  if (!target) return false;
  const result = applyMoveTarget(ref, target, source);
  return result.ok;
}

function applyMoveTarget(ref, target, source) {
  if (!world.isCurrent(ref)) {
    return { ok: false, reason: 'stale-entity' };
  }

  const renderable = world.getComponent(ref.id, 'renderable');
  if (!renderable || renderable.kind !== 'unit') {
    return { ok: false, reason: 'not-a-unit' };
  }

  const footprint = world.getComponent(ref.id, 'footprint');
  if (!footprint) {
    return { ok: false, reason: 'missing-footprint' };
  }

  const resolvedTarget = findNearestOpenCell(ref.id, target, footprint);
  if (!resolvedTarget) {
    clearMovementState(ref.id);
    return { ok: false, reason: 'no-open-cell' };
  }

  const position = world.getComponent(ref.id, 'position');
  if (position && position.x === resolvedTarget.x && position.y === resolvedTarget.y) {
    clearMovementState(ref.id);
    return { ok: true, target: resolvedTarget };
  }

  clearPendingForEntity(ref.id);
  world.setComponent(ref.id, 'moveTarget', resolvedTarget);
  if (world.getComponent(ref.id, 'movePath')) {
    world.removeComponent(ref.id, 'movePath');
  }
  world.emit('goalAssigned', {
    entity: ref.id,
    target: resolvedTarget,
    source,
  });
  return { ok: true, target: resolvedTarget };
}

function clearMovementState(id) {
  clearPendingForEntity(id);
  if (world.getComponent(id, 'movePath')) {
    world.removeComponent(id, 'movePath');
  }
  if (world.getComponent(id, 'moveTarget')) {
    world.removeComponent(id, 'moveTarget');
  }
}

function clearPendingForEntity(id) {
  const requestId = pendingByEntity.get(id);
  if (requestId === undefined) return;
  pendingByEntity.delete(id);
  pendingPathRequests.delete(requestId);
}

function findOpenCellInBounds(entityId, bounds, attempts) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const x = bounds.minX + Math.floor(world.random() * (bounds.maxX - bounds.minX + 1));
    const y = bounds.minY + Math.floor(world.random() * (bounds.maxY - bounds.minY + 1));
    const cell = findNearestOpenCell(entityId, { x, y }, { width: 1, height: 1 }, bounds);
    if (cell) return cell;
  }

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const cell = findNearestOpenCell(entityId, { x, y }, { width: 1, height: 1 }, bounds);
      if (cell) return cell;
    }
  }
  return null;
}

function findNearestOpenCell(entityId, target, footprint, bounds) {
  const clamped = {
    x: clamp(target.x, bounds?.minX ?? 0, bounds?.maxX ?? GRID_WIDTH - footprint.width),
    y: clamp(target.y, bounds?.minY ?? 0, bounds?.maxY ?? GRID_HEIGHT - footprint.height),
  };

  const maxRadius = Math.max(GRID_WIDTH, GRID_HEIGHT);
  for (let radius = 0; radius <= maxRadius; radius++) {
    const candidates = [];
    for (let y = clamped.y - radius; y <= clamped.y + radius; y++) {
      for (let x = clamped.x - radius; x <= clamped.x + radius; x++) {
        if (Math.max(Math.abs(x - clamped.x), Math.abs(y - clamped.y)) !== radius) {
          continue;
        }
        if (!inBounds(x, y, footprint, bounds)) continue;
        candidates.push({ x, y });
      }
    }

    candidates.sort((a, b) => {
      const distanceA = Math.abs(a.x - clamped.x) + Math.abs(a.y - clamped.y);
      const distanceB = Math.abs(b.x - clamped.x) + Math.abs(b.y - clamped.y);
      if (distanceA !== distanceB) return distanceA - distanceB;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    for (const candidate of candidates) {
      if (
        occupancy.canOccupy(
          entityId,
          areaForFootprint(candidate, footprint),
          { includeReservations: true },
        )
      ) {
        return candidate;
      }
    }
  }
  return null;
}

function projectEntity(ref, activeWorld) {
  const position = activeWorld.getComponent(ref.id, 'position');
  const renderable = activeWorld.getComponent(ref.id, 'renderable');
  const health = activeWorld.getComponent(ref.id, 'health');
  const footprint = activeWorld.getComponent(ref.id, 'footprint');
  const team = activeWorld.getComponent(ref.id, 'team');
  if (!position || !renderable || !footprint || !team) return null;

  return {
    kind: renderable.kind,
    label: renderable.label,
    color: colorForTeam(team.id, renderable.kind),
    x: position.x,
    y: position.y,
    width: footprint.width,
    height: footprint.height,
    hp: health?.current ?? null,
    maxHp: health?.max ?? null,
    team: team.id,
    target: activeWorld.getComponent(ref.id, 'moveTarget') ?? null,
    visibility: visibilityStatusForEntity(ref.id, position, footprint),
  };
}

function visibilityStatusForEntity(entityId, position, footprint) {
  let explored = false;
  for (const cell of footprintCells(position, footprint)) {
    if (visibility.isVisible(VIEW_PLAYER, cell.x, cell.y)) {
      return 'visible';
    }
    explored ||= visibility.isExplored(VIEW_PLAYER, cell.x, cell.y);
  }
  return explored ? 'explored' : 'hidden';
}

function captureOverlayDebug() {
  const occupancyState = occupancy.getState();
  const visibilityState = visibility.getState();

  return {
    focusPlayer: VIEW_PLAYER,
    occupancy: {
      blocked: indexesToCells(occupancyState.blocked, occupancy.width),
      occupied: occupancyState.occupied.map(([entity, cells]) => ({
        entity,
        ref: world.getEntityRef(entity),
        cells: indexesToCells(cells, occupancy.width),
      })),
      reservations: occupancyState.reservations.map(([entity, cells]) => ({
        entity,
        ref: world.getEntityRef(entity),
        cells: indexesToCells(cells, occupancy.width),
      })),
    },
    visibility: {
      players: visibilityState.players.map(([playerId, player]) => ({
        playerId,
        sources: visibility.getSources(playerId),
        visible: visibility.getVisibleCells(playerId),
        explored: visibility.getExploredCells(playerId),
        sourceCount: player.sources.length,
      })),
    },
    paths: {
      queue: pathQueue.getStats(),
      pending: [...pendingPathRequests.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([requestId, pending]) => ({
          requestId,
          ref: pending.ref,
          goalKey: pending.goalKey,
        })),
      assigned: sortedUnits()
        .filter((id) => world.isAlive(id))
        .map((id) => ({
          entity: id,
          ref: world.getEntityRef(id),
          target: world.getComponent(id, 'moveTarget') ?? null,
          path: world.getComponent(id, 'movePath')?.cells ?? [],
        })),
    },
    entities: [...buildingIds, ...unitIds]
      .sort((a, b) => a - b)
      .filter((id) => world.isAlive(id))
      .map((id) => ({
        ref: world.getEntityRef(id),
        position: world.getComponent(id, 'position') ?? null,
        renderable: world.getComponent(id, 'renderable') ?? null,
        team: world.getComponent(id, 'team') ?? null,
        health: world.getComponent(id, 'health') ?? null,
        footprint: world.getComponent(id, 'footprint') ?? null,
        moveTarget: world.getComponent(id, 'moveTarget') ?? null,
        movePath: world.getComponent(id, 'movePath') ?? null,
        vision: world.getComponent(id, 'vision') ?? null,
        wander: world.getComponent(id, 'wander') ?? null,
      })),
  };
}

function sortedUnits() {
  return [...unitIds].sort((a, b) => a - b);
}

function indexesToCells(indexes, width) {
  return indexes.map((index) => ({
    x: index % width,
    y: Math.floor(index / width),
  }));
}

function footprintCells(position, footprint) {
  const cells = [];
  for (let y = position.y; y < position.y + footprint.height; y++) {
    for (let x = position.x; x < position.x + footprint.width; x++) {
      cells.push({ x, y });
    }
  }
  return cells;
}

function areaForFootprint(position, footprint) {
  return {
    x: position.x,
    y: position.y,
    width: footprint.width,
    height: footprint.height,
  };
}

function colorForTeam(teamId, kind) {
  if (teamId === 'blue') {
    return kind === 'building' ? '#2f8fb5' : '#58b7e8';
  }
  return kind === 'building' ? '#9e473b' : '#d86758';
}

function pointKey(point) {
  return `${point.x},${point.y}`;
}

function postStatus(level, message) {
  self.postMessage({
    type: 'status',
    data: {
      level,
      message,
      tick: world.tick,
    },
  });
}

function isGridCell(value) {
  return Boolean(
    value &&
      Number.isInteger(value.x) &&
      Number.isInteger(value.y) &&
      value.x >= 0 &&
      value.x < GRID_WIDTH &&
      value.y >= 0 &&
      value.y < GRID_HEIGHT,
  );
}

function inBounds(x, y, footprint, bounds) {
  if (x < 0 || y < 0) return false;
  if (x + footprint.width > GRID_WIDTH || y + footprint.height > GRID_HEIGHT) {
    return false;
  }
  if (!bounds) return true;
  return (
    x >= bounds.minX &&
    y >= bounds.minY &&
    x + footprint.width - 1 <= bounds.maxX &&
    y + footprint.height - 1 <= bounds.maxY
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
