import { isAbsolute, relative, resolve, sep } from 'node:path';
import { glob } from 'tinyglobby';

const GLOB_MAGIC = /[*?{[]/;

export async function expandInputs(inputs: readonly string[], cwd: string): Promise<string[]> {
  const expanded: string[] = [];
  for (const input of inputs) {
    if (isUrl(input) || !GLOB_MAGIC.test(input)) {
      expanded.push(isUrl(input) ? input : resolve(cwd, input));
      continue;
    }
    const matches = await expandGlob(input, cwd);
    if (matches.length === 0) throw new Error(`Input pattern matched no files: ${input}`);
    expanded.push(...matches);
  }
  return [...new Set(expanded)];
}

function isUrl(input: string): boolean {
  return /^https?:\/\//i.test(input);
}

async function expandGlob(input: string, cwd: string): Promise<string[]> {
  const pattern = isAbsolute(input) ? relative(cwd, input).split(sep).join('/') : input;
  const matches = await glob(pattern, { cwd, absolute: true, onlyFiles: true });
  return matches.sort((left, right) => left.localeCompare(right));
}
