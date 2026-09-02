import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * Member-level public-surface scanner.
 *
 * `tests/public-surface.test.ts` pins the top-level export NAMES. A method
 * added to an already-exported class changes no name, so that pin stays green
 * while the package's `.d.ts` grows a new public member — and post-1.0 semver
 * puts additive surface on the MINOR axis, so the change cannot ship as a
 * patch. This scanner is the missing half: it enumerates the members of every
 * publicly exported class, interface, and object-shaped type alias, so an
 * addition is a fixture diff a reviewer has to look at.
 *
 * Syntactic on purpose (`createSourceFile`, no program, no checker): the
 * question is "what did someone write in a public declaration", not "what does
 * the type system infer", and a full program would cost a second `tsc` run.
 *
 * `private` members and `#name` fields are excluded — they are not callable
 * surface. `@internal` is NOT excluded, because `tsconfig.build.json` does not
 * set `stripInternal`: an `@internal` member still ships in the published
 * `.d.ts` and is still consumer-reachable, so pretending otherwise would be
 * the same false confidence this scanner exists to remove.
 *
 * Run `node scripts/public-surface-members.mjs --update` to rewrite the
 * fixture after a REVIEWED surface change.
 */

const SRC = "src";
const FIXTURE = path.join("tests", "fixtures", "public-surface-members.json");
const NAME_FIXTURE = path.join("tests", "fixtures", "public-surface.json");

/** Every `.ts` under src/, recursively. */
export function sourceFiles(root = SRC) {
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) out.push(full);
  }
  return out.sort();
}

/** The committed top-level public name list, which bounds what we scan. */
export function publicNames(fixturePath = NAME_FIXTURE) {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8"));
  return new Set(parsed.declaration);
}

function isPrivate(member) {
  if (ts.isPrivateIdentifier(member.name ?? {})) return true;
  const mods = ts.getModifiers?.(member) ?? member.modifiers ?? [];
  return mods.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword);
}

function isStatic(member) {
  const mods = ts.getModifiers?.(member) ?? member.modifiers ?? [];
  return mods.some((m) => m.kind === ts.SyntaxKind.StaticKeyword);
}

/** One stable label per member, carrying the facts that change the contract. */
function label(member) {
  if (ts.isIndexSignatureDeclaration(member)) return "[index]";
  if (ts.isConstructSignatureDeclaration(member)) return "new()";
  if (ts.isCallSignatureDeclaration(member)) return "()";
  if (ts.isConstructorDeclaration(member)) return "constructor";
  const name = member.name ? member.name.getText() : "<anonymous>";
  const optional = member.questionToken ? "?" : "";
  const prefix = isStatic(member) ? "static " : "";
  const kind = ts.isGetAccessor(member) ? "get " : ts.isSetAccessor(member) ? "set " : "";
  return `${prefix}${kind}${name}${optional}`;
}

function membersOf(node) {
  const members = [];
  for (const member of node.members ?? []) {
    if (ts.isSemicolonClassElement(member)) continue;
    if (isPrivate(member)) continue;
    members.push(label(member));
  }
  return [...new Set(members)].sort();
}

/** Base-type names of a class/interface declaration, ignoring `implements`. */
function baseNames(node) {
  const out = [];
  for (const clause of node.heritageClauses ?? []) {
    if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
    for (const type of clause.types) {
      const expr = type.expression;
      if (ts.isIdentifier(expr)) out.push(expr.text);
    }
  }
  return out;
}

/**
 * Index every class/interface declaration in src/, public or not.
 *
 * Inheritance is the reason this index covers non-public declarations too:
 * `World extends WorldCore`, and `WorldCore` is not itself exported, so a new
 * method landing on the base is public surface on the derived class while
 * being invisible to a scan bounded by the export list. That bound would be a
 * horizon — a gate that is green because it stops before where the defect
 * lives — so members are resolved through `extends` before the public filter
 * is applied. Not followed: `implements` (not surface), and bases imported
 * from outside src/ (there are none; the package has zero runtime deps).
 */
function indexDeclarations(root) {
  const index = new Map();
  for (const file of sourceFiles(root)) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.ES2022,
      true,
    );
    for (const statement of source.statements) {
      const declName = statement.name?.getText?.();
      if (!declName) continue;
      if (ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
        const own = index.get(declName);
        // Same name declared twice (declaration merging) contributes both.
        index.set(declName, {
          members: [...(own?.members ?? []), ...membersOf(statement)],
          bases: [...(own?.bases ?? []), ...baseNames(statement)],
        });
      } else if (ts.isTypeAliasDeclaration(statement) && ts.isTypeLiteralNode(statement.type)) {
        index.set(declName, { members: membersOf(statement.type), bases: [] });
      }
    }
  }
  return index;
}

function resolveMembers(name, index, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const decl = index.get(name);
  if (!decl) return [];
  const members = [...decl.members];
  for (const base of decl.bases) members.push(...resolveMembers(base, index, seen));
  return members;
}

/**
 * Map every publicly exported class / interface / object-type-alias to its
 * member labels, inherited members included. Keyed by declared name; a
 * declaration whose name is not in the top-level public list is skipped,
 * because it is not reachable surface.
 */
export function scanSurfaceMembers({ root = SRC, names = publicNames() } = {}) {
  const index = indexDeclarations(root);
  const surface = {};
  for (const name of index.keys()) {
    if (!names.has(name)) continue;
    surface[name] = [...new Set(resolveMembers(name, index))].sort();
  }
  return Object.fromEntries(Object.entries(surface).sort(([a], [b]) => (a < b ? -1 : 1)));
}

export function readFixture(fixturePath = FIXTURE) {
  return JSON.parse(readFileSync(fixturePath, "utf8"));
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const scanned = scanSurfaceMembers();
  if (process.argv.includes("--update")) {
    writeFileSync(FIXTURE, `${JSON.stringify(scanned, null, 2)}\n`);
    console.log(`Wrote ${FIXTURE}: ${Object.keys(scanned).length} public declarations.`);
  } else {
    console.log(JSON.stringify(scanned, null, 2));
  }
}
