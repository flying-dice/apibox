export interface ApiBoxConfig {
    readonly inputs: readonly string[];
    readonly out: string;
    readonly title?: string;
    readonly base?: string;
}
export declare function loadConfig(cwd: string): Promise<ApiBoxConfig | undefined>;
