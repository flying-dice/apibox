import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import packageJson from '../package.json' with { type: 'json' };

const extensionRoot = resolve(import.meta.dirname, '..');

/**
 * Directories that `scripts/sync-assets.mjs` replaces wholesale on every build. Anything
 * hand-authored inside one of these is deleted the next time someone runs the extension,
 * which is exactly how the activity bar icon went missing once already: it was committed
 * to `media/`, survived review and tests, and then vanished on the first `dev:extension`.
 */
const MACHINE_OWNED_DIRECTORIES = ['media', 'static-viewer'];

function contributedAssetPaths(): string[] {
  const containers = packageJson.contributes?.viewsContainers?.activitybar ?? [];
  return containers.map((container) => container.icon).filter((icon): icon is string => !!icon);
}

describe('package.json asset contributions', () => {
  it('references at least one asset, so the checks below cannot pass vacuously', () => {
    expect(contributedAssetPaths().length).toBeGreaterThan(0);
  });

  it.each(contributedAssetPaths())('%s exists on disk', async (assetPath) => {
    await expect(access(resolve(extensionRoot, assetPath))).resolves.toBeUndefined();
  });

  it.each(contributedAssetPaths())('%s is not in a directory the build wipes', (assetPath) => {
    const [topLevel] = assetPath.split('/');
    expect(MACHINE_OWNED_DIRECTORIES).not.toContain(topLevel);
  });
});
