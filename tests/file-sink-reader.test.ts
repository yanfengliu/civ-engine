// Bound: the five public FileSink JSONL iterators over bounded records and
// their native synchronous I/O lifecycle. No full-bundle memory claim.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileSink } from '../src/session-file-sink.js';
import { SinkWriteError } from '../src/session-errors.js';

const owned = vi.hoisted(() => new Set<number>());
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof fs>('node:fs');
  return {
    ...actual,
    openSync: vi.fn((...args: Parameters<typeof actual.openSync>) => {
      const fd = actual.openSync(...args);
      owned.add(fd);
      return fd;
    }),
    readSync: vi.fn(actual.readSync),
    fstatSync: vi.fn(actual.fstatSync),
    readFileSync: vi.fn(actual.readFileSync),
    closeSync: vi.fn((fd: number) => { actual.closeSync(fd); owned.delete(fd); }),
  };
});

const streams = [
  ['ticks', 'ticks.jsonl'], ['commands', 'commands.jsonl'],
  ['executions', 'executions.jsonl'], ['failures', 'failures.jsonl'],
  ['markers', 'markers.jsonl'],
] as const;
const BLOCK = 65_536; // Independent accepted literal, not imported from production.
const real = await vi.importActual<typeof fs>('node:fs');
let dir: string;

beforeEach(() => {
  vi.mocked(fs.openSync).mockImplementation((...args) => {
    const fd = real.openSync(...args); owned.add(fd); return fd;
  });
  vi.mocked(fs.readSync).mockImplementation(real.readSync);
  vi.mocked(fs.fstatSync).mockImplementation(real.fstatSync);
  vi.mocked(fs.readFileSync).mockImplementation(real.readFileSync);
  vi.mocked(fs.closeSync).mockImplementation((fd) => { real.closeSync(fd); owned.delete(fd); });
  vi.clearAllMocks();
  dir = real.mkdtempSync(join(tmpdir(), 'civ-engine-jsonl-reader-'));
});

afterEach(() => {
  // Mutant controls may omit finally. Release only FDs opened by this test.
  for (const fd of owned) { real.closeSync(fd); }
  owned.clear();
  real.rmSync(dir, { recursive: true });
});

function caught(action: () => unknown): { threw: boolean; value: unknown } {
  try { action(); return { threw: false, value: undefined }; }
  catch (value) { return { threw: true, value }; }
}

function closeFailure(error: unknown): void {
  vi.mocked(fs.closeSync).mockImplementation((fd) => {
    real.closeSync(fd); owned.delete(fd); throw error;
  });
}

function reads(): unknown[][] {
  return vi.mocked(fs.readSync).mock.calls.map((call) => Array.from(call));
}

function expectParseFailure(action: () => unknown, file: string): void {
  const result = caught(action);
  expect(result.threw).toBe(true);
  expect(result.value).toBeInstanceOf(SinkWriteError);
  expect((result.value as SinkWriteError).code).toBe('jsonl_parse');
  expect((result.value as SinkWriteError).details).toMatchObject({ code: 'jsonl_parse', file });
}

