export interface CliIo {
    stdout(message: string): void;
    stderr(message: string): void;
}
export declare function runCli(args: readonly string[], io?: CliIo, cwd?: string): Promise<number>;
