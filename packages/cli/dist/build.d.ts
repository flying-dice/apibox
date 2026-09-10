import type { Manifest } from '@apibox/core';
export interface BuildOptions {
    inputs: readonly string[];
    outDir: string;
    title?: string;
    base?: string;
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
