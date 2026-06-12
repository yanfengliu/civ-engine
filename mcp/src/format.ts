// Shared output discipline for every tool (DESIGN §Output bounds): explicit
// limits with truncated flags (no silent caps), Map conversion (JSON.stringify
// serializes Maps as {}), and engine-error mapping through getErrorCode —
// the cross-family branch key exists exactly for this consumer.

import { getErrorCode } from 'civ-engine';

export const DEFAULT_LIST_LIMIT = 100;

export interface Bounded<T> {
  items: T[];
  total: number;
  truncated: boolean;
}

export function bounded<T>(all: readonly T[], limit: number | undefined): Bounded<T> {
  const lim = limit ?? DEFAULT_LIST_LIMIT;
  const items = all.slice(0, lim);
  return { items: [...items], total: all.length, truncated: all.length > items.length };
}

export function mapToObject<V>(map: ReadonlyMap<number, V>): Record<string, V> {
  const out: Record<string, V> = {};
  for (const [k, v] of map) out[String(k)] = v;
  return out;
}

/** MCP tool result: JSON payload as text content. */
export function ok(payload: unknown): {
  content: Array<{ type: 'text'; text: string }>;
} {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

/** MCP tool error carrying the engine code when one exists. */
export function toolError(e: unknown): {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
} {
  const code = getErrorCode(e);
  const message = e instanceof Error ? e.message : String(e);
  const name = e instanceof Error ? e.name : 'Error';
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: { code, name, message } }, null, 2) }],
    isError: true,
  };
}

export async function guarded<T>(fn: () => T | Promise<T>): Promise<
  ReturnType<typeof ok> | ReturnType<typeof toolError>
> {
  try {
    return ok(await fn());
  } catch (e) {
    return toolError(e);
  }
}
