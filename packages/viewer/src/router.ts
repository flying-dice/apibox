export interface ViewerRoute {
  documentId?: string;
  sectionId?: string;
}

function decode(segment: string | undefined): string | undefined {
  if (!segment) return undefined;
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

export function parseHash(hash: string): ViewerRoute {
  const [documentId, sectionId] = hash.replace(/^#\/?/, '').split('/');
  return { documentId: decode(documentId), sectionId: decode(sectionId) };
}

export function formatHash(documentId: string, sectionId?: string): string {
  const encodedDocumentId = encodeSegment(documentId);
  return sectionId
    ? `#/${encodedDocumentId}/${encodeSegment(sectionId)}`
    : `#/${encodedDocumentId}`;
}

function encodeSegment(value: string): string {
  let wellFormed = '';
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        wellFormed += value.charAt(index) + value.charAt(index + 1);
        index += 1;
      } else wellFormed += '\uFFFD';
    } else if (code >= 0xdc00 && code <= 0xdfff) wellFormed += '\uFFFD';
    else wellFormed += value.charAt(index);
  }
  return encodeURIComponent(wellFormed);
}

export interface HashRouter {
  current(): ViewerRoute;
  href(route: ViewerRoute): string;
  navigate(route: ViewerRoute, replace?: boolean): void;
  subscribe(listener: (route: ViewerRoute) => void): () => void;
}

export function createHashRouter(target: Window): HashRouter {
  return {
    current: () => parseHash(target.location.hash),
    href: (route) => (route.documentId ? formatHash(route.documentId, route.sectionId) : '#/'),
    navigate(route, replace = false) {
      if (!route.documentId) return;
      const hash = formatHash(route.documentId, route.sectionId);
      if (replace) target.history.replaceState(null, '', hash);
      else target.location.hash = hash;
    },
    subscribe(listener) {
      const onChange = () => listener(parseHash(target.location.hash));
      target.addEventListener('hashchange', onChange);
      return () => target.removeEventListener('hashchange', onChange);
    },
  };
}
