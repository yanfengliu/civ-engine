import { closeSync, existsSync, fstatSync, openSync, readSync } from 'node:fs';
import { join } from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { SinkWriteError } from './session-errors.js';

const READ_BYTES = 65_536;

function closeReader(fd: number, hasPrimaryError: boolean): void {
  try { closeSync(fd); }
  catch (error) { if (!hasPrimaryError) throw error; }
}

function parseCompletedLine(line: string, file: string, lineNumber: number): unknown {
  try {
    return JSON.parse(line);
  } catch (error) {
    throw new SinkWriteError(
      `malformed JSONL in ${file} at line ${lineNumber}: ${(error as Error).message}; completed lines require valid JSON`,
      { code: 'jsonl_parse', file },
    );
  }
}

/** Internal synchronous reader. Memory follows the largest line plus one block,
 * not the whole stream. The first next captures a byte horizon, not an atomic
 * content snapshot: later appends are excluded; rewrites/truncation remain native.
 */
export function* readJsonlRecords(dir: string, file: string): IterableIterator<unknown> {
  const path = join(dir, file);
  if (!existsSync(path)) return;
  const fd = openSync(path, 'r');
  let hasPrimaryError = false;
  try {
    const horizon = fstatSync(fd).size;
    const buffer = Buffer.allocUnsafe(READ_BYTES);
    const decoder = new StringDecoder('utf8');
    let position = 0;
    let pending = '';
    let lineNumber = 0;
    while (position < horizon) {
      const count = readSync(fd, buffer, 0, Math.min(READ_BYTES, horizon - position), position);
      if (count === 0) break; // A file truncated after fstat may end early.
      position += count;
      const text = pending + decoder.write(buffer.subarray(0, count));
      let start = 0;
      for (let end = text.indexOf('\n', start); end !== -1; end = text.indexOf('\n', start)) {
        const line = text.slice(start, end);
        start = end + 1;
        lineNumber++;
        if (line.length !== 0) yield parseCompletedLine(line, file, lineNumber);
      }
      pending = text.slice(start);
    }
    pending += decoder.end();
    if (pending.length !== 0) {
      let record: unknown;
      try { record = JSON.parse(pending); }
      catch { return; } // Only the physical final unterminated line is tolerant.
      yield record;
    }
  } catch (error) {
    // A separate flag preserves even undefined/null/false/0/'' from .throw().
    hasPrimaryError = true;
    throw error;
  } finally {
    closeReader(fd, hasPrimaryError);
  }
}
