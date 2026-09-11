import type { FormatId } from '@apibox/core';
/** Every value `ParseOptions.format` accepts — kept in sync with `@apibox/core`'s `FormatId`. */
export declare const FORMAT_IDS: readonly FormatId[];
/** Parse and validate a `--format` value, failing with a message that lists the valid options. */
export declare function parseFormat(value: string): FormatId;
