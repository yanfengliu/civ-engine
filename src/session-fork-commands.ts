// Private continuation command preparation; public fork contracts stay in session-fork.ts.
import type { RecordedCommand } from './session-bundle.js';

/** Preserve source submission order, excluding the separately substituted target transition. */
export function groupForkContinuationCommands<TCommandMap>(
  commands: ReadonlyArray<RecordedCommand<TCommandMap>>,
  targetTick: number,
): Map<number, RecordedCommand<TCommandMap>[]> {
  const out = new Map<number, RecordedCommand<TCommandMap>[]>();
  for (const rc of commands) {
    if (rc.submissionTick <= targetTick) continue;
    const list = out.get(rc.submissionTick);
    if (list === undefined) {
      out.set(rc.submissionTick, [rc]);
    } else {
      list.push(rc);
    }
  }
  return out;
}
