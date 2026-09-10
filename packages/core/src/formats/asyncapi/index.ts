import { Parser } from '@asyncapi/parser';
import { UnsupportedDocumentError } from '../../detect.js';
import { normaliseSchema } from '../../schema.js';
import type {
  AsyncApiDocument,
  ChannelOperation,
  MessageInfo,
  NavNode,
  Parameter,
  SchemaNode,
  ServerInfo,
  TagInfo,
} from '../../types.js';
import { slugify, uniqueId } from '../../utils.js';
import { parseContact, schemaNavigation } from '../shared.js';

export interface ParseAsyncApiOptions {
  id?: string;
}

/**
 * Parse an AsyncAPI document.
 *
 * `@asyncapi/parser` presents 2.x and 3.x documents through one interface, which is the
 * whole reason it is worth the dependency — most AsyncAPI in the wild is still 2.x, and
 * we would otherwise have to model both shapes ourselves.
 */
export async function parseAsyncApi(
  raw: unknown,
  options: ParseAsyncApiOptions = {},
): Promise<AsyncApiDocument> {
  const parser = new Parser();
  const { document, diagnostics } = await parser.parse(raw as never);

  const warnings = diagnostics
    .filter((d) => d.severity <= 1) // 0 = error, 1 = warning
    .map((d) => `${d.message}${d.path?.length ? ` (at ${d.path.join('.')})` : ''}`);

  if (!document) {
    throw new UnsupportedDocumentError(
      `The AsyncAPI document could not be parsed.${warnings.length ? ` ${warnings[0]}` : ''}`,
    );
  }

  const info = document.info();
  const title = info.title() ?? 'Untitled API';
  const version = info.version() ?? '0.0.0';

  const servers: ServerInfo[] = document
    .servers()
    .all()
    .map((server) => ({
      name: server.id(),
      url: safe(() => server.url()) ?? server.host?.() ?? '',
      description: server.description(),
      protocol: server.protocol(),
    }));

  const tags: TagInfo[] = document
    .info()
    .tags()
    .all()
    .map((tag) => ({ name: tag.name(), description: tag.description() }));

  const taken = new Set<string>();
  const operations: ChannelOperation[] = document
    .operations()
    .all()
    .map((operation) => {
      const channel = operation.channels().all()[0];
      const action = operation.action();
      return {
        id: uniqueId(slugify(operation.id() ?? `${action}-${channel?.id() ?? 'channel'}`), taken),
        // AsyncAPI 2.x speaks of publish/subscribe from the application's point of view;
        // 3.x settled on send/receive. Map the old spelling onto the new one.
        action: action === 'send' || action === 'publish' ? 'send' : 'receive',
        channelAddress: channel?.address() ?? channel?.id() ?? '',
        channelTitle: channel ? safe(() => readTitle(channel)) : undefined,
        summary: operation.summary(),
        description: operation.description(),
        parameters: channel ? parseChannelParameters(channel) : [],
        messages: operation
          .messages()
          .all()
          .map((message) => toMessageInfo(message)),
      } satisfies ChannelOperation;
    });

  const schemas: SchemaNode[] = document
    .components()
    .schemas()
    .all()
    .map((schema) => normaliseSchema(schema.json(), {}, schema.id()))
    .filter((node): node is SchemaNode => Boolean(node));

  return {
    id: options.id ?? slugify(title),
    kind: 'asyncapi',
    specVersion: document.version(),
    title,
    version,
    description: info.description(),
    contact: parseContact(
      info.contact()
        ? {
            name: info.contact()?.name(),
            url: info.contact()?.url(),
            email: info.contact()?.email(),
          }
        : undefined,
    ),
    license: info.license() ? { name: info.license()?.name() ?? '' } : undefined,
    servers,
    tags,
    operations,
    schemas,
    nav: buildNav(operations, schemas),
    warnings,
  };
}

/** AsyncAPI 2.x channels have no title; the accessor only exists on the 3.x model. */
function readTitle(channel: unknown): string | undefined {
  const titled = channel as { title?: () => string | undefined };
  return typeof titled.title === 'function' ? titled.title() : undefined;
}

/** Channel parameters are always path-shaped: they are substituted into the address. */
// biome-ignore lint/suspicious/noExplicitAny: the parser's channel model is structurally typed
function parseChannelParameters(channel: any): Parameter[] {
  const parameters = safe(() => channel.parameters().all()) ?? [];
  // biome-ignore lint/suspicious/noExplicitAny: as above
  return parameters.map((parameter: any) => ({
    name: parameter.id(),
    in: 'path' as const,
    description: safe(() => parameter.description()),
    required: true,
    schema: normaliseSchema(parameterSchema(parameter)),
  }));
}

/**
 * Read a channel parameter's schema.
 *
 * AsyncAPI 2.x nests a full JSON Schema under the Parameter Object's `schema`; 3.x dropped
 * that and describes the parameter inline with `enum`, `default` and friends. Normalising
 * the v2 Parameter Object itself yields an untyped node, so prefer the nested schema when
 * the model offers one.
 */
// biome-ignore lint/suspicious/noExplicitAny: the parser's parameter model is structurally typed
function parameterSchema(parameter: any): unknown {
  const nested = safe(() => parameter.schema?.()?.json());
  return nested ?? safe(() => parameter.json());
}

// biome-ignore lint/suspicious/noExplicitAny: the parser's message model is structurally typed
function toMessageInfo(message: any): MessageInfo {
  return {
    name: message.id?.() ?? message.name?.() ?? 'message',
    title: safe(() => message.title()),
    summary: safe(() => message.summary()),
    description: safe(() => message.description()),
    contentType: safe(() => message.contentType()),
    payload: normaliseSchema(safe(() => message.payload()?.json())),
    headers: normaliseSchema(safe(() => message.headers()?.json())),
  };
}

/**
 * The parser's model throws rather than returning undefined for accessors a given spec
 * version does not have, so optional reads go through this.
 */
function safe<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

/** Group by direction: what the application sends, and what it receives. */
function buildNav(operations: ChannelOperation[], schemas: SchemaNode[]): NavNode[] {
  const nav: NavNode[] = [];

  for (const action of ['receive', 'send'] as const) {
    const group = operations.filter((operation) => operation.action === action);
    if (group.length === 0) continue;
    nav.push({
      id: `action-${action}`,
      label: action === 'receive' ? 'Receive' : 'Send',
      children: group.map((operation) => ({
        id: operation.id,
        label: operation.summary ?? operation.channelTitle ?? operation.channelAddress,
        badge: action.toUpperCase(),
        badgeKind: action,
      })),
    });
  }

  const schemasNode = schemaNavigation(schemas);
  if (schemasNode) nav.push(schemasNode);

  return nav;
}
