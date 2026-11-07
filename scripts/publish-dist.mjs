import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const runGh = (args) => spawnSync('gh', args, { encoding: 'utf8', shell: false });

/** Retain commit-addressed bytes before updating the compatibility alias. */
export function publishDist({ repository, sha, artifactPath, run = runGh }) {
  if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('A full lowercase commit SHA is required');
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(repository ?? '')) {
    throw new Error('A repository in owner/name form is required');
  }
  const asset = `civ-engine-${sha}.tgz`;
  const root = mkdtempSync(join(tmpdir(), 'civ-engine-dist-'));
  try {
    const rolling = join(root, 'civ-engine.tgz');
    const archive = join(root, asset);
    const existing = join(root, 'existing');
    mkdirSync(existing);
    copyFileSync(artifactPath, rolling);
    copyFileSync(rolling, archive);
    const sha256 = digest(archive);
    const download = run(['release', 'download', 'engine-dist', '--repo', repository, '--pattern', asset, '--dir', existing]);
    const reused = download.status === 0;
    if (reused) {
      if (digest(join(existing, asset)) !== sha256) {
        throw new Error(`Refusing different bytes for existing ${asset}`);
      }
    } else {
      // A failed download may also mean network/auth failure or a race. Never
      // clobber: if the asset already exists the upload fails closed as well.
      upload(archive, false);
    }
    upload(rolling, true);
    return { asset, sha256, reused };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  function upload(file, clobber) {
    const args = ['release', 'upload', 'engine-dist', file, '--repo', repository];
    if (clobber) args.push('--clobber');
    const result = run(args);
    if (result.status !== 0) {
      throw new Error(`Release upload failed: ${result.error?.message ?? result.stderr ?? `exit ${result.status}`}`);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const result = publishDist({ repository: process.env.GITHUB_REPOSITORY, sha: process.env.GITHUB_SHA, artifactPath: 'civ-engine.tgz' });
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
