import { resolve } from 'node:path';
import { syncAssetDirectories } from '../../../scripts/sync-asset-directories.mjs';

/*
 * Both destinations are REPLACED WHOLESALE on every sync — syncAssetDirectories removes the
 * destination before renaming the staged copy into place. Nothing hand-authored may live in
 * `media/` or `static-viewer/`: it will be deleted the next time anyone runs a build or
 * `bun run dev:extension`. Hand-authored assets belong in `icons/`.
 */
const mappings = [
  { source: resolve('../viewer/dist-webview'), destination: resolve('media') },
  { source: resolve('../cli/assets/viewer'), destination: resolve('static-viewer') },
];

await syncAssetDirectories(mappings, '.apibox-assets-');
