import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runCli } from './cli.js';

/**
 * The CLI entry used from source, via `bun run dev:cli`.
 *
 * A published CLI run copies the viewer shell committed to `packages/cli/assets/viewer`,
 * which is deliberate: decisions/03-cli-ships-a-prebuilt-shell.md keeps a real user's build
 * to file I/O with no toolchain. In this repository that same shell is a build artefact
 * written only by CI, so it lags behind any uncommitted change to `@apibox/ui` or
 * `@apibox/viewer` — and a developer checking their own UI change in a generated site sees
 * the last released shell instead, with nothing to indicate it is stale. That silently
 * turns a working change into a seemingly broken one.
 *
 * So the dev entry builds the viewer first and points the build at its fresh output. The
 * web build is around 200ms, cheap enough to do unconditionally rather than trying to guess
 * whether the committed assets are out of date. The committed assets are never written to
 * here, which keeps them CI-owned and keeps a dev run from dirtying the working tree.
 */

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const VIEWER_DIR = fileURLToPath(new URL('../../viewer', import.meta.url));
const VIEWER_DIST = fileURLToPath(new URL('../../viewer/dist', import.meta.url));

const args = process.argv.slice(2);

if (needsFreshShell(args)) {
  buildViewer();
  args.push('--asset-dir', VIEWER_DIST);
}

process.exitCode = await runCli(args);

/**
 * Only `build` copies the shell, and only when the caller has not named one themselves, so
 * `--help` and `init` stay instant.
 */
function needsFreshShell(argv: readonly string[]): boolean {
  if (argv[0] !== 'build') return false;
  return !argv.some(
    (argument) => argument === '--asset-dir' || argument.startsWith('--asset-dir='),
  );
}

function buildViewer(): void {
  process.stderr.write('apibox: rebuilding the viewer shell from source...\n');
  const result = spawnSync('bun', ['run', '--cwd', VIEWER_DIR, 'build:web'], {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (result.status !== 0) {
    throw new Error(
      'Failed to build the viewer shell. Fix the build, or pass --asset-dir to point at a ' +
        'shell you have already built.',
    );
  }
  if (!existsSync(VIEWER_DIST)) {
    throw new Error(`The viewer build reported success but produced no output at ${VIEWER_DIST}.`);
  }
}
