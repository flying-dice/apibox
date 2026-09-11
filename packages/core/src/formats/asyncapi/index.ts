import { Parser } from '@asyncapi/parser';
import { UnsupportedDocumentError } from '../../detect.js';
import { normaliseSchema } from '../../schema.js';
import type {
  AsyncApiDocument,
  ChannelInfo,
  ChannelOperation,
  ExampleValue,
  ExternalDocs,
  MessageInfo,
  NavNode,
  OperationReplyInfo,
  Parameter,
  SchemaNode,
  SecurityRequirement,
  SecuritySchemeInfo,
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
 *
 * Note on dereferencing: unlike OpenAPI and OpenRPC, this does not go through the shared
 * `dereferenceDocument` helper in `../shared.js`. `@asyncapi/parser` does its own
 * resolution as part of `parser.parse`, and every accessor used below (`.address()`,
 * `.payload()`, etc.) already returns post-resolution values — there is no second pass to
 * run.
 *
 * This was checked empirically against a broken `$ref` (both an unreachable external URL
 * and a dangling internal pointer) and the result is a confirmed parity gap, not merely an
 * unverified difference: `@asyncapi/parser` throws and abandons the *entire* document on
 * either failure, where `dereferenceDocument`'s `continueOnError` lets OpenAPI/OpenRPC
 * salvage everything except the broken reference. A single bad `$ref` anywhere in an
 * AsyncAPI document currently makes the whole document fail to load in apibox, which
 * `UnsupportedDocumentError` below reports as an (unhelpfully blunt) parse failure. Fixing
 * this would mean either pre-resolving refs through the shared helper before handing the
 * document to `@asyncapi/parser`, or catching the specific resolver failure and retrying
 * with the offending pointer stubbed out — both are a meaningfully larger change than the
 * rest of this file, so this is left as a confirmed, reported gap rather than fixed here.
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

  // The AsyncAPI default for `schemaFormat` when a payload/headers schema does not declare
  // one, per the spec: `application/vnd.aai.asyncapi;version=<the document's own version>`.
  // Anything else is not JSON Schema and must not be walked as one.
  const defaultSchemaFormat = `application/vnd.aai.asyncapi;version=${document.version()}`;

  const securitySchemeModels = document.components().securitySchemes().all();
  const securitySchemes: SecuritySchemeInfo[] = securitySchemeModels.map(toSecuritySchemeInfo);
  // A security requirement referencing `#/components/securitySchemes/foo` resolves to the
  // very same object the component itself parses to, so identity recovers the name -- the
  // requirement's own model otherwise has no name, only the scheme's content (see
  // `toSecuritySchemeInfo`'s `SecurityScheme.id()`, which the library hard-codes to `''`
  // for a requirement-referenced scheme).
  const securitySchemeNames = new Map(
    securitySchemeModels.map((scheme) => [scheme.json(), scheme.id()]),
  );

  const servers: ServerInfo[] = document
    .servers()
    .all()
    .map((server) => ({
      name: server.id(),
      url: safe(() => server.url()) ?? server.host?.() ?? '',
      description: server.description(),
      protocol: server.protocol(),
      variables: nonEmpty(
        safe(() => server.variables().all())?.map((variable) => ({
          name: variable.id(),
          default: variable.hasDefaultValue() ? variable.defaultValue() : undefined,
          description: safe(() => variable.description()),
          enum: variable.hasAllowedValues() ? variable.allowedValues() : undefined,
        })),
      ),
      security: toSecurityRequirements(
        safe(() => server.security()),
        securitySchemeNames,
      ),
    }));

  const tags: TagInfo[] = document
    .info()
    .tags()
    .all()
    .map((tag) => ({
      name: tag.name(),
      description: safe(() => tag.description()),
      externalDocs: tag.hasExternalDocs() ? toExternalDocs(tag.externalDocs()) : undefined,
    }));

  const taken = new Set<string>();
  const operations: ChannelOperation[] = document
    .operations()
    .all()
    .map((operation) => {
      const channel = operation.channels().all()[0];
      const action = operation.action();
      const reply = safe(() => operation.reply());
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
          .map((message) =>
            toMessageInfo(message, document.defaultContentType(), defaultSchemaFormat, warnings),
          ),
        security: toSecurityRequirements(
          safe(() => operation.security()),
          securitySchemeNames,
        ),
        tags: nonEmpty(
          safe(() =>
            operation
              .tags()
              .all()
              .map((tag) => tag.name()),
          ),
        ),
        channelServers: channel
          ? nonEmpty(
              safe(() =>
                channel
                  .servers()
                  .all()
                  .map((server) => server.id()),
              ),
            )
          : undefined,
        reply: reply
          ? ({
              channelAddress: safe(() => reply.channel()?.address() ?? reply.channel()?.id()),
              addressLocation: safe(() => reply.address()?.location()),
              addressDescription: safe(() => reply.address()?.description()),
              messages: (safe(() => reply.messages().all()) ?? []).map((message) =>
                toMessageInfo(
                  message,
                  document.defaultContentType(),
                  defaultSchemaFormat,
                  warnings,
                ),
              ),
            } satisfies OperationReplyInfo)
          : undefined,
      } satisfies ChannelOperation;
    });

  // A channel that exists purely for documentation — no operation wired to it yet — would
  // otherwise vanish entirely, since `operations` above is built by walking operations, not
  // channels.
  const takenChannels = new Set<string>();
  const orphanChannels: ChannelInfo[] = document
    .channels()
    .all()
    .filter((channel) => (safe(() => channel.operations().all()) ?? []).length === 0)
    .map(
      (channel) =>
        ({
          id: uniqueId(slugify(channel.id()), takenChannels),
          address: channel.address() ?? channel.id(),
          title: safe(() => readTitle(channel)),
          description: safe(() => channel.description()),
          parameters: parseChannelParameters(channel),
          servers: nonEmpty(
            safe(() =>
              channel
                .servers()
                .all()
                .map((server) => server.id()),
            ),
          ),
        }) satisfies ChannelInfo,
    );

  const schemas: SchemaNode[] = document
    .components()
    .schemas()
    .all()
    .map((schema) => normaliseSchema(schema.json(), {}, schema.id()))
    .filter((node): node is SchemaNode => Boolean(node));

  const license = safe(() => info.license());

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
    license: license
      ? { name: license.name(), url: license.hasUrl() ? license.url() : undefined }
      : undefined,
    externalDocs: info.hasExternalDocs() ? toExternalDocs(info.externalDocs()) : undefined,
    termsOfService: info.hasTermsOfService() ? info.termsOfService() : undefined,
    servers,
    tags,
    operations,
    schemas,
    securitySchemes,
    defaultContentType: safe(() => document.defaultContentType()),
    orphanChannels,
    nav: buildNav(operations, orphanChannels, schemas),
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

