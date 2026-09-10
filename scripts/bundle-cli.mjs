import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function readPackageMetadata(path) {
  const value = JSON.parse(await readFile(path, 'utf8'));
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof value.version !== 'string' ||
    typeof value.dependencies !== 'object' ||
    value.dependencies === null
  ) {
    throw new Error(`${path} does not contain valid release metadata.`);
  }
  return value;
}

const repositoryRoot = resolve(import.meta.dirname, '..');
const rootMetadata = await readPackageMetadata(resolve(repositoryRoot, 'package.json'));
const cliMetadata = await readPackageMetadata(resolve(repositoryRoot, 'packages/cli/package.json'));
if (rootMetadata.version !== cliMetadata.version) {
  throw new Error(
    `Release version mismatch: apibox is ${rootMetadata.version}, @apibox/cli is ${cliMetadata.version}.`,
  );
}

const result = await Bun.build({
  entrypoints: [resolve(repositoryRoot, 'packages/cli/src/index.ts')],
  outdir: resolve(repositoryRoot, 'packages/cli/dist'),
  naming: 'index.js',
  target: 'bun',
  format: 'esm',
  external: Object.keys(rootMetadata.dependencies),
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  throw new Error('Could not bundle the release CLI.');
}

console.log(`Bundled the apibox ${rootMetadata.version} release CLI.`);
