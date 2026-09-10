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
  onSectionChange: (sectionId: string) => void,
): SectionTracker {
  let observer: IntersectionObserver | undefined;
  let observationGeneration = 0;
  let requestedSectionId: string | undefined;

  return {
    observe(apiDocument) {
      const generation = ++observationGeneration;
      target.requestAnimationFrame(() => {
        if (generation !== observationGeneration) return;
        observer?.disconnect();
        if (!('IntersectionObserver' in target)) return;
        const ids = new Set(navigationIds(apiDocument.nav));
        const Observer = target.IntersectionObserver as typeof IntersectionObserver;
        const nextObserver = new Observer(
          (entries: IntersectionObserverEntry[]) => {
            const activeSectionEntry = entries
              .filter((entry) => entry.isIntersecting)
              .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
            const sectionId =
              requestedSectionId && ids.has(requestedSectionId)
                ? requestedSectionId
                : activeSectionEntry?.target.id;
            if (!sectionId || !ids.has(sectionId)) return;
            requestedSectionId = undefined;
            onSectionChange(sectionId);
            router.navigate({ documentId: apiDocument.id, sectionId }, true);
          },
          { rootMargin: '0px 0px -70% 0px' },
        );
        observer = nextObserver;
        for (const id of ids) {
          const element = target.document.getElementById(id);
          if (element) nextObserver.observe(element);
        }
      });
    },
    scrollTo(sectionId) {
      requestedSectionId = sectionId;
      if (!sectionId) return;
      target.document.getElementById(sectionId)?.scrollIntoView({ block: 'start' });
    },
    dispose() {
      observationGeneration += 1;
      requestedSectionId = undefined;
      observer?.disconnect();
    },
  };
}