function toMessageInfo(
  // biome-ignore lint/suspicious/noExplicitAny: the parser's message model is structurally typed
  message: any,
  defaultContentType: string | undefined,
  defaultSchemaFormat: string,
  warnings: string[],
): MessageInfo {
  const name = message.id?.() ?? message.name?.() ?? 'message';
  const payload = normalisePayloadLike(
    safe(() => message.payload()),
    defaultSchemaFormat,
  );
  const headers = normalisePayloadLike(
    safe(() => message.headers()),
    defaultSchemaFormat,
  );
  if (payload.format) {
    warnings.push(
      `Message "${name}" payload is ${payload.format}, not JSON Schema — not rendered.`,
    );
  }
  if (headers.format) {
    warnings.push(
      `Message "${name}" headers are ${headers.format}, not JSON Schema — not rendered.`,
    );
  }

  const correlationId = safe(() => message.correlationId());

  return {
    name,
    title: safe(() => message.title()),
    summary: safe(() => message.summary()),
    description: safe(() => message.description()),
    contentType: safe(() => message.contentType()) ?? defaultContentType,
    payload: payload.schema,
    payloadSchemaFormat: payload.format,
    headers: headers.schema,
    headersSchemaFormat: headers.format,
    examples: toExamples(safe(() => message.examples().all()) ?? []),
    correlationId: correlationId
      ? {
          location: safe(() => correlationId.location()),
          description: safe(() => correlationId.description()),
        }
      : undefined,
  };
}

/**
 * Normalise a payload- or headers-shaped schema, refusing to walk it as JSON Schema when its
 * `schemaFormat` says it is something else (Avro, Protobuf, RAML, ...).
 *
 * Force-walking a non-JSON-Schema payload through `normaliseSchema` would misinterpret its
 * own keywords as JSON Schema ones — an Avro `record`'s `fields` becomes a meaningless,
 * near-empty tree rather than a clear "this isn't JSON Schema" notice. Absent is more honest
 * than wrong.
 */
function normalisePayloadLike(
  // biome-ignore lint/suspicious/noExplicitAny: the parser's schema model is structurally typed
  schema: any,
  defaultSchemaFormat: string,
): { schema?: SchemaNode; format?: string } {
  if (!schema) return {};
  const format = safe(() => schema.schemaFormat()) ?? defaultSchemaFormat;
  if (format !== defaultSchemaFormat) return { format };
  return { schema: normaliseSchema(safe(() => schema.json())) };
}

