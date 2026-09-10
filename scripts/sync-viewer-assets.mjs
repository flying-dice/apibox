import { resolve } from 'node:path';
import { syncAssetDirectories } from './sync-asset-directories.mjs';

await syncAssetDirectories(
  [
    {
      source: resolve('packages/viewer/dist'),
      destination: resolve('packages/cli/assets/viewer'),
    },
  ],
  '.apibox-viewer-assets-',
);
