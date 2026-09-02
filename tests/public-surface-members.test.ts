// A new method on an exported class is additive PUBLIC SURFACE (minor), even
// when it was intended as an internal perf helper — and the name-level surface
// fixture will not catch it. `tests/public-surface.test.ts` pins top-level
// export NAMES; adding `SpatialGrid.getAtRaw` changes no name, so that pin
// stays green while `dist/index.d.ts` grows a consumer-callable method. Post-1.0
// semver puts additive surface on the MINOR axis, so such a change cannot ship
// as a patch. This file pins the MEMBERS, so the addition is a fixture diff a
// reviewer has to look at and version deliberately.
//
// Provenance: full-review 2026-06-13 iter-4 (Codex MEDIUM, Claude NIT) caught
// exactly this shape one review before a `1.1.3` patch release. The gap was
// documented in the name-level pin's own header as deferred to "a d.ts diff
// review step at the freeze" and then never closed.
//
// What to do when this fails: it is not a lint error to silence. Decide whether
// the member is public surface. If it is, bump the MINOR version and run
// `node scripts/public-surface-members.mjs --update` in the same reviewed diff.
// If it is not, make it `private` / `#name` — note that `@internal` alone does
// NOT remove it, because tsconfig.build.json does not set `stripInternal`, so
// an `@internal` member still ships in the published declarations.
//
// Reach and its limits: members are resolved through `extends` (World's members
// live on the unexported WorldCore), so a base-class addition is caught too.
// Signatures, parameter types and return types are deliberately NOT pinned here
// — typecheck, the consumer back-compat fixture, and api-reference review own
// those. `implements` clauses are not followed (they add no surface).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { publicNames, scanSurfaceMembers } from '../scripts/public-surface-members.mjs';

import type { SurfaceMembers } from '../scripts/public-surface-members.mjs';

const fixture = JSON.parse(
  readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'public-surface-members.json'), 'utf8'),
) as SurfaceMembers;

describe('public surface pin (members)', () => {
  it('members of every exported class, interface and object type match the committed allowlist', () => {
    const scanned = scanSurfaceMembers();

    // Per-declaration first: a whole-object compare on 243 declarations prints
    // an unreadable diff, and the reader needs to see WHICH member arrived.
    for (const name of new Set([...Object.keys(fixture), ...Object.keys(scanned)])) {
      expect(
        scanned[name],
        `public surface of "${name}" changed. A member added to an exported ` +
          `declaration is additive public surface (minor), even when intended internal.`,
      ).toEqual(fixture[name]);
    }

    expect(Object.keys(scanned).sort()).toEqual(Object.keys(fixture).sort());
  });

  it('the member pin covers every exported class in the name-level allowlist', () => {
    // Horizon guard: the member scan is bounded by the top-level name list, so
    // a class that leaves that list, or a scanner that silently stops finding
    // declarations, would shrink this gate's reach without failing it.
    const scanned = scanSurfaceMembers();
    const names = publicNames();
    const classesInSrc = readFileSync(path.join(process.cwd(), 'src', 'index.ts'), 'utf8');
    expect(classesInSrc.length).toBeGreaterThan(0);

    for (const name of ['World', 'SpatialGrid', 'SessionRecorder', 'BundleViewer']) {
      expect(names.has(name), `${name} left the public name allowlist`).toBe(true);
      expect(scanned[name], `${name} is exported but the member scan found no declaration`)
        .toBeDefined();
      expect(scanned[name]!.length).toBeGreaterThan(0);
    }

    // World's members are almost all inherited from the unexported WorldCore;
    // if inheritance resolution breaks, this drops to a handful and the pin
    // would go green on a base-class addition.
    expect(scanned.World!.length).toBeGreaterThan(100);
  });
});
