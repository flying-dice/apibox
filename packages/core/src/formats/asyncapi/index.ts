import { Parser } from '@asyncapi/parser';
import { UnsupportedDocumentError } from '../../detect.js';
import { normaliseSchema } from '../../schema.js';
import type {
  AsyncApiDocument,
  BindingInfo,
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
import { asArray, asRecord, asString, slugify, uniqueId } from '../../utils.js';
import { at, dereferenceDocument, parseContact, schemaNavigation, setAt } from '../shared.js';

export interface ParseAsyncApiOptions {
  id?: string;
  /** Base path or URL used to resolve external `$ref`s. */
  location?: string;
}

/**
 * Marks where a `$ref` could not be resolved, standing in for it until {@link
 * restoreUnresolvedRefs} swaps it back to a literal `$ref` right before a schema is
 * normalised. See {@link preResolve} for why a literal `$ref` cannot survive that long on
 * its own.
 */
const UNRESOLVED_REF_KEY = 'x-apibox-unresolved-ref';

/**
 * Every `x-parser-*` key `@asyncapi/parser` stamps onto a document as it resolves it --
 * lifted from the library's own `cjs/constants.js`, which is not part of its public API
 * surface, so this list is a deliberate, reviewable copy rather than an import of an
 * internal path that could move under us.
 *
 * An exact set, not an `x-parser-` prefix test: a document could genuinely author its own
 * `x-parser-something` extension (unlikely, but indistinguishable from an injected one by
 * prefix alone), and only these exact keys are ones the library is known to inject.
 */
const PARSER_INJECTED_EXTENSION_KEYS = new Set([
  'x-parser-spec-parsed',
  'x-parser-spec-stringified',
  'x-parser-api-version',
  'x-parser-message-name',
  'x-parser-message-parsed',
  'x-parser-schema-id',
  'x-parser-original-schema-format',
  'x-parser-original-payload',
  'x-parser-original-traits',
  'x-parser-circular',
  'x-parser-circular-props',
  'x-parser-unique-object-id',
]);

/**
 * Parse an AsyncAPI document.
 *
 * `@asyncapi/parser` presents 2.x and 3.x documents through one interface, which is the
 * whole reason it is worth the dependency — most AsyncAPI in the wild is still 2.x, and
 * we would otherwise have to model both shapes ourselves.
 *
 * Note on dereferencing: unlike OpenAPI and OpenRPC, `@asyncapi/parser` does its own `$ref`
 * resolution as part of `parser.parse`, and — this was checked empirically against a broken
 * `$ref`, both an unreachable external URL and a dangling internal pointer — it throws and
 * abandons the *entire* document rather than degrading the one broken pointer the way
 * `dereferenceDocument`'s `continueOnError` lets OpenAPI/OpenRPC do.
 *
 * Pre-resolving through the shared `dereferenceDocument` helper before handing the document
 * to `@asyncapi/parser` (see {@link preResolve}) is not enough on its own: `continueOnError`
 * deliberately *leaves the unresolvable `$ref` in place* so a later pass can mark it, but
 * `@asyncapi/parser` runs its own resolution on whatever it is given next and throws on that
 * exact same leftover `$ref`, for the same reason it threw the first time. Every `$ref`
 * `preResolve` could not resolve is therefore additionally substituted with a
 * {@link UNRESOLVED_REF_KEY} marker — a vendor-extension key `@asyncapi/parser` treats as
 * inert data, unlike `$ref` — so the document it receives has none left to trip over.
 * `restoreUnresolvedRefs` swaps each marker back into the literal `$ref` shape right before
 * a schema reaches `normaliseSchema`, which already knows how to turn that into
 * {@link SchemaNode.unresolvedRef} — the same marker OpenAPI and OpenRPC produce for the
 * same failure.
 */
export async function parseAsyncApi(
  raw: unknown,
  options: ParseAsyncApiOptions = {},
): Promise<AsyncApiDocument> {
  const warnings: string[] = [];
  const { input, unresolved } = await preResolve(raw, options.location, warnings);

  const parser = new Parser();
  let { document, diagnostics } = await parser.parse(input as never);

  // A broken `$ref` inside a schema normalises fine as an inert marker object -- JSON Schema
  // has no required keywords of its own. But the very same marker substituted where the
  // *AsyncAPI* meta-schema itself has required fields (a `servers` entry needs `host` and
  // `protocol`; see the module doc comment) still fails full-document validation, and
  // `@asyncapi/parser` reports that the same way it reports every other invalid document:
  // no model at all. Rather than encode per-position knowledge of what each shape requires
  // (fragile -- see card 35's own reasoning), drop exactly the entries whose marker is
  // implicated by a validation error and retry once. Everything else -- most of all card
  // 34's schema-position substitution -- never reaches this branch, since `document` is
  // already defined by the time it would.
  if (!document && unresolved.length > 0) {
    const dropped = dropInvalidatingMarkers(input, unresolved, diagnostics, warnings);
    if (dropped) {
      ({ document, diagnostics } = await parser.parse(input as never));
    }
  }

  warnings.push(
    ...diagnostics
      .filter((d) => d.severity <= 1) // 0 = error, 1 = warning
      .map((d) => `${d.message}${d.path?.length ? ` (at ${d.path.join('.')})` : ''}`),
  );

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
      protocolVersion: server.hasProtocolVersion?.()
        ? safe(() => server.protocolVersion())
        : undefined,
      pathname: server.hasPathname?.() ? safe(() => server.pathname()) : undefined,
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
      bindings: toBindings(safe(() => server.bindings())),
      tags: nonEmpty(
        safe(() =>
          server
            .tags()
            .all()
            .map((tag) => tag.name()),
        ),
      ),
      extensions: parseExtensions(server),
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
        bindings: toBindings(safe(() => operation.bindings())),
        channelBindings: channel ? toBindings(safe(() => channel.bindings())) : undefined,
        channelTags: channel ? readChannelTags(channel) : undefined,
        channelExternalDocs: channel ? readChannelExternalDocs(channel) : undefined,
        extensions: parseExtensions(operation),
        channelExtensions: channel ? parseExtensions(channel) : undefined,
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
          bindings: toBindings(safe(() => channel.bindings())),
          tags: readChannelTags(channel),
          externalDocs: readChannelExternalDocs(channel),
          extensions: parseExtensions(channel),
        }) satisfies ChannelInfo,
    );

  const schemas: SchemaNode[] = document
    .components()
    .schemas()
    .all()
    .map((schema) => normaliseAsyncApiSchema(schema.json(), {}, schema.id()))
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
    applicationId: info.hasId() ? safe(() => info.id()) : undefined,
    // Root and info-level extensions folded into one list, same reasoning as OpenAPI's own
    // root+info fold (see `formats/openapi/index.ts`): a reader has no reason to care which
    // of AsyncAPI's two top-level objects an extension happened to be attached to.
    extensions: nonEmpty([...(parseExtensions(document) ?? []), ...(parseExtensions(info) ?? [])]),
    nav: buildNav(operations, orphanChannels, schemas),
    warnings,
  };
}

