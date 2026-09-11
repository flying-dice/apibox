import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const examples = resolve(import.meta.dirname, '../../examples');

// Regression guard for decisions/08-json-schema-as-fourth-format.md's "Watch" note:
// ViewerShell.svelte routes on `document.kind` through an `{#if}/{:else if}` chain that
// ends in an `{:else}` rendering the empty-workspace state. An unhandled `kind` typechecks
// clean and silently falls through to "Import your first API description" — nothing but a
// browser assertion can catch that. If the `jsonschema` branch is ever removed or broken,
// this test must fail.
test('renders a JSON Schema document instead of falling back to the empty-workspace state', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByTestId('workspace-file-input')
    .setInputFiles([resolve(examples, 'user-profile.schema.json')]);

  await expect(page.getByTestId('jsonschema-document')).toBeVisible();
  await expect(page.getByTestId('viewer-empty-workspace')).toHaveCount(0);

  await expect(page.getByTestId('jsonschema-document-header-kind')).toHaveText('JSON Schema');
  await expect(page.getByTestId('jsonschema-document-header-version')).toContainText('Dialect');
  await expect(page.getByTestId('jsonschema-document-header-version')).toContainText('2020-12');
  await expect(page.getByTestId('jsonschema-document-schemas-title')).toHaveText('Definitions');
});
