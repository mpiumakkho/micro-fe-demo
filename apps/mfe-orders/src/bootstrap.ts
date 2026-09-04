import { bootstrapApplication } from '@angular/platform-browser';
import { authStore } from '@mfe-demo/platform';
import { App } from './app/app';
import { appConfig } from './app/app.config';

/**
 * Standalone entry point. Never executed when the shell loads this remote, so
 * everything here is development scaffolding rather than production behaviour.
 * The build registration lives in the exposed routes module instead.
 */
authStore.setSession({
  user: {
    id: 'user-standalone',
    username: 'standalone',
    displayName: 'Standalone dev user',
    roles: ['orders.view', 'orders.approve'],
  },
  token: 'standalone-dev-token',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
