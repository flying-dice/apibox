import type { FormatId, Manifest } from '@apibox/core';
export interface BuildOptions {
    inputs: readonly string[];
    outDir: string;
    title?: string;
    base?: string;
    /**
     * Force the format for every input, rather than relying on detection. This is the
     * `--format` CLI flag — the only way to build a JSON Schema document that omits
     * `$schema` (decisions/08-json-schema-as-fourth-format.md).
     */
    format?: FormatId;
    cwd?: string;
    assetDir?: string;
    generatedAt?: string;
    generator?: string;
}
export interface BuildResult {
    outDir: string;
    manifest: Manifest;
}
export declare function buildSite(options: BuildOptions): Promise<BuildResult>;
