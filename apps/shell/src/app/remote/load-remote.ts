import { loadRemoteModule } from '@angular-architects/native-federation';
import type { Routes } from '@angular/router';
import { RemoteUnavailable } from './remote-unavailable';

interface ExposedRouteModule {
  readonly routes?: Routes;
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

/**
 * Loads the route table a remote exposes under './routes'.
 *
 * A remote that is down, misconfigured, or blocked by CORS must not break the
 * shell. On failure this returns a route table that renders an explanation, so
 * the blast radius stays inside the route the user asked for.
 */
export async function loadRemoteRoutes(remoteName: string): Promise<Routes> {
  try {
    const exposed = await loadRemoteModule<ExposedRouteModule>(remoteName, './routes');

    if (!Array.isArray(exposed.routes)) {
      throw new TypeError(
        `Remote "${remoteName}" exposes './routes' but has no "routes" export of type Routes`,
      );
    }

    return exposed.routes;
  } catch (error) {
    console.error(`[shell] could not load remote "${remoteName}"`, error);

    return [
      {
        path: '**',
        component: RemoteUnavailable,
        data: { remoteName, reason: describe(error) },
      },
    ];
  }
}
