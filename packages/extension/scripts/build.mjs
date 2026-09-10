import { rm } from 'node:fs/promises';
import { build, context } from 'esbuild';

process.exitCode = await runBuild(process.argv.slice(2));

async function runBuild(buildArguments) {
  const unknownBuildArgument = buildArguments.find((argument) => argument !== '--watch');
  if (unknownBuildArgument !== undefined) {
    console.error(`Unknown build option: ${unknownBuildArgument}`);
    return 1;
  }

  await Promise.all(
    ['dist/extension.cjs', 'dist/extension.cjs.map'].map((path) => rm(path, { force: true })),
  );

  const options = {
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    external: ['vscode'],
    // Prefer dependency ESM entries. Some UMD mains contain runtime-relative requires
    // that cannot survive being folded into one extension bundle.
    mainFields: ['module', 'main'],
    banner: {
      js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
    },
    sourcemap: true,
  };

  if (buildArguments.includes('--watch')) {
    console.log('Starting APIBox extension development mode');
    const buildContext = await context(options);
    await buildContext.watch();
    console.log('APIBox extension build ready; watching for changes');
  } else {
    await build(options);
  }
  return 0;
}
