import { build, context } from 'esbuild';

process.exitCode = await runBuild(process.argv.slice(2));

async function runBuild(buildArguments) {
  const unknownBuildArgument = buildArguments.find((argument) => argument !== '--watch');
  if (unknownBuildArgument !== undefined) {
    console.error(`Unknown build option: ${unknownBuildArgument}`);
    return 1;
  }

  const options = {
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    external: ['vscode'],
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
