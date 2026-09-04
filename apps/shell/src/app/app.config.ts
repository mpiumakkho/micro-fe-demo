import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { RemoteAwareErrorHandler } from './remote/remote-error-handler';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Global listeners forward uncaught errors here, which is what lets the
    // handler attribute a failure to the remote it came from.
    { provide: ErrorHandler, useClass: RemoteAwareErrorHandler },
    provideRouter(routes)
  ]
};
