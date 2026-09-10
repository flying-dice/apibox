import { resolve } from 'node:path';
import { syncAssetDirectories } from '../../../scripts/sync-asset-directories.mjs';

const mappings = [
  { source: resolve('../viewer/dist-webview'), destination: resolve('media') },
  { source: resolve('../cli/assets/viewer'), destination: resolve('static-viewer') },
];

await syncAssetDirectories(mappings, '.apibox-assets-');
