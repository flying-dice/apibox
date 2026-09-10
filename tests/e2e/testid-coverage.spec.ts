import { expect, test } from '@playwright/test';
import { expectCompleteTestIdCoverage } from './coverage.js';

const documents = [
  { id: 'petstore', rootTestId: 'openapi-document' },
  { id: 'streetlights', rootTestId: 'asyncapi-document' },
  { id: 'wallet', rootTestId: 'jsonrpc-document' },
] as const;

for (const document of documents) {
  test(`${document.id} has complete, unique test-id coverage`, async ({ page }) => {
    await page.goto(`/#/${document.id}`);
    await expect(page.getByTestId(document.rootTestId)).toBeVisible();
    await expectCompleteTestIdCoverage(page);
  });
}

test('the manifest failure state has complete, unique test-id coverage', async ({ page }) => {
  await page.route('**/data/manifest.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: '{"invalid":true}' }),
  );
  await page.goto('/');
  await expect(page.getByTestId('viewer-error')).toBeVisible();
  await expectCompleteTestIdCoverage(page);
});
