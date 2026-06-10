// System layer of the `World` class chain: registration + normalization,
// per-phase ordering (with `before`/`after` topological constraints), and
// tick-time execution with per-system timing + failure capture.

import {
  createErrorDetails,
  errorMessage,
  isSystemPhase,
  now,
  phaseIndex,
  SYSTEM_PHASES,
  validateSystemInterval,
  validateSystemIntervalOffset,
} from './world-internal.js';
import type { SystemPhase } from './world-internal.js';
import type {
  ComponentRegistry,
  LooseSystem,
  LooseSystemRegistration,
  RegisteredSystem,
  System,
  SystemRegistration,
  TickFailure,
  WorldMetrics,
} from './world-types.js';
import { WorldCommands } from './world-commands.js';

export abstract class WorldSystems<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> extends WorldCommands<TEventMap, TCommandMap, TComponents, TState> {
  registerSystem(
    system:
      | System<TEventMap, TCommandMap, TComponents, TState>
      | SystemRegistration<TEventMap, TCommandMap, TComponents, TState>,
  ): void;
  registerSystem(
    system: LooseSystem | LooseSystemRegistration,
  ): void;
  registerSystem(
    system:
      | System<TEventMap, TCommandMap, TComponents, TState>
      | SystemRegistration<TEventMap, TCommandMap, TComponents, TState>
      | LooseSystem
      | LooseSystemRegistration,
  ): void {
    this.systems.push(this.normalizeSystemRegistration(system));
  }

  protected executeSystems(
    tick: number,
    metrics: WorldMetrics | null,
    collectDetailedTimings: boolean,
  ): TickFailure | null {
    if (!this.resolvedSystemOrder) {
      this.resolvedSystemOrder = this.resolveSystemOrder();
    }
    const systems = this.resolvedSystemOrder;

    for (const system of systems) {
      if ((tick - 1) % system.interval !== system.intervalOffset) {
        continue;
      }
      const start = collectDetailedTimings ? now() : 0;
      try {
        system.execute(this.asWorld());
      } catch (error) {
        return this.createTickFailure({
          tick,
          phase: 'systems',
          code: 'system_threw',
          message: errorMessage(error),
          subsystem: 'systems',
          systemName: system.name,
          details: {
            systemName: system.name,
            systemPhase: system.phase,
            error: createErrorDetails(error),
          },
          error,
        });
      }
      if (collectDetailedTimings && metrics) {
        metrics.systems.push({
          name: system.name,
          phase: system.phase,
          durationMs: now() - start,
        });
      }
    }

    return null;
  }

  private resolveSystemOrder(): Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>> {
    const byPhase = new Map<SystemPhase, Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>>>();
    for (const phase of SYSTEM_PHASES) {
      byPhase.set(phase, []);
    }
    const nameToSystem = new Map<string, RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>>();
    const duplicateNames = new Set<string>();
    for (const sys of this.systems) {
      byPhase.get(sys.phase)!.push(sys);
      if (sys.name) {
        if (nameToSystem.has(sys.name)) duplicateNames.add(sys.name);
        nameToSystem.set(sys.name, sys);
      }
    }

    const hasConstraints = this.systems.some(
      (s) => s.before.length > 0 || s.after.length > 0,
    );
    if (!hasConstraints) {
      return [...this.systems].sort((a, b) => {
        const phaseDelta = phaseIndex(a.phase) - phaseIndex(b.phase);
        return phaseDelta !== 0 ? phaseDelta : a.order - b.order;
      });
    }

    for (const sys of this.systems) {
      for (const ref of [...sys.before, ...sys.after]) {
        // Duplicate names without constraints are legal (common with inferred
        // names); a CONSTRAINT on a duplicated name would silently bind to
        // whichever system registered last, so reject it as ambiguous
        // (full-review 2026-06-10 L3).
        if (duplicateNames.has(ref)) {
          throw new Error(
            `System '${sys.name}' has an ordering constraint on '${ref}', which is registered more than once — the constraint target is ambiguous`,
          );
        }
        const target = nameToSystem.get(ref);
        if (!target) {
          throw new Error(
            `System '${sys.name}' references non-existent system '${ref}'`,
          );
        }
        if (target.phase !== sys.phase) {
          throw new Error(
            `System '${sys.name}' (phase '${sys.phase}') has a cross-phase constraint on '${ref}' (phase '${target.phase}')`,
          );
        }
      }
    }

    const result: Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>> = [];
    for (const phase of SYSTEM_PHASES) {
      const phaseSystems = byPhase.get(phase)!;
      if (phaseSystems.length === 0) continue;
      const sorted = topologicalSort(phaseSystems, nameToSystem);
      result.push(...sorted);
    }
    return result;
  }

