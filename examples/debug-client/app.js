const canvas = document.getElementById('viewport');
const context = canvas.getContext('2d');
const statusBanner = document.getElementById('status-banner');
const frameSummary = document.getElementById('frame-summary');
const selectionJson = document.getElementById('selection-json');
const warningList = document.getElementById('warning-list');
const diffSummary = document.getElementById('diff-summary');
const metricsSummary = document.getElementById('metrics-summary');
const eventSummary = document.getElementById('event-summary');
const probeSummary = document.getElementById('probe-summary');
const rawDebug = document.getElementById('raw-debug');

const runButton = document.getElementById('toggle-run');
const stepButton = document.getElementById('step');
const snapshotButton = document.getElementById('snapshot');
const randomizeButton = document.getElementById('randomize');
const tickRateInput = document.getElementById('tick-rate');
const tickRateValue = document.getElementById('tick-rate-value');

const state = {
  frame: {
    tick: 0,
    gridWidth: 24,
    gridHeight: 24,
    running: false,
    tickMs: 180,
    focusPlayer: 'blue',
  },
  entities: new Map(),
  debug: null,
  lastDiff: null,
  selectedKey: null,
  hoverCell: null,
  options: {
    showGrid: true,
    showFog: true,
    showOccupancy: true,
    showReservations: true,
    showPaths: true,
    showHidden: false,
  },
};

const worker = new Worker(new URL('./worker.js', import.meta.url), {
  type: 'module',
});

worker.addEventListener('message', (event) => {
  const message = event.data;
  switch (message?.type) {
    case 'renderSnapshot':
      applyRenderSnapshot(message.data);
      break;
    case 'renderTick':
      applyRenderTick(message.data);
      break;
    case 'status':
      setStatus(message.data.level, `${message.data.message} (tick ${message.data.tick})`);
      break;
    default:
      break;
  }
});

worker.addEventListener('error', (event) => {
  setStatus('error', event.message || 'Worker failed.');
});

runButton.addEventListener('click', () => {
  worker.postMessage({ type: 'toggle-run' });
});
stepButton.addEventListener('click', () => {
  worker.postMessage({ type: 'step' });
});
snapshotButton.addEventListener('click', () => {
  worker.postMessage({ type: 'snapshot' });
});
randomizeButton.addEventListener('click', () => {
  worker.postMessage({ type: 'randomize-goals' });
});

tickRateInput.addEventListener('input', () => {
  tickRateValue.textContent = tickRateInput.value;
  worker.postMessage({
    type: 'set-tick-ms',
    value: Number(tickRateInput.value),
  });
});

for (const [id, option] of [
  ['toggle-grid', 'showGrid'],
  ['toggle-fog', 'showFog'],
  ['toggle-occupancy', 'showOccupancy'],
  ['toggle-reservations', 'showReservations'],
  ['toggle-paths', 'showPaths'],
  ['toggle-hidden', 'showHidden'],
]) {
  document.getElementById(id).addEventListener('change', (event) => {
    state.options[option] = event.target.checked;
  });
}

canvas.addEventListener('mousemove', (event) => {
  state.hoverCell = eventToCell(event);
});
canvas.addEventListener('mouseleave', () => {
  state.hoverCell = null;
});
canvas.addEventListener('click', (event) => {
  const cell = eventToCell(event);
  state.selectedKey = pickEntityAtCell(cell)?.key ?? null;
  refreshPanels();
});
canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  const cell = eventToCell(event);
  if (!cell) return;

  const selected = getSelectedEntity();
  if (!selected) {
    setStatus('warn', 'Select a unit before assigning a target.');
    return;
  }
  if (selected.view.kind !== 'unit') {
    setStatus('warn', 'Only units accept move targets.');
    return;
  }

  worker.postMessage({
    type: 'set-target',
    ref: selected.ref,
    target: cell,
  });
});

const resizeObserver = new ResizeObserver(() => {
  resizeCanvas();
});
resizeObserver.observe(canvas);

resizeCanvas();
refreshPanels();
requestAnimationFrame(drawLoop);

function applyRenderSnapshot(payload) {
  const next = new Map();
  for (const entity of payload.render.entities) {
    next.set(refKey(entity.ref), entity);
  }
  state.entities = next;
  state.frame = payload.render.frame ?? {
    ...state.frame,
    tick: payload.render.tick,
  };
  state.debug = payload.debug;
  state.lastDiff = {
    tick: payload.render.tick,
    created: payload.render.entities.length,
    updated: 0,
    destroyed: 0,
  };
  syncFrameControls();
  clearSelectionIfMissing();
  refreshPanels();
}

