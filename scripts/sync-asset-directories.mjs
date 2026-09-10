import { access, cp, mkdtemp, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function syncAssetDirectories(mappings, stagingPrefix) {
  await Promise.all(mappings.map(({ source }) => access(source)));
  const stagingRoot = await mkdtemp(stagingPrefix);
  const stagedMappings = mappings.map((mapping, index) => ({
    ...mapping,
    staged: resolve(stagingRoot, String(index)),
  }));

  try {
    await Promise.all(
      stagedMappings.map(({ source, staged }) => cp(source, staged, { recursive: true })),
    );
    for (const { destination, staged } of stagedMappings) {
      await rm(destination, { recursive: true, force: true });
      await rename(staged, destination);
    }
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}
