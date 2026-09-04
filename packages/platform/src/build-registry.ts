import { signal, type Signal } from '@angular/core';
import type { BuildInfo } from './types';

const state = signal<readonly BuildInfo[]>([]);

/** Every app that has loaded into the current page, with the build it came from. */
export const registeredBuilds: Signal<readonly BuildInfo[]> = state.asReadonly();

/**
 * Called once by each app during bootstrap. Re-registering the same app
 * replaces the previous entry rather than duplicating it, so a remote that is
 * loaded, unloaded and loaded again still reports a single build.
 */
export function registerBuild(info: BuildInfo): void {
  state.update((builds) => [...builds.filter((b) => b.app !== info.app), info]);
}