/** A `$ref` `preResolve` could not resolve, and where it was found. */
interface UnresolvedRef {
  path: string[];
  ref: string;
}

/**
 * Find every `$ref` `@asyncapi/parser` would fail to resolve, and patch *only* those into
 * an {@link UNRESOLVED_REF_KEY} marker in an otherwise-untouched clone of the original
 * document. See the module doc comment above for why a marker is needed at all, rather than
 * just leaving the broken `$ref` in place.
 *
 * The fully pre-resolved document `dereferenceDocument` returns is deliberately discarded
 * rather than handed to `@asyncapi/parser`: recovering a security scheme's name from a
 * `$ref` to it (see `securitySchemeNames` below) relies on object identity surviving
 * `@asyncapi/parser`'s *own* resolution, and pre-inlining every valid `$ref` here breaks
 * that identity before the parser ever sees it. Every `$ref` that *does* resolve is left
 * exactly as authored, for `@asyncapi/parser` to resolve itself, same as before this fix.
 *
 * Not an object is left untouched rather than rejected here — `@asyncapi/parser` gives a
 * clearer, format-specific error for that than this function could.
 *
 * The returned `unresolved` list is what {@link dropInvalidatingMarkers} needs afterwards to
 * tell a marker that just failed validation apart from one that was never touched.
 */
async function preResolve(
  raw: unknown,
  location: string | undefined,
  warnings: string[],
): Promise<{ input: unknown; unresolved: UnresolvedRef[] }> {
  const root = asRecord(raw);
  if (!root) return { input: raw, unresolved: [] };

  const unresolved: UnresolvedRef[] = [];
  await dereferenceDocument(root, location, warnings, {
    // Irrelevant to correctness here -- the resolved output is discarded -- but avoids
    // pointlessly building native cyclic objects for a genuinely circular $ref.
    circular: 'ignore',
    onUnresolved: (path, ref) => unresolved.push({ path, ref }),
  });
  if (unresolved.length === 0) return { input: raw, unresolved };

  const input = structuredClone(root);
  for (const { path, ref } of unresolved) stubUnresolvedRef(input, path, ref);
  return { input, unresolved };
}

