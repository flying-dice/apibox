import { expect, type Page } from '@playwright/test';
import { TEST_ID_HTML_ATTRIBUTES, TEST_ID_HTML_ELEMENTS } from '../testid-policy.js';

const TESTABLE_ELEMENTS = [
  ...TEST_ID_HTML_ELEMENTS,
  ...TEST_ID_HTML_ATTRIBUTES.map((attribute) => `[${attribute}]`),
].join(',');

export async function expectCompleteTestIdCoverage(page: Page): Promise<void> {
  const coverage = await page.locator('body').evaluate((body, selector) => {
    const testable = [...body.querySelectorAll<HTMLElement>(selector)];
    const missing = testable
      .filter((element) => !element.dataset.testid)
      .map((element) => element.outerHTML.slice(0, 180));
    const ids = [...body.querySelectorAll<HTMLElement>('[data-testid]')]
      .map((element) => element.dataset.testid)
      .filter((id): id is string => Boolean(id));
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    return { missing, duplicateIds };
  }, TESTABLE_ELEMENTS);

  expect(coverage.missing, 'semantic or interactive elements missing data-testid').toEqual([]);
  expect(coverage.duplicateIds, 'duplicate data-testid values').toEqual([]);
}
