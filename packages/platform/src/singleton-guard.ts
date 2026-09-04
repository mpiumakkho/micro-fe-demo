export const PLATFORM_VERSION = '1.0.0';

const GLOBAL_KEY = '__mfeDemoPlatform__';

interface LoadRecord {
  readonly versions: string[];
  loads: number;
}

export interface PlatformLoadInfo {
  readonly loads: number;
  readonly versions: readonly string[];
  /** False means shared state is silently split across duplicate instances. */
  readonly isSingleton: boolean;
}

const scope = globalThis as typeof globalThis & { [GLOBAL_KEY]?: LoadRecord };

const record: LoadRecord = (scope[GLOBAL_KEY] ??= { versions: [], loads: 0 });
record.loads += 1;
record.versions.push(PLATFORM_VERSION);

if (record.loads > 1) {
  console.warn(
    `[@mfe-demo/platform] loaded ${record.loads} times (versions: ${record.versions.join(', ')}). ` +
      'Federation is not collapsing this package into one instance, so auth and cart state are no longer ' +
      'shared between the shell and the remotes. Check the "shared" block in federation.config.js of every app.',
  );
}

/**
 * How many copies of this package the page ended up with. Used by the shell to
 * show, rather than assume, that federation sharing worked.
 */
export function getPlatformLoadInfo(): PlatformLoadInfo {
  return {
    loads: record.loads,
    versions: [...record.versions],
    isSingleton: record.loads === 1,
  };
}