/**
 * Drop, in place, every {@link UNRESOLVED_REF_KEY} marker that a failed parse's diagnostics
 * blame for an error at that marker's own path -- card 35's chosen fix for a broken `$ref`
 * sitting where the target shape has required fields, which the marker alone cannot satisfy.
 *
 * Matching is by exact path rather than "the error is somewhere under this marker": a
 * diagnostic's path names the object that failed validation, which for a required-field
 * miss is the marker itself, not a descendant of it. A diagnostic whose path does not match
 * any marker is left alone entirely -- it is either an unrelated problem the final parse
 * attempt (or its own warnings) will still surface, or the very "no document" fallback this
 * function exists to avoid triggering unnecessarily.
 *
 * Returns whether anything was actually dropped, so the caller knows whether a retry is
 * worth the second `parser.parse` call.
 */
function dropInvalidatingMarkers(
  input: unknown,
  unresolved: UnresolvedRef[],
  // `path` is typed loosely because diagnostics come from Spectral (via @asyncapi/parser),
  // whose `JsonPath` allows a numeric array index segment alongside a string property key.
  diagnostics: Array<{ severity: number; path?: Array<string | number>; message: string }>,
  warnings: string[],
): boolean {
  const root = asRecord(input);
  if (!root) return false;

  const refByPath = new Map(unresolved.map((u) => [u.path.join('.'), u.ref]));
  let changed = false;

  for (const diagnostic of diagnostics) {
    if (diagnostic.severity !== 0) continue; // 0 = error
    const path = diagnostic.path?.map(String) ?? [];
    const key = path.join('.');
    const ref = refByPath.get(key);
    if (ref === undefined) continue;

    if (deleteAt(root, path)) {
      warnings.push(
        `Could not resolve $ref at ${key}: ${ref} -- the entry was dropped, since a placeholder would not satisfy "${diagnostic.message}".`,
      );
      changed = true;
    }
  }

  return changed;
}

/** Remove the value at `path`, in place. Mirrors {@link stubUnresolvedRef}'s navigation. */
function deleteAt(root: Record<string, unknown>, path: string[]): boolean {
  if (path.length === 0) return false;

  let parent: unknown = root;
  for (const segment of path.slice(0, -1)) {
    parent = at(parent, segment);
    if (parent === undefined || parent === null) return false;
  }

  const key = path[path.length - 1];
  if (key === undefined) return false;

  if (Array.isArray(parent)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= parent.length) return false;
    parent.splice(index, 1);
    return true;
  }

  const record = asRecord(parent);
  if (!record) return false;
  delete record[key];
  return true;
}

/** Replace the `$ref` at `path` with an {@link UNRESOLVED_REF_KEY} marker, in place. */
function stubUnresolvedRef(root: Record<string, unknown>, path: string[], ref: string): void {
  if (path.length === 0) return;

  let parent: unknown = root;
  for (const segment of path.slice(0, -1)) {
    parent = at(parent, segment);
    if (parent === undefined || parent === null) return;
  }

  const key = path[path.length - 1];
  if (key === undefined) return;

  setAt(parent, key, { [UNRESOLVED_REF_KEY]: ref });
}

/**
 * Swap an {@link UNRESOLVED_REF_KEY} marker back into a literal `$ref`, recursively.
 *
 * Cycle-safe by object identity: a schema that survived resolution can be genuinely
 * circular (see `DereferenceOptions.circular`), and this must not chase its own tail.
 */
function restoreUnresolvedRefs(node: unknown, seen: Set<object> = new Set()): unknown {
  if (typeof node !== 'object' || node === null) return node;
  if (seen.has(node)) return node;
  seen.add(node);

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) node[i] = restoreUnresolvedRefs(node[i], seen);
    return node;
  }

  const record = node as Record<string, unknown>;
  const marker = record[UNRESOLVED_REF_KEY];
  // Not a single-key check: `@asyncapi/parser` stamps its own `x-parser-schema-id` onto
  // every schema it touches, including this stub, so the marker key can have company.
  if (typeof marker === 'string') {
    return { $ref: marker };
  }

  for (const key of Object.keys(record)) record[key] = restoreUnresolvedRefs(record[key], seen);
  return record;
}