function applyRenderTick(payload) {
  for (const ref of payload.render.destroyed) {
    state.entities.delete(refKey(ref));
  }
  for (const entity of payload.render.created) {
    state.entities.set(refKey(entity.ref), entity);
  }
  for (const entity of payload.render.updated) {
    state.entities.set(refKey(entity.ref), entity);
  }
  state.frame = payload.render.frame ?? {
    ...state.frame,
    tick: payload.render.tick,
  };
  state.debug = payload.debug;
  state.lastDiff = {
    tick: payload.render.tick,
    created: payload.render.created.length,
    updated: payload.render.updated.length,
    destroyed: payload.render.destroyed.length,
  };
  syncFrameControls();
  clearSelectionIfMissing();
  refreshPanels();
}

function syncFrameControls() {
  runButton.textContent = state.frame.running ? 'Pause' : 'Resume';
  tickRateInput.value = String(state.frame.tickMs);
  tickRateValue.textContent = String(state.frame.tickMs);
}

function clearSelectionIfMissing() {
  if (state.selectedKey && !state.entities.has(state.selectedKey)) {
    state.selectedKey = null;
  }
}

function refreshPanels() {
  frameSummary.innerHTML = renderDefinitionList([
    ['Tick', String(state.frame.tick)],
    ['Running', state.frame.running ? 'Yes' : 'No'],
    ['Tick ms', String(state.frame.tickMs)],
    ['Entities', String(state.entities.size)],
    ['Selected', state.selectedKey ?? 'None'],
    ['Hover Cell', state.hoverCell ? `${state.hoverCell.x}, ${state.hoverCell.y}` : 'None'],
  ]);

  const selected = getSelectedEntity();
  const selectedOverlay = getOverlayEntity(selected?.ref ?? null);
  selectionJson.textContent = selected
    ? JSON.stringify(
        {
          ref: selected.ref,
          view: selected.view,
          raw: selectedOverlay ?? null,
        },
        null,
        2,
      )
    : 'No selection';

  const warnings = state.debug?.warnings ?? [];
  warningList.innerHTML = warnings.length
    ? renderRows(
        warnings.map((warning) => [
          `${warning.severity.toUpperCase()} ${warning.code}`,
          warning.message,
        ]),
      )
    : 'No warnings.';

  const diff = state.debug?.diff;
  diffSummary.innerHTML = diff
    ? renderRows([
        ['Tick', String(diff.tick)],
        ['Created', String(diff.created)],
        ['Destroyed', String(diff.destroyed)],
        ['Changed Entities', String(diff.changedEntities)],
        ['Component Sets', formatPairs(diff.componentSets)],
        ['Component Removed', formatPairs(diff.componentRemoved)],
        ['Resource Sets', formatPairs(diff.resourceSets)],
        ['Resource Removed', formatPairs(diff.resourceRemoved)],
        ['Recycled IDs', diff.overlappingEntityIds.length ? diff.overlappingEntityIds.join(', ') : 'None'],
      ])
    : 'No diff yet.';

  const metrics = state.debug?.metrics;
  metricsSummary.innerHTML = metrics
    ? renderRows([
        ['Total ms', formatNumber(metrics.durationMs.total)],
        ['Commands ms', formatNumber(metrics.durationMs.commands)],
        ['Systems ms', formatNumber(metrics.durationMs.systems)],
        ['Diff ms', formatNumber(metrics.durationMs.diff)],
        ['Query Calls', String(metrics.query.calls)],
        ['Query Cache', `${metrics.query.cacheHits} hits / ${metrics.query.cacheMisses} misses`],
        ['Spatial Sync', `${metrics.spatial.explicitSyncs} explicit syncs`],
        ['Slowest System', formatSlowestSystem(metrics.systems)],
      ])
    : 'No metrics yet.';

  const events = state.debug?.events ?? [];
  eventSummary.innerHTML = events.length
    ? renderRows(events.map((event) => [event.type, String(event.count)]))
    : 'No events yet.';

  const probeRows = [];
  const occupancy = state.debug?.probes?.occupancy;
  if (occupancy) {
    probeRows.push(['Occupancy', `${occupancy.occupiedEntities} entities / ${occupancy.blockedCells} blocked`]);
  }
  const visibility = getFocusVisibility();
  if (visibility) {
    probeRows.push(['Visibility', `${visibility.visible.length} visible / ${visibility.explored.length} explored`]);
  }
  const paths = state.debug?.probes?.paths;
  if (paths) {
    probeRows.push(['Path Queue', `${paths.pending} pending / ${paths.cacheSize} cached`]);
  }
  const overlay = state.debug?.probes?.overlay;
  if (overlay) {
    probeRows.push(['Tracked Paths', String(overlay.paths.assigned.length)]);
    probeRows.push(['Debug Entities', String(overlay.entities.length)]);
  }
  probeSummary.innerHTML = probeRows.length ? renderRows(probeRows) : 'No probe data yet.';

  rawDebug.textContent = state.debug
    ? JSON.stringify(state.debug, null, 2)
    : 'Waiting for debugger payload...';
}

