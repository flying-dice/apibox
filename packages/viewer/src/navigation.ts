import type { HashRouter } from './router.js';
import { createHashRouter } from './router.js';
import type { SectionTracker } from './section-tracker.js';
import { createSectionTracker } from './section-tracker.js';

export interface ViewerNavigation {
  router: HashRouter;
  createSectionTracker(onSectionChange: (sectionId: string | undefined) => void): SectionTracker;
}

export function createBrowserNavigation(target: Window): ViewerNavigation {
  const router = createHashRouter(target);
  return {
    router,
    createSectionTracker: (onSectionChange) =>
      createSectionTracker(target, router, onSectionChange),
  };
}
