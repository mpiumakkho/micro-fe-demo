import { ErrorHandler, Injectable } from '@angular/core';
import { recordRemoteError } from './remote-errors';
import { remoteForStack, remoteOriginsFromImportMap } from './remote-registry';

/**
 * Names the remote an error came from.
 *
 * Without this a runtime failure inside a remote reaches the console as an
 * anonymous stack trace, and whoever is on call has to guess which team owns
 * it. In production this is where the error would also be forwarded to the
 * monitoring backend, tagged with the remote name.
 */
@Injectable()
export class RemoteAwareErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    // Read the map per error rather than caching it: remotes are added to the
    // import map as they load, and errors are rare enough for this to be free.
    const origins = remoteOriginsFromImportMap();
    const stack = error instanceof Error ? error.stack : undefined;
    const remote = remoteForStack(stack, origins);
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

    if (remote) {
      recordRemoteError(remote, 'runtime', message);
      console.error(`[shell] error from remote "${remote}"`, error);
      return;
    }

    console.error('[shell] error', error);
  }
}