  private normalizeSystemRegistration(
    system:
      | System<TEventMap, TCommandMap, TComponents, TState>
      | SystemRegistration<TEventMap, TCommandMap, TComponents, TState>
      | LooseSystem
      | LooseSystemRegistration,
  ): RegisteredSystem<TEventMap, TCommandMap, TComponents, TState> {
    if (typeof system === 'function') {
      const order = this.nextSystemOrder++;
      this.resolvedSystemOrder = null;
      return {
        name: system.name || `system#${order}`,
        phase: 'update',
        execute: system as System<TEventMap, TCommandMap, TComponents, TState>,
        order,
        before: [],
        after: [],
        interval: 1,
        intervalOffset: 0,
      };
    }

    const phase = system.phase ?? 'update';
    if (!isSystemPhase(phase)) {
      throw new Error(`Unknown system phase '${String(phase)}'`);
    }

    const provisionalName =
      system.name ?? system.execute.name ?? `system#${this.nextSystemOrder}`;
    const interval = validateSystemInterval(provisionalName, system.interval);
    const intervalOffset = validateSystemIntervalOffset(
      provisionalName,
      interval,
      system.intervalOffset,
    );

    const order = this.nextSystemOrder++;
    this.resolvedSystemOrder = null;
    const name = system.name ?? system.execute.name ?? `system#${order}`;

    return {
      name,
      phase,
      execute: system.execute as System<TEventMap, TCommandMap, TComponents, TState>,
      order,
      before: system.before ?? [],
      after: system.after ?? [],
      interval,
      intervalOffset,
    };
  }
}

function topologicalSort<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry,
  TState extends Record<string, unknown>,
>(
  systems: Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>>,
  nameToSystem: Map<string, RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>>,
): Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>> {
  const edges = new Map<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>, Set<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>>>();
  for (const sys of systems) {
    edges.set(sys, new Set());
  }

  for (const sys of systems) {
    for (const beforeName of sys.before) {
      const target = nameToSystem.get(beforeName)!;
      edges.get(sys)!.add(target);
    }
    for (const afterName of sys.after) {
      const target = nameToSystem.get(afterName)!;
      edges.get(target)!.add(sys);
    }
  }

  const inDegree = new Map<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>, number>();
  for (const sys of systems) {
    inDegree.set(sys, 0);
  }
  for (const deps of edges.values()) {
    for (const dep of deps) {
      inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
    }
  }

  const queue = systems
    .filter((s) => inDegree.get(s) === 0)
    .sort((a, b) => a.order - b.order);

  const result: Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>> = [];
  while (queue.length > 0) {
    const sys = queue.shift()!;
    result.push(sys);
    const deps = [...edges.get(sys)!].sort((a, b) => a.order - b.order);
    for (const dep of deps) {
      const newDeg = inDegree.get(dep)! - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) {
        const insertIdx = queue.findIndex((q) => q.order > dep.order);
        if (insertIdx === -1) {
          queue.push(dep);
        } else {
          queue.splice(insertIdx, 0, dep);
        }
      }
    }
  }

  if (result.length !== systems.length) {
    const inCycle = systems.filter((s) => !result.includes(s));
    const names = inCycle.map((s) => s.name).join(' -> ');
    throw new Error(`Cycle detected in system ordering: ${names}`);
  }

  return result;
}