describe.each(streams)('%s public iterator', (method, file) => {
  function source(bytes: string | Buffer): IterableIterator<unknown> {
    real.writeFileSync(join(dir, file), bytes);
    return new FileSink(dir)[method]();
  }

  it('owns no FD until first next and opens exactly once', () => {
    const iter = source('1\n2\n');
    expect(fs.openSync).not.toHaveBeenCalled();
    expect(fs.readSync).not.toHaveBeenCalled();
    expect(iter.next()).toEqual({ done: false, value: 1 });
    expect(fs.openSync).toHaveBeenCalledTimes(1);
    expect(fs.fstatSync).toHaveBeenCalledTimes(1);
    expect([...iter]).toEqual([2]);
    expect(fs.closeSync).toHaveBeenCalledTimes(1);
    expect(owned.size).toBe(0);
  });

  it('an unused return owns no FD, and missing/empty files yield nothing', () => {
    const unused = source('1\n');
    unused.return?.();
    expect(fs.openSync).not.toHaveBeenCalled();
    real.unlinkSync(join(dir, file));
    expect([...new FileSink(dir)[method]()]).toEqual([]);
    expect([...source('')]).toEqual([]);
    expect(owned.size).toBe(0);
  });

  it('preserves empty lines, CRLF, arbitrary JSON values and a valid unterminated tail', () => {
    expect([...source('\n1\r\n\nnull\nfalse\n"x"\n[2]\n{}')])
      .toEqual([1, null, false, 'x', [2], {}]);
  });

  it.each(['broken\n', 'broken\nbroken', ' \n', '\r\n'])('rejects every completed malformed line: %j', (text) => {
    expectParseFailure(() => [...source(text)], file);
    expect(fs.closeSync).toHaveBeenCalledTimes(1);
  });

  it.each(['broken', ' ', '\ufeff1', '{"x":'])('ignores only the actual malformed unterminated final text: %j', (tail) => {
    expect([...source(`1\n${tail}`)]).toEqual([1]);
  });

  it('yields a valid prefix before later corruption in the same read block', () => {
    const iter = source('1\nbroken\nbroken');
    expect(iter.next()).toEqual({ done: false, value: 1 });
    expect(fs.closeSync).not.toHaveBeenCalled();
    expectParseFailure(() => iter.next(), file);
    expect(fs.closeSync).toHaveBeenCalledTimes(1);
  });

  it('first yield reads only the first 64 KiB at explicit offset zero', () => {
    const iter = source('1\n' + '2\n'.repeat(BLOCK));
    expect(iter.next()).toEqual({ done: false, value: 1 });
    expect(reads()).toHaveLength(1);
    expect(reads()[0].slice(2)).toEqual([0, BLOCK, 0]);
    expect(fs.readFileSync).not.toHaveBeenCalled();
    iter.return?.();
    expect(fs.closeSync).toHaveBeenCalledTimes(1);
  });

  it('caps the last positional read by the captured byte horizon', () => {
    const text = JSON.stringify('x'.repeat(BLOCK * 2)) + '\n';
    const iter = source(text);
    expect(iter.next()).toEqual({ done: false, value: 'x'.repeat(BLOCK * 2) });
    expect(reads().map((call) => call.slice(2))).toEqual([
      [0, BLOCK, 0], [0, BLOCK, BLOCK], [0, 3, BLOCK * 2],
    ]);
    expect(iter.next().done).toBe(true);
    expect(reads()).toHaveLength(3);
  });

  it('captures the horizon on first next, excludes later appends, and gives each iterator its own horizon', () => {
    const first = source('1\n');
    real.appendFileSync(join(dir, file), '2\n');
    expect(first.next().value).toBe(1);
    real.appendFileSync(join(dir, file), '3\n');
    const second = new FileSink(dir)[method]();
    expect([...first]).toEqual([2]);
    expect([...second]).toEqual([1, 2, 3]);
    expect(reads().map((call) => call.slice(2))).toEqual([[0, 4, 0], [0, 6, 0]]);
    expect(fs.closeSync).toHaveBeenCalledTimes(2);
  });

  it('does not let appended bytes complete the old unterminated JSON or UTF-8 tail', () => {
    const first = source(Buffer.concat([Buffer.from('1\n"'), Buffer.from([0xc2])]));
    expect(first.next().value).toBe(1);
    real.appendFileSync(join(dir, file), Buffer.from([0xa2, 0x22, 0x0a]));
    expect([...first]).toEqual([]);
    expect([...new FileSink(dir)[method]()]).toEqual([1, '¢']);
  });

  it('terminates after a premature native read-zero without retrying indefinitely', () => {
    const iter = source('1\n"' + 'x'.repeat(BLOCK * 2));
    expect(iter.next().value).toBe(1);
    vi.mocked(fs.readSync).mockReturnValueOnce(0);
    expect(iter.next().done).toBe(true);
    expect(reads()).toHaveLength(2);
    expect(fs.closeSync).toHaveBeenCalledTimes(1);
  });

  it('closes once on explicit return and for-of break', () => {
    const first = source('1\n2\n');
    first.next(); first.return?.(); first.return?.();
    expect(fs.closeSync).toHaveBeenCalledTimes(1);
    for (const value of source('1\n2\n')) { expect(value).toBe(1); break; }
    expect(fs.closeSync).toHaveBeenCalledTimes(2);
  });

  it.each([undefined, null, false, 0, '', new Error('injected')])('preserves injected throw identity through public iteration when close fails: %j', (primary) => {
    const iter = source('1\n2\n');
    iter.next(); closeFailure(new Error('close also failed'));
    expect(caught(() => iter.throw?.(primary))).toEqual({ threw: true, value: primary });
    expect(fs.closeSync).toHaveBeenCalledTimes(1);
    expect(owned.size).toBe(0);
  });

  it.each(['fstat', 'read'] as const)('preserves native %s error identity over a close failure', (operation) => {
    const iter = source('1\n');
    const primary = Object.assign(new Error(`${operation} failed`), { code: 'EIO' });
    closeFailure(new Error('close also failed'));
    if (operation === 'fstat') vi.mocked(fs.fstatSync).mockImplementationOnce(() => { throw primary; });
    else vi.mocked(fs.readSync).mockImplementationOnce(() => { throw primary; });
    const result = caught(() => iter.next());
    expect(result.threw).toBe(true); expect(result.value).toBe(primary);
    expect(fs.closeSync).toHaveBeenCalledTimes(1);
  });

  it('preserves native open errors without attempting to close an unowned FD', () => {
    const iter = source('1\n');
    const primary = Object.assign(new Error('open failed'), { code: 'EACCES' });
    vi.mocked(fs.openSync).mockImplementationOnce(() => { throw primary; });
    const result = caught(() => iter.next());
    expect(result.threw).toBe(true); expect(result.value).toBe(primary);
    expect(fs.closeSync).not.toHaveBeenCalled();
  });

  it('a completed parse failure wins over close failure and identifies its physical line', () => {
    const iter = source('\n1\nbroken\n');
    expect(iter.next().value).toBe(1);
    const close = new Error('close also failed'); closeFailure(close);
    const result = caught(() => iter.next());
    expect(result.threw).toBe(true); expect(result.value).not.toBe(close);
    expect(result.value).toBeInstanceOf(SinkWriteError);
    expect((result.value as SinkWriteError).details).toMatchObject({ code: 'jsonl_parse', file });
    expect((result.value as Error).message).toContain('line 3');
    expect((result.value as Error).message).toContain(file);
    expect((result.value as Error).message).toContain('valid JSON');
    expect(fs.closeSync).toHaveBeenCalledTimes(1);
  });

  it.each(['exhaust', 'return'] as const)('makes a close-only failure visible on %s', (operation) => {
    const iter = source('1\n'); iter.next();
    const close = new Error('close failed'); closeFailure(close);
    const result = caught(() => operation === 'return' ? iter.return?.() : iter.next());
    expect(result.threw).toBe(true); expect(result.value).toBe(close);
    expect(fs.closeSync).toHaveBeenCalledTimes(1);
  });
});

