import type { FormatId } from '@apibox/core';

/** Every value `ParseOptions.format` accepts — kept in sync with `@apibox/core`'s `FormatId`. */
export const FORMAT_IDS: readonly FormatId[] = ['openapi', 'asyncapi', 'jsonrpc', 'jsonschema'];

/** Parse and validate a `--format` value, failing with a message that lists the valid options. */
export function parseFormat(value: string): FormatId {
  if (!FORMAT_IDS.includes(value as FormatId)) {
    throw new Error(`Unknown format: ${value}. Expected one of: ${FORMAT_IDS.join(', ')}.`);
  }
  return value as FormatId;
}
