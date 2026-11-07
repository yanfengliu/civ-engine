import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publishDist, type CommandResult } from '../scripts/publish-dist.mjs';

const sha = '1234567890abcdef1234567890abcdef12345678';
const asset = `civ-engine-${sha}.tgz`;
const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true }); });

function fixture(existing?: string, fail?: 'archive' | 'rolling') {
  const root = mkdtempSync(join(tmpdir(), 'engine-publish-test-'));
  roots.push(root);
  const artifactPath = join(root, 'input.tgz');
  writeFileSync(artifactPath, 'verified tarball');
  const calls: string[][] = [];
  let taskTemp = '';
  const run = (args: string[]): CommandResult => {
    calls.push(args);
    expect(args).toContain('--repo');
    expect(args[args.indexOf('--repo') + 1]).toBe('owner/engine');
    if (args[1] === 'download') {
      expect(args[args.indexOf('--pattern') + 1]).toBe(asset);
      const directory = args[args.indexOf('--dir') + 1];
      taskTemp = join(directory, '..');
      if (existing === undefined) return { status: 1, stderr: 'no matching asset' };
      writeFileSync(join(directory, asset), existing);
      return { status: 0 };
    }
    const archive = !args.includes('--clobber');
    const uploaded = args[3];
    expect(uploaded.endsWith(archive ? asset : 'civ-engine.tgz')).toBe(true);
    expect(readFileSync(uploaded, 'utf8')).toBe('verified tarball');
    if (fail === (archive ? 'archive' : 'rolling')) return { status: 1, stderr: 'upload rejected' };
    return { status: 0 };
  };
  const publish = () => publishDist({ repository: 'owner/engine', sha, artifactPath, run });
  return { artifactPath, calls, publish, run, tempExists: () => existsSync(taskTemp) };
}

describe('retained prebuilt engine publication', () => {
  it('archives exact bytes before refreshing the rolling asset without clobbering the archive', () => {
    const f = fixture();
    expect(f.publish()).toMatchObject({ asset, reused: false });
    expect(f.calls.map((args) => args[1])).toEqual(['download', 'upload', 'upload']);
    expect(f.calls[1]).not.toContain('--clobber');
    expect(f.calls[2]).toContain('--clobber');
    expect(f.tempExists()).toBe(false);
    expect(readFileSync(f.artifactPath, 'utf8')).toBe('verified tarball');
  });

  it('reuses an existing byte-identical archive on rerun', () => {
    const f = fixture('verified tarball');
    expect(f.publish()).toMatchObject({ asset, reused: true });
    expect(f.calls.map((args) => args[1])).toEqual(['download', 'upload']);
    expect(f.calls[1]).toContain('--clobber');
    expect(f.tempExists()).toBe(false);
  });

  it('refuses changed bytes under an existing source SHA before any upload', () => {
    const f = fixture('different bytes');
    expect(f.publish).toThrow(/different bytes/);
    expect(f.calls.map((args) => args[1])).toEqual(['download']);
    expect(f.tempExists()).toBe(false);
  });

  it('never refreshes rolling when archive publication fails, including a download race', () => {
    const f = fixture(undefined, 'archive');
    expect(f.publish).toThrow(/upload rejected/);
    expect(f.calls.map((args) => args[1])).toEqual(['download', 'upload']);
    expect(f.calls[1]).not.toContain('--clobber');
    expect(f.tempExists()).toBe(false);
  });

  it('reports rolling failure after retaining the archive and cleans temporary files', () => {
    const f = fixture(undefined, 'rolling');
    expect(f.publish).toThrow(/upload rejected/);
    expect(f.calls).toHaveLength(3);
    expect(f.tempExists()).toBe(false);
  });

  it('cleans temporary files when the command runner throws', () => {
    const f = fixture();
    expect(() => publishDist({ repository: 'owner/engine', sha, artifactPath: f.artifactPath, run: (args) => {
      f.run(args);
      throw new Error('runner unavailable');
    } })).toThrow(/runner unavailable/);
    expect(f.calls).toHaveLength(1);
    expect(f.tempExists()).toBe(false);
  });

  it.each(['main', '../bad', 'a'.repeat(39), 'a'.repeat(41)])('rejects non-full commit identity %s', (badSha) => {
    const f = fixture();
    expect(() => publishDist({ repository: 'owner/engine', sha: badSha, artifactPath: f.artifactPath, run: f.run })).toThrow(/commit SHA/);
    expect(f.calls).toEqual([]);
  });

  it.each(['--flag', '../repo', 'owner/repo/extra', 'owner/../repo'])('rejects repository injection %s', (repository) => {
    const f = fixture();
    expect(() => publishDist({ repository, sha, artifactPath: f.artifactPath, run: f.run })).toThrow(/repository/);
    expect(f.calls).toEqual([]);
  });

  it('binds the production workflow to the tested publisher after the existing release creation', () => {
    const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(workflow).toContain('node scripts/publish-dist.mjs');
    expect(workflow).toContain('needs: test');
    expect(workflow).not.toContain('gh release upload engine-dist civ-engine.tgz --clobber');
  });
});
