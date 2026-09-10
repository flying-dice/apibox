import '@apibox/ui/tokens.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { createBrowserNavigation } from './navigation.js';
import type { VsCodeApi } from './protocol.js';
import { StaticDataSource } from './static-data-source.js';
import { WebviewDataSource } from './webview-data-source.js';
import './viewer.css';

declare const __APIBOX_WEBVIEW__: boolean;
declare const __APIBOX_PWA__: boolean;

if (!__APIBOX_WEBVIEW__) {
  await Promise.all([import('@apibox/ui/themes/dark.css'), import('@apibox/ui/themes/light.css')]);
}

if (
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has('vscode-theme-fixture')
) {
  const { applyVsCodeThemeFixture } = await import('./vscode-theme-fixture.js');
  applyVsCodeThemeFixture(document.documentElement);
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
    __APIBOX_DATA__?: ConstructorParameters<typeof WebviewDataSource>[2];
  }
}

const dataSource = window.acquireVsCodeApi
  ? new WebviewDataSource(window.acquireVsCodeApi(), window, window.__APIBOX_DATA__)
  : new StaticDataSource('.');

const target = document.getElementById('app');
if (!target) throw new Error('The viewer mount element is missing.');

const navigation = createBrowserNavigation(window);

if (__APIBOX_PWA__ && !window.acquireVsCodeApi) {
  const [
    { default: PwaApp },
    { IndexedDbWorkspaceRepository },
    { WorkspaceController },
    { WorkspaceDataSource },
  ] = await Promise.all([
    import('./PwaApp.svelte'),
    import('./indexeddb-workspace-repository.js'),
    import('./workspace.js'),
    import('./workspace-data-source.js'),
  ]);
  const controller = new WorkspaceController(dataSource, new IndexedDbWorkspaceRepository(), {
    preferences: window.localStorage,
  });
  const workspaceDataSource = new WorkspaceDataSource(controller, dataSource);
  mount(PwaApp, { target, props: { controller, dataSource: workspaceDataSource, navigation } });
  if ('serviceWorker' in navigator && !import.meta.env.DEV) {
    void navigator.serviceWorker.register('./service-worker.js').catch((error: unknown) => {
      console.warn('APIBox offline support could not be enabled.', error);
    });
  }
} else {
  mount(App, {
    target,
    props: { dataSource, navigation, webview: __APIBOX_WEBVIEW__ },
  });
}