function renderDefinitionList(rows) {
  return rows
    .map(
      ([label, value]) =>
        `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`,
    )
    .join('');
}

function renderRows(rows) {
  return rows
    .map(
      ([label, value]) =>
        `<div class="panel-item"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`,
    )
    .join('');
}

function drawLoop() {
  resizeCanvas();
  const board = getBoardMetrics();

  context.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  context.clearRect(0, 0, board.viewportWidth, board.viewportHeight);

  drawTerrain(board);
  if (state.options.showOccupancy) {
    drawOccupancy(board);
  }
  if (state.options.showPaths) {
    drawPaths(board);
  }

  const entities = getSortedEntities();
  for (const entry of entities) {
    if (entry.view.visibility === 'hidden') continue;
    drawEntity(entry, board);
  }

  if (state.options.showFog) {
    drawFog(board);
  }

  if (state.options.showHidden) {
    for (const entry of entities) {
      if (entry.view.visibility !== 'hidden') continue;
      drawEntity(entry, board);
    }
  }

  if (state.options.showGrid) {
    drawGrid(board);
  }
  drawSelection(board);

  requestAnimationFrame(drawLoop);
}

function drawTerrain(board) {
  context.fillStyle = '#171916';
  context.fillRect(0, 0, board.viewportWidth, board.viewportHeight);

  for (let y = 0; y < state.frame.gridHeight; y++) {
    for (let x = 0; x < state.frame.gridWidth; x++) {
      const isEven = (x + y) % 2 === 0;
      context.fillStyle = isEven ? '#304232' : '#394a34';
      context.fillRect(
        board.originX + x * board.cellSize,
        board.originY + y * board.cellSize,
        board.cellSize,
        board.cellSize,
      );
    }
  }
}

function drawOccupancy(board) {
  const overlay = state.debug?.probes?.overlay;
  if (!overlay) return;

  context.fillStyle = 'rgba(75, 45, 27, 0.9)';
  for (const cell of overlay.occupancy.blocked) {
    fillCell(board, cell, 0.88);
  }

  context.fillStyle = 'rgba(214, 166, 77, 0.22)';
  for (const entry of overlay.occupancy.occupied) {
    for (const cell of entry.cells) {
      fillCell(board, cell, 0.74);
    }
  }

  if (state.options.showReservations) {
    context.fillStyle = 'rgba(214, 166, 77, 0.44)';
    for (const entry of overlay.occupancy.reservations) {
      for (const cell of entry.cells) {
        fillCell(board, cell, 0.44);
      }
    }
  }
}