/**
 * Strip {@link PARSER_INJECTED_EXTENSION_KEYS} out of a schema tree, without mutating the
 * `@asyncapi/parser` model objects it is built from.
 *
 * Deletion in place was considered and rejected: the same underlying JSON object can be
 * reached both through a message's payload and through `components.schemas` (identity is
 * shared across a resolved `$ref`, the same fact `preResolve`'s doc comment relies on for
 * security-scheme names), and `Schema.id()` reads `x-parser-schema-id` off that same object
 * lazily. Deleting the key before every caller of `.id()` has run would be an ordering trap.
 * Building a filtered copy instead -- cycle-safe by object identity, the same way
 * {@link restoreUnresolvedRefs} is -- sidesteps that entirely.
 *
 * This lives here rather than as a blanket filter in `normaliseSchema` (packages/core/src/
 * schema.ts) because that function is shared by all four formats: `x-parser-*` is only ever
 * injected machinery for AsyncAPI, and filtering it there would just as readily swallow an
 * OpenAPI document that happens to genuinely author an `x-parser-*` extension of its own.
 */
function stripParserExtensions(node: unknown, seen: Map<object, unknown> = new Map()): unknown {
  if (typeof node !== 'object' || node === null) return node;
  const cached = seen.get(node);
  if (cached !== undefined) return cached;

  if (Array.isArray(node)) {
    const copy: unknown[] = [];
    seen.set(node, copy);
    for (const item of node) copy.push(stripParserExtensions(item, seen));
    return copy;
  }

  const record = node as Record<string, unknown>;
  const copy: Record<string, unknown> = {};
  seen.set(node, copy);
  for (const [key, value] of Object.entries(record)) {
    if (PARSER_INJECTED_EXTENSION_KEYS.has(key)) continue;
    copy[key] = stripParserExtensions(value, seen);
  }
  return copy;
}

/**
 * `normaliseSchema`, restoring any {@link UNRESOLVED_REF_KEY} marker and stripping injected
 * `x-parser-*` extensions first.
 */
function normaliseAsyncApiSchema(
  raw: unknown,
  options?: Parameters<typeof normaliseSchema>[1],
  name?: string,
): SchemaNode | undefined {
  return normaliseSchema(stripParserExtensions(restoreUnresolvedRefs(raw)), options, name);
}

/** AsyncAPI 2.x channels have no title; the accessor only exists on the 3.x model. */
function readTitle(channel: unknown): string | undefined {
  const titled = channel as { title?: () => string | undefined };
  return typeof titled.title === 'function' ? titled.title() : undefined;
}

/**
 * `ChannelInterface`'s typed extends list omits `TagsMixinInterface`/
 * `ExternalDocumentationMixinInterface` (unlike `readTitle` above, which reaches past the
 * type via a runtime method that only exists because `Channel extends CoreModel` on 3.x).
 * Rather than repeating that cast-into-internals move for a second field pair, this reads
 * the same data through `BaseModel.json()` -- declared on every model's own public
 * interface (`node_modules/@asyncapi/parser/cjs/models/base.d.ts`), so it is public,
 * documented API, not a reach past the type system. `.json()` returns the plain
 * post-resolution document object for this one model; 2.x channels have no `tags`/
 * `externalDocs` field at all (the 2.x Channel Item Object never had them), so the guards
 * below simply see nothing and return `undefined` rather than throwing.
 */
function readChannelTags(channel: unknown): string[] | undefined {
  const raw = asRecord(safe(() => (channel as { json(): unknown }).json()));
  return nonEmpty(
    asArray(raw?.tags)
      .map((tag) => asString(asRecord(tag)?.name))
      .filter((name): name is string => name !== undefined),
  );
}

/** As {@link readChannelTags}, for `externalDocs`. */
function readChannelExternalDocs(channel: unknown): ExternalDocs | undefined {
  const raw = asRecord(safe(() => (channel as { json(): unknown }).json()));
  const docs = asRecord(raw?.externalDocs);
  const url = asString(docs?.url);
  return url ? { url, description: asString(docs?.description) } : undefined;
}