// biome-ignore lint/suspicious/noExplicitAny: the parser's example model is structurally typed
function toExamples(examples: any[]): ExampleValue[] | undefined {
  if (examples.length === 0) return undefined;
  return examples.map((example, index) => ({
    name: example.hasName?.() && example.name() ? example.name() : `Example ${index + 1}`,
    summary: safe(() => example.summary()),
    value: example.hasPayload?.()
      ? example.payload()
      : (safe(() => example.headers()) ?? undefined),
  }));
}

/** Reads an AsyncAPI External Documentation Object model into the shared shape. */
function toExternalDocs(
  // biome-ignore lint/suspicious/noExplicitAny: the parser's external-docs model is structurally typed
  docs: any,
): ExternalDocs | undefined {
  if (!docs) return undefined;
  return { url: docs.url(), description: safe(() => docs.description()) };
}

/**
 * AsyncAPI's `security` (server- and operation-level) is a flat array of scheme references,
 * unlike OpenAPI's array-of-AND-maps. Each entry is its own alternative — satisfying any one
 * entry is sufficient — so each becomes a single-scheme {@link SecurityRequirement}.
 */
function toSecurityRequirements(
  // biome-ignore lint/suspicious/noExplicitAny: the parser's security-requirement model is structurally typed
  list: Array<{ all(): Array<{ scheme(): any; scopes(): string[] }> }> | undefined,
  schemeNames: Map<unknown, string>,
): SecurityRequirement[] | undefined {
  if (!list || list.length === 0) return undefined;
  return list.map((requirements) => ({
    alternatives: requirements.all().map((requirement) => {
      const scheme = requirement.scheme();
      // Falls back to the scheme's `type` for an inline (non-$ref) scheme, which has no
      // component name to recover.
      const name =
        schemeNames.get(safe(() => scheme.json())) ?? safe(() => scheme.type()) ?? 'unknown';
      return { scheme: name, scopes: requirement.scopes() };
    }),
  }));
}

// biome-ignore lint/suspicious/noExplicitAny: the parser's security scheme model is structurally typed
function toSecuritySchemeInfo(scheme: any): SecuritySchemeInfo {
  const flows = scheme.hasFlows?.() ? safe(() => scheme.flows()) : undefined;
  return {
    name: scheme.id(),
    type: scheme.type(),
    description: safe(() => scheme.description()),
    in: scheme.hasIn?.() ? safe(() => scheme.in()) : undefined,
    paramName: scheme.hasName?.() ? safe(() => scheme.name()) : undefined,
    httpScheme: scheme.hasScheme?.() ? safe(() => scheme.scheme()) : undefined,
    bearerFormat: scheme.hasBearerFormat?.() ? safe(() => scheme.bearerFormat()) : undefined,
    openIdConnectUrl: scheme.hasOpenIdConnectUrl?.()
      ? safe(() => scheme.openIdConnectUrl())
      : undefined,
    flows: flows ? toFlows(flows) : undefined,
  };
}

const OAUTH_FLOW_KINDS = [
  'authorizationCode',
  'clientCredentials',
  'implicit',
  'password',
] as const;

// biome-ignore lint/suspicious/noExplicitAny: the parser's OAuth flows model is structurally typed
function toFlows(flows: any): SecuritySchemeInfo['flows'] {
  const out: NonNullable<SecuritySchemeInfo['flows']> = [];
  for (const kind of OAUTH_FLOW_KINDS) {
    const hasMethod = `has${kind[0]?.toUpperCase()}${kind.slice(1)}`;
    if (!flows[hasMethod]?.()) continue;
    const flow = flows[kind]();
    if (!flow) continue;
    const scopes = safe(() => flow.scopes()) ?? {};
    out.push({
      kind,
      authorizationUrl: flow.hasAuthorizationUrl?.()
        ? safe(() => flow.authorizationUrl())
        : undefined,
      tokenUrl: flow.hasTokenUrl?.() ? safe(() => flow.tokenUrl()) : undefined,
      refreshUrl: flow.hasRefreshUrl?.() ? safe(() => flow.refreshUrl()) : undefined,
      scopes: Object.entries(scopes).map(([scopeName, description]) => ({
        name: scopeName,
        description: description as string | undefined,
      })),
    });
  }
  return out.length > 0 ? out : undefined;
}

function nonEmpty<T>(list: T[] | undefined): T[] | undefined {
  return list && list.length > 0 ? list : undefined;
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
function buildNav(
  operations: ChannelOperation[],
  orphanChannels: ChannelInfo[],
  schemas: SchemaNode[],
): NavNode[] {
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

  if (orphanChannels.length > 0) {
    nav.push({
      id: 'channels',
      label: 'Channels',
      children: orphanChannels.map((channel) => ({
        id: channel.id,
        label: channel.title ?? channel.address,
      })),
    });
  }

  const schemasNode = schemaNavigation(schemas);
  if (schemasNode) nav.push(schemasNode);

  return nav;
}