function drawPaths(board) {
  const overlay = state.debug?.probes?.overlay;
  if (!overlay) return;

  for (const assignment of overlay.paths.assigned) {
    if (!assignment.path || assignment.path.length <= 1) continue;
    const entity = state.entities.get(refKey(assignment.ref));
    const pathColor =
      entity?.view.team === 'blue' ? 'rgba(88, 183, 232, 0.85)' : 'rgba(216, 103, 88, 0.85)';
    const isSelected = state.selectedKey === refKey(assignment.ref);

    context.strokeStyle = pathColor;
    context.lineWidth = isSelected ? 3 : 2;
    context.beginPath();
    assignment.path.forEach((point, index) => {
      const center = cellCenter(board, point.x, point.y);
      if (index === 0) {
        context.moveTo(center.x, center.y);
      } else {
        context.lineTo(center.x, center.y);
      }
    });
    context.stroke();

    const target = assignment.target;
    if (target) {
      const center = cellCenter(board, target.x, target.y);
      context.fillStyle = pathColor;
      context.beginPath();
      context.arc(center.x, center.y, Math.max(4, board.cellSize * 0.14), 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawEntity(entry, board) {
  const hidden = entry.view.visibility === 'hidden';
  const explored = entry.view.visibility === 'explored';
  if (hidden && !state.options.showHidden) return;

  const x = board.originX + entry.view.x * board.cellSize;
  const y = board.originY + entry.view.y * board.cellSize;
  const width = entry.view.width * board.cellSize;
  const height = entry.view.height * board.cellSize;

  context.save();
  context.globalAlpha = hidden ? 0.3 : explored ? 0.55 : 1;

  if (entry.view.kind === 'building') {
    context.fillStyle = entry.view.color;
    context.fillRect(x + 2, y + 2, width - 4, height - 4);
    context.strokeStyle = '#f3ecd4';
    context.lineWidth = 1.5;
    context.strokeRect(x + 2, y + 2, width - 4, height - 4);
  } else {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = Math.max(4, board.cellSize * 0.3);
    context.fillStyle = entry.view.color;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#f3ecd4';
    context.lineWidth = 1.5;
    context.stroke();
  }

  if (entry.view.hp !== null && entry.view.maxHp !== null) {
    drawHealthBar(board, x, y, width, entry.view.hp, entry.view.maxHp);
  }

  if (state.selectedKey === refKey(entry.ref)) {
    drawLabel(board, entry.view.label, x, y);
  }

  context.restore();
}

function drawHealthBar(board, x, y, width, hp, maxHp) {
  const barWidth = Math.max(18, width - 6);
  const barX = x + (width - barWidth) / 2;
  const barY = y - Math.max(8, board.cellSize * 0.22);
  context.fillStyle = 'rgba(15, 16, 14, 0.95)';
  context.fillRect(barX, barY, barWidth, 5);
  context.fillStyle = '#83c26b';
  context.fillRect(barX, barY, barWidth * (hp / maxHp), 5);
}

function drawFog(board) {
  const visibility = getFocusVisibility();
  if (!visibility) return;

  const visible = new Set(visibility.visible.map((cell) => `${cell.x},${cell.y}`));
  const explored = new Set(visibility.explored.map((cell) => `${cell.x},${cell.y}`));
  for (let y = 0; y < state.frame.gridHeight; y++) {
    for (let x = 0; x < state.frame.gridWidth; x++) {
      const key = `${x},${y}`;
      if (visible.has(key)) continue;
      context.fillStyle = explored.has(key)
        ? 'rgba(12, 13, 12, 0.46)'
        : 'rgba(9, 10, 9, 0.82)';
      context.fillRect(
        board.originX + x * board.cellSize,
        board.originY + y * board.cellSize,
        board.cellSize,
        board.cellSize,
      );
    }
  }
}

function drawGrid(board) {
  context.strokeStyle = 'rgba(238, 231, 214, 0.12)';
  context.lineWidth = 1;
  for (let x = 0; x <= state.frame.gridWidth; x++) {
    const px = board.originX + x * board.cellSize;
    context.beginPath();
    context.moveTo(px, board.originY);
    context.lineTo(px, board.originY + board.boardHeight);
    context.stroke();
  }
  for (let y = 0; y <= state.frame.gridHeight; y++) {
    const py = board.originY + y * board.cellSize;
    context.beginPath();
    context.moveTo(board.originX, py);
    context.lineTo(board.originX + board.boardWidth, py);
    context.stroke();
  }
}

function drawSelection(board) {
  const selected = getSelectedEntity();
  if (selected) {
    context.strokeStyle = '#f3ecd4';
    context.lineWidth = 2;
    context.strokeRect(
      board.originX + selected.view.x * board.cellSize + 1,
      board.originY + selected.view.y * board.cellSize + 1,
      selected.view.width * board.cellSize - 2,
      selected.view.height * board.cellSize - 2,
    );
  }

  if (state.hoverCell) {
    context.strokeStyle = 'rgba(243, 236, 212, 0.55)';
    context.lineWidth = 1.5;
    context.strokeRect(
      board.originX + state.hoverCell.x * board.cellSize + 1,
      board.originY + state.hoverCell.y * board.cellSize + 1,
      board.cellSize - 2,
      board.cellSize - 2,
    );
  }
}

function drawLabel(board, label, x, y) {
  context.font = `${Math.max(11, board.cellSize * 0.24)}px Inter, system-ui, sans-serif`;
  const metrics = context.measureText(label);
  const textWidth = metrics.width + 10;
  const labelX = x;
  const labelY = y - 22;
  context.fillStyle = 'rgba(21, 23, 22, 0.92)';
  context.fillRect(labelX, labelY, textWidth, 18);
  context.fillStyle = '#f2efe6';
  context.fillText(label, labelX + 5, labelY + 13);
}

function getBoardMetrics() {
  const rect = canvas.getBoundingClientRect();
  const cellSize = Math.min(rect.width / state.frame.gridWidth, rect.height / state.frame.gridHeight);
  const boardWidth = cellSize * state.frame.gridWidth;
  const boardHeight = cellSize * state.frame.gridHeight;
  return {
    viewportWidth: rect.width,
    viewportHeight: rect.height,
    cellSize,
    boardWidth,
    boardHeight,
    originX: (rect.width - boardWidth) / 2,
    originY: (rect.height - boardHeight) / 2,
  };
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function eventToCell(event) {
  const rect = canvas.getBoundingClientRect();
  const board = getBoardMetrics();
  const x = event.clientX - rect.left - board.originX;
  const y = event.clientY - rect.top - board.originY;
  if (x < 0 || y < 0 || x >= board.boardWidth || y >= board.boardHeight) {
    return null;
  }
  return {
    x: Math.floor(x / board.cellSize),
    y: Math.floor(y / board.cellSize),
  };
}

function pickEntityAtCell(cell) {
  if (!cell) return null;
  const entities = getSortedEntities().reverse();
  for (const entry of entities) {
    const hidden = entry.view.visibility === 'hidden' && !state.options.showHidden;
    if (hidden) continue;
    const withinX = cell.x >= entry.view.x && cell.x < entry.view.x + entry.view.width;
    const withinY = cell.y >= entry.view.y && cell.y < entry.view.y + entry.view.height;
    if (withinX && withinY) {
      return {
        key: refKey(entry.ref),
        entry,
      };
    }
  }
  return null;
}

function getSortedEntities() {
  return [...state.entities.values()].sort((a, b) => {
    const kindDelta = layerRank(a.view.kind) - layerRank(b.view.kind);
    if (kindDelta !== 0) return kindDelta;
    if (a.view.y !== b.view.y) return a.view.y - b.view.y;
    return a.ref.id - b.ref.id;
  });
}

function getSelectedEntity() {
  return state.selectedKey ? state.entities.get(state.selectedKey) ?? null : null;
}

function getOverlayEntity(ref) {
  if (!ref) return null;
  const entities = state.debug?.probes?.overlay?.entities ?? [];
  return entities.find((entity) => refKey(entity.ref) === refKey(ref)) ?? null;
}

function getFocusVisibility() {
  return state.debug?.probes?.overlay?.visibility?.players?.find(
    (player) => player.playerId === state.frame.focusPlayer,
  ) ?? null;
}

function fillCell(board, cell, insetRatio) {
  const inset = Math.max(1, board.cellSize * (1 - insetRatio) * 0.5);
  context.fillRect(
    board.originX + cell.x * board.cellSize + inset,
    board.originY + cell.y * board.cellSize + inset,
    board.cellSize - inset * 2,
    board.cellSize - inset * 2,
  );
}

function cellCenter(board, x, y) {
  return {
    x: board.originX + (x + 0.5) * board.cellSize,
    y: board.originY + (y + 0.5) * board.cellSize,
  };
}

function layerRank(kind) {
  return kind === 'building' ? 0 : 1;
}

function refKey(ref) {
  return `${ref.id}:${ref.generation}`;
}

function setStatus(level, message) {
  statusBanner.className = `playfield__status playfield__status--${level}`;
  statusBanner.textContent = message;
}

function formatPairs(entries) {
  return entries
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${key}:${count}`)
    .join(', ') || 'None';
}

function formatSlowestSystem(systems) {
  if (!systems.length) return 'None';
  const slowest = [...systems].sort((a, b) => b.durationMs - a.durationMs)[0];
  return `${slowest.name} ${formatNumber(slowest.durationMs)} ms`;
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(3) : String(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
