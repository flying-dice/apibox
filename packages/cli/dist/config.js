import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FORMAT_IDS } from './format.js';
const CONFIG_FILENAMES = [
    'apibox.config.ts',
    'apibox.config.mts',
    'apibox.config.js',
    'apibox.config.mjs',
];
export async function loadConfig(cwd) {
    for (const filename of CONFIG_FILENAMES) {
        const path = resolve(cwd, filename);
        if (!(await exists(path)))
            continue;
        const module = (await import(`${pathToFileURL(path).href}?t=${Date.now()}`));
        if (!isConfig(module.default))
            throw new Error(`${filename} does not export a valid config.`);
        return module.default;
    }
    return undefined;
}
async function exists(path) {
    try {
        await access(path);
        return true;
    }
    catch (error) {
        if (isNodeError(error) && error.code === 'ENOENT')
            return false;
        throw error;
    }
}
function isConfig(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'inputs' in value &&
        Array.isArray(value.inputs) &&
        value.inputs.every((input) => typeof input === 'string') &&
        'out' in value &&
        typeof value.out === 'string' &&
        (!('title' in value) || value.title === undefined || typeof value.title === 'string') &&
        (!('base' in value) || value.base === undefined || typeof value.base === 'string') &&
        (!('format' in value) ||
            value.format === undefined ||
            FORMAT_IDS.includes(value.format)));
}
function isNodeError(error) {
    return error instanceof Error && 'code' in error;
}
