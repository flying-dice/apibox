import type { ApiDocument } from '@apibox/core';
import { navigationIds } from './nav.js';
import type { HashRouter } from './router.js';

export interface SectionTracker {
  observe(apiDocument: ApiDocument): void;
  scrollTo(sectionId?: string): void;
  dispose(): void;
}

export function createSectionTracker(
  target: Window,
  router: HashRouter,
  onSectionChange: (sectionId: string | undefined) => void,
): SectionTracker {
  let observer: IntersectionObserver | undefined;
  let detachScroll: (() => void) | undefined;
  let observationGeneration = 0;
  let requestedSectionId: string | undefined;

  return {
    observe(apiDocument) {
      const generation = ++observationGeneration;
      target.requestAnimationFrame(() => {
        if (generation !== observationGeneration) return;
        observer?.disconnect();
        detachScroll?.();
        detachScroll = undefined;
        if (!('IntersectionObserver' in target)) return;
        const ids = new Set(navigationIds(apiDocument.nav));
        const Observer = target.IntersectionObserver as typeof IntersectionObserver;
        const update = () => {
          if (!requestedSectionId) {
            // A document with no room to scroll tells us nothing about what the reader is
            // looking at, so the tracker must not overrule a section they chose by clicking.
            const scrollHeight = target.document.documentElement.scrollHeight;
            if (scrollHeight <= target.innerHeight + BOTTOM_EPSILON) return;
            // At the very top of a document that does scroll, no section is current. That
            // keeps a freshly opened `#/petstore` from rewriting itself to
            // `#/petstore/<first-section>`, and releases the highlight on the way back up
            // instead of leaving the last section latched on.
            if (target.scrollY <= 0) {
              onSectionChange(undefined);
              router.navigate({ documentId: apiDocument.id }, true);
              return;
            }
          }
          const sectionId =
            requestedSectionId && ids.has(requestedSectionId)
              ? requestedSectionId
              : activeSectionId(target, ids);
          if (!sectionId || !ids.has(sectionId)) return;
          requestedSectionId = undefined;
          onSectionChange(sectionId);
          router.navigate({ documentId: apiDocument.id, sectionId }, true);
        };
        const nextObserver = new Observer(update, { rootMargin: '0px' });
        observer = nextObserver;
        for (const id of ids) {
          const element = target.document.getElementById(id);
          if (element) nextObserver.observe(element);
        }
        // The observer only fires when a section crosses a viewport edge. That is not enough
        // on its own: once every item is collapsed a whole document can fit on one screen,
        // where nothing ever crosses and the last section could never become current. A
        // passive scroll listener covers the gap, coalesced into a frame so it stays cheap.
        let frame = 0;
        const onScroll = () => {
          if (frame) return;
          frame = target.requestAnimationFrame(() => {
            frame = 0;
            update();
          });
        };
        target.addEventListener('scroll', onScroll, { passive: true });
        detachScroll = () => {
          if (frame) target.cancelAnimationFrame(frame);
          frame = 0;
          target.removeEventListener('scroll', onScroll);
        };
      });
    },
    scrollTo(sectionId) {
      requestedSectionId = sectionId;
      if (!sectionId) return;
      const element = target.document.getElementById(sectionId);
      // Cards render collapsed by default; reveal the target before scrolling to it so
      // sidebar navigation and a deep link on first load land on open content, not a
      // closed box. `@apibox/ui` owns what happens with the event — this stays a plain DOM
      // dispatch so the viewer does not need to know CollapsibleCard exists.
      element?.dispatchEvent(new CustomEvent('apibox-reveal'));
      element?.scrollIntoView({ block: 'start' });
    },
    dispose() {
      observationGeneration += 1;
      requestedSectionId = undefined;
      observer?.disconnect();
      detachScroll?.();
      detachScroll = undefined;
    },
  };
}

/** Where in the viewport a section is considered to have become the current one. */
const ACTIVE_LINE_RATIO = 0.3;
/** Slack for fractional scroll positions when deciding the page is fully scrolled. */
const BOTTOM_EPSILON = 2;

/**
 * The section a reader is currently looking at, computed from live geometry.
 *
 * This deliberately does not ask which elements are intersecting. That approach needs every
 * section to own roughly a viewport of scroll room to cross a threshold band, which stopped
 * being true once items collapsed by default: a short document simply runs out of room and
 * the later sections can never win. Reading positions directly degrades sensibly instead —
 * it always names a section, however little scroll room the document has.
 */
function activeSectionId(target: Window, ids: Set<string>): string | undefined {
  const elements: HTMLElement[] = [];
  for (const id of ids) {
    const element = target.document.getElementById(id);
    if (element) elements.push(element);
  }
  if (elements.length === 0) return undefined;
  elements.sort(
    (left, right) => left.getBoundingClientRect().top - right.getBoundingClientRect().top,
  );

  // At the bottom of the page the final sections may still sit below the line and could
  // otherwise never become current, so the last one wins outright.
  const scrollHeight = target.document.documentElement.scrollHeight;
  if (target.innerHeight + target.scrollY >= scrollHeight - BOTTOM_EPSILON) {
    return elements[elements.length - 1]?.id;
  }

  const line = target.innerHeight * ACTIVE_LINE_RATIO;
  let current = elements[0];
  for (const element of elements) {
    if (element.getBoundingClientRect().top > line) break;
    current = element;
  }
  return current?.id;
}
