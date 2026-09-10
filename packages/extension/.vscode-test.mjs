import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.test.js',
  workspaceFolder: '../../examples',
  version: '1.136.2',
  launchArgs: ['--disable-extensions', '--user-data-dir', join(tmpdir(), 'apibox-vscode-test')],
  mocha: { ui: 'bdd', timeout: 60_000 },
});