describe('UTF-8 matches the legacy whole-buffer decoder', () => {
  it.each(['¢', '€', '😀'])('preserves %s at every split within its UTF-8 sequence', (character) => {
    const bytes = Buffer.from(character);
    for (let split = 1; split < bytes.length; split++) {
      const line = Buffer.concat([Buffer.from('"' + 'x'.repeat(BLOCK - split - 1)), bytes, Buffer.from('"\n')]);
      real.writeFileSync(join(dir, 'ticks.jsonl'), line);
      expect([...new FileSink(dir).ticks()]).toEqual([JSON.parse(line.toString('utf8'))]);
    }
  });

  it.each([[0xc2], [0xe2, 0x82], [0xf0, 0x9f, 0x98], [0xe2, 0x28, 0xa1], [0xed, 0xa0, 0x80], [0xff]].map(bytes => ({ bytes })))('preserves legacy replacement decoding for malformed bytes %j at block seams', ({ bytes: invalid }) => {
    let exercised = 0;
    for (let split = 1; split <= invalid.length; split++) {
      const line = Buffer.concat([Buffer.from('"' + 'x'.repeat(BLOCK - split - 1)), Buffer.from(invalid), Buffer.from('"\n')]);
      real.writeFileSync(join(dir, 'ticks.jsonl'), line);
      expect([...new FileSink(dir).ticks()]).toEqual([JSON.parse(line.toString('utf8'))]);
      exercised++;
    }
    expect(exercised).toBe(invalid.length);
  });

  it('preserves BOM rejection rather than stripping it', () => {
    const bytes = Buffer.from('\ufeff1\n');
    expect(caught(() => JSON.parse(bytes.toString('utf8'))).threw).toBe(true);
    real.writeFileSync(join(dir, 'ticks.jsonl'), bytes);
    expectParseFailure(() => [...new FileSink(dir).ticks()], 'ticks.jsonl');
  });
});
