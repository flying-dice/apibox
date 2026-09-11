import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildSite } from './build.js';
import { loadConfig } from './config.js';
import { FORMAT_IDS, parseFormat } from './format.js';
const HELP = `Usage:
  apibox build <inputs...> [--out ./site] [--title "API docs"] [--base ./] [--format <${FORMAT_IDS.join('|')}>] [--asset-dir ./shell]
  apibox init [path]
`;
const CONSOLE_IO = {
    stdout: (message) => console.log(message),
    stderr: (message) => console.error(message),
};
export async function runCli(args, io = CONSOLE_IO, cwd = process.cwd()) {
    try {
        const [command, ...rest] = args;
        if (!command || command === '--help' || command === '-h') {
            io.stdout(HELP);
            return 0;
        }
        if (command === 'build')
            return await runBuild(rest, io, cwd);
        if (command === 'init')
            return await runInit(rest, io, cwd);
        throw new Error(`Unknown command: ${command}`);
    }
    catch (error) {
        io.stderr(error instanceof Error ? error.message : String(error));
        return 1;
    }
}
async function runBuild(args, io, cwd) {
    const parsed = parseBuildArguments(args);
    const config = await loadConfig(cwd);
    const result = await buildSite({
        cwd,
        inputs: parsed.inputs.length > 0 ? parsed.inputs : (config?.inputs ?? []),
        outDir: parsed.outDir ?? config?.out ?? './site',
        title: parsed.title ?? config?.title,
        base: parsed.base ?? config?.base,
        format: parsed.format ?? config?.format,
        assetDir: parsed.assetDir,
    });
    io.stdout(`Built ${result.manifest.documents.length} document(s) in ${result.outDir}`);
    return 0;
}
async function runInit(args, io, cwd) {
    if (args.length > 1)
        throw new Error('The init command accepts at most one path.');
    const path = resolve(cwd, args[0] ?? 'apibox.config.ts');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `import type { ApiBoxConfig } from 'apibox';\n\nexport default {\n  inputs: ['examples/*.yaml'],\n  out: './site',\n  title: 'API documentation',\n  base: './',\n} satisfies ApiBoxConfig;\n`, { encoding: 'utf8', flag: 'wx' });
    io.stdout(`Created ${path}`);
    return 0;
}
function parseBuildArguments(args) {
    const inputs = [];
    let outDir;
    let title;
    let base;
    let format;
    let assetDir;
    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index];
        if (argument === undefined)
            break;
        if (!argument.startsWith('-')) {
            inputs.push(argument);
            continue;
        }
        const [flag, inlineValue] = argument.split('=', 2);
        if (!['--out', '--title', '--base', '--format', '--asset-dir'].includes(flag ?? '')) {
            throw new Error(`Unknown option: ${flag}`);
        }
        const value = inlineValue ?? args[++index];
        if (!value || value.startsWith('--'))
            throw new Error(`Missing value for ${flag}`);
        if (flag === '--out')
            outDir = value;
        if (flag === '--title')
            title = value;
        if (flag === '--base')
            base = value;
        if (flag === '--format')
            format = parseFormat(value);
        // Builds the site around a shell other than the one shipped in `assets/viewer`. The
        // published CLI never needs this — see decisions/03-cli-ships-a-prebuilt-shell.md — but
        // developing the viewer does, because the shipped shell is a committed build artefact
        // that a working copy of the UI has already moved past.
        if (flag === '--asset-dir')
            assetDir = value;
    }
    return { inputs, outDir, title, base, format, assetDir };
}