/** Channel parameters are always path-shaped: they are substituted into the address. */
// biome-ignore lint/suspicious/noExplicitAny: the parser's channel model is structurally typed
function parseChannelParameters(channel: any): Parameter[] {
  const parameters = safe(() => channel.parameters().all()) ?? [];
  // biome-ignore lint/suspicious/noExplicitAny: as above
  return parameters.map((parameter: any) => ({
    name: parameter.id(),
    in: 'path' as const,
    description: describeParameterLocation(parameter),
    required: true,
    schema: normaliseAsyncApiSchema(parameterSchema(parameter)),
  }));
}

/**
 * A 3.0 Parameter Object's `location`: a runtime expression pointing at where its value
 * actually comes from, when that is something other than the channel address template it
 * substitutes into by default (the only case {@link Parameter.in}'s hard-coded `'path'`
 * models). `Parameter` has no field of its own for an arbitrary runtime expression -- unlike
 * `MessageInfo.correlationId.location`, this is a shared, cross-format type this card is not
 * scoped to widen -- so a non-default `location` is folded into the description instead of
 * silently dropped, which is honest about the parameter without inventing new shape for a
 * rare case (2.x parameters, and most 3.0 ones, have no `location` at all).
 */
// biome-ignore lint/suspicious/noExplicitAny: the parser's parameter model is structurally typed
function describeParameterLocation(parameter: any): string | undefined {
  const description = safe(() => parameter.description());
  const location = parameter.hasLocation?.() ? safe(() => parameter.location()) : undefined;
  if (!location) return description;
  const note = `Located via: \`${location}\``;
  return description
    ? `${description}

${note}`
    : note;
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
    bindings: toBindings(safe(() => message.bindings())),
    tags: nonEmpty(
      safe(() =>
        message
          .tags()
          .all()
          .map((tag: { name(): string }) => tag.name()),
      ),
    ),
    externalDocs: message.hasExternalDocs?.()
      ? toExternalDocs(safe(() => message.externalDocs()))
      : undefined,
    extensions: parseExtensions(message),
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
  return { schema: normaliseAsyncApiSchema(safe(() => schema.json())) };
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

/**
 * `x-*` extensions authored directly on `model`, excluding {@link PARSER_INJECTED_EXTENSION_KEYS}
 * -- the same filtering intent as card 36's schema-level filter, applied here to the parser's
 * own typed `.extensions()` accessor rather than a plain JSON record: every AsyncAPI object
 * reaching this function is already a parsed model instance, not raw JSON, unlike OpenAPI's
 * `parseExtensions` (`formats/openapi/index.ts`), which reads a dereferenced plain object.
 * `Extension.id()` already returns the key with its `x-` prefix intact (confirmed against
 * `@asyncapi/parser`'s own `cjs/models/v3/mixins.js`), so no prefix handling is needed here.
 */
function parseExtensions(
  model: { extensions?: () => { all(): Array<{ id(): string; value(): unknown }> } } | undefined,
): Array<{ key: string; value: unknown }> | undefined {
  const list = safe(() => model?.extensions?.().all());
  if (!list) return undefined;
  const entries = list
    .filter((extension) => !PARSER_INJECTED_EXTENSION_KEYS.has(extension.id()))
    .map((extension) => ({ key: extension.id(), value: extension.value() }));
  return entries.length > 0 ? entries : undefined;
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
 * Read a protocol bindings collection into {@link BindingInfo}s, one per protocol the
 * document attached at this location.
 *
 * `binding.value()` is deliberately treated as an opaque record rather than walked with any
 * protocol-specific knowledge -- see {@link BindingInfo}'s own doc comment for why a generic
 * shape is the point, not a shortcut. `bindingVersion` is not read as a field: the library
 * already lifts it into `binding.version()` and strips it out of `value()`, so re-reading it
 * from `value()` here would either duplicate it or find it missing, depending on parser
 * version.
 */
function toBindings(
  // biome-ignore lint/suspicious/noExplicitAny: the parser's bindings collection is structurally typed
  bindings: { all(): Array<{ protocol(): string; version(): string; value(): any }> } | undefined,
): BindingInfo[] | undefined {
  const list = safe(() => bindings?.all());
  if (!list || list.length === 0) return undefined;
  return list.map((binding) => {
    const value = asRecord(safe(() => binding.value()));
    return {
      protocol: binding.protocol(),
      version: safe(() => binding.version()) || undefined,
      fields: value
        ? Object.entries(value).map(([key, fieldValue]) => ({ key, value: fieldValue }))
        : [],
    } satisfies BindingInfo;
  });
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
