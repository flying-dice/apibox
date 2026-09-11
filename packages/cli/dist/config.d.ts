import type { FormatId } from '@apibox/core';
export interface ApiBoxConfig {
    readonly inputs: readonly string[];
    readonly out: string;
    readonly title?: string;
    readonly base?: string;
    /** Force the format for every input — see `ApiBoxConfig` consumers for the CLI `--format` flag. */
    readonly format?: FormatId;
}
export declare function loadConfig(cwd: string): Promise<ApiBoxConfig | undefined>;
