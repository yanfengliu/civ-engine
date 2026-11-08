import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { VisibilityMap as Candidate } from '../dist/visibility-map.js';

// Use a verified pre-change archive's dist/visibility-map.js as the baseline.
// This is an explicit local comparison, not a timing assertion in CI.
if (!global.gc || !process.argv[2]) {
  throw new Error('Usage: node --expose-gc scripts/benchmark-visibility-order.mjs BASELINE_MODULE');
}
const { VisibilityMap: Parent } = await import(pathToFileURL(resolve(process.argv[2])).href);

const width = 128;
const batches = 60;
const readCount = 500;
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function startingSources() {
  const sources = new Map();
  for (let i = 0; i < 277; i++) sources.set(`tree-${(i * 137) % 277}`, { x: (i * 37) % width, y: (i * 53) % width, radius: 5 });
  sources.set('moving-a', { x: 48, y: 48, radius: 3 });
  sources.set('moving-b', { x: 60, y: 60, radius: 3 });
  return sources;
}
function changes(batch) {
  return [['moving-a', { x: 48 + (batch % 20), y: 48 + (batch % 7), radius: 3 }],
    ['moving-b', { x: 72 - (batch % 20), y: 60 + (batch % 5), radius: 3 }]];
}
function create(Constructor, restored) {
  let map = new Constructor(width, width);
  for (const [id, source] of startingSources()) map.setSource('p', id, source);
  map.getState();
  if (restored) map = Constructor.fromState(map.getState());
  map.getState();
  map.resetMetrics();
  return map;
}
function visibleByCellScan(sources) {
  const values = [...sources.values()];
  const result = [];
  for (let cell = 0; cell < width * width; cell++) {
    const x = cell % width, y = Math.floor(cell / width);
    if (values.some((source) => (x - source.x) ** 2 + (y - source.y) ** 2 <= source.radius ** 2)) result.push(cell);
  }
  return result;
}
const proof = [];
for (const restored of [false, true]) {
  const parent = create(Parent, restored), candidate = create(Candidate, restored);
  const sources = startingSources();
  const explored = new Set(visibleByCellScan(sources));
  let computedCells = 0;
  const hashes = createHash('sha256');
  for (let batch = 0; batch < batches; batch++) {
    for (const [id, source] of changes(batch)) {
      parent.setSource('p', id, source); candidate.setSource('p', id, source); sources.set(id, source);
    }
    const expectedVisible = visibleByCellScan(sources);
    computedCells += expectedVisible.length;
    for (const cell of expectedVisible) explored.add(cell);
    const actual = candidate.getState(), old = parent.getState();
    assert.deepEqual(actual, old);
    assert.deepEqual(actual.players[0][1].explored, [...explored].sort((a, b) => a - b));
    assert.deepEqual(candidate.getVisibleCells('p'), expectedVisible.map((cell) => ({ x: cell % width, y: Math.floor(cell / width) })));
    assert.deepEqual(candidate.getMetrics(), { recomputes: batch + 1, computedCells, visibilityQueries: 0 });
    assert.deepEqual(candidate.getMetrics(), parent.getMetrics());
    hashes.update(JSON.stringify(actual));
  }
  proof.push({ restored, batches, sources: sources.size, explored: explored.size, stateSequenceSha256: hashes.digest('hex'), metrics: candidate.getMetrics() });
}

function timed(Constructor, restored, moving) {
  const map = create(Constructor, restored);
  global.gc();
  const cpu = process.cpuUsage(), started = performance.now();
  let last;
  for (let i = 0; i < (moving ? batches : readCount); i++) {
    if (moving) for (const [id, source] of changes(i)) map.setSource('p', id, source);
    last = map.getState();
  }
  const wallMs = performance.now() - started, used = process.cpuUsage(cpu);
  return { wallMs, cpuMs: (used.user + used.system) / 1000, digest: digest(last) };
}
const med = (samples) => [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)];
const performanceResults = [];
for (const restored of [false, true]) for (const moving of [false, true]) {
  timed(Parent, restored, moving); timed(Candidate, restored, moving);
  const parent = [], candidate = [];
  for (let trial = 0; trial < 7; trial++) {
    let a, b;
    if (trial % 2) { b = timed(Candidate, restored, moving); a = timed(Parent, restored, moving); }
    else { a = timed(Parent, restored, moving); b = timed(Candidate, restored, moving); }
    assert.equal(a.digest, b.digest);
    parent.push(a); candidate.push(b);
  }
  performanceResults.push({ restored, workload: moving ? '60 moving batches' : '500 unchanged reads',
    parentWallMs: med(parent.map((x) => x.wallMs)), candidateWallMs: med(candidate.map((x) => x.wallMs)),
    parentCpuMs: med(parent.map((x) => x.cpuMs)), candidateCpuMs: med(candidate.map((x) => x.cpuMs)),
    parent, candidate });
}
function retained(Constructor) {
  global.gc();
  const before = process.memoryUsage().heapUsed;
  const maps = Array.from({ length: 12 }, () => create(Constructor, false));
  global.gc();
  const perMap = (process.memoryUsage().heapUsed - before) / maps.length;
  assert.equal(maps[0].getState().players[0][1].sources.length, 279);
  return perMap;
}
const retainedSamples = [];
for (let trial = 0; trial < 5; trial++) {
  if (trial % 2) { const candidate = retained(Candidate); retainedSamples.push({ parent: retained(Parent), candidate }); }
  else { const parent = retained(Parent); retainedSamples.push({ parent, candidate: retained(Candidate) }); }
}
console.log(JSON.stringify({ node: process.version, width, proof, performanceResults,
  retainedHeapBytesPerMap: { parent: med(retainedSamples.map((x) => x.parent)), candidate: med(retainedSamples.map((x) => x.candidate)), samples: retainedSamples },
  bounds: 'Synthetic visibility-only workload; wall/CPU medians of seven alternating trials. Retained heap is an approximate forced-GC sample, not total process RSS. No game throughput claim.' }, null, 2));
