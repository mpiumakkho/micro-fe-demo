interface ImportMapShape {
  readonly imports?: Record<string, string>;
  readonly scopes?: Record<string, Record<string, string>>;
}

/**
 * origin -> remote name, read from the import map federation injected.
 *
 * The map is the source of truth for what the browser actually loaded, so this
 * stays correct when a remote is served from a different origin than the
 * manifest originally named. It also avoids re-fetching the manifest.
 *
 * Entries look like `"mfe-orders/routes": "http://localhost:4201/routes-X.js"`.
 */
export function remoteOriginsFromImportMap(scope: Document = document): ReadonlyMap<string, string> {
  const origins = new Map<string, string>();

  const element = scope.querySelector('script[type="importmap-shim"], script[type="importmap"]');
  if (!element?.textContent) {
    return origins;
  }

  let map: ImportMapShape;
  try {
    map = JSON.parse(element.textContent) as ImportMapShape;
  } catch {
    // A malformed import map means federation is broken in a louder way than
    // this; attributing errors is not the place to report it.
    return origins;
  }

  const base = scope.baseURI;

  // Federation creates one scope per remote origin, so the scope keys are the
  // reliable list of remotes. The root imports alone are not: a shared package
  // like "@angular/core" also contains a slash, and splitting on it would
  // invent a remote called "@angular" and misattribute the shell's own errors
  // to it.
  const remoteOrigins = new Set<string>();
  for (const key of Object.keys(map.scopes ?? {})) {
    try {
      remoteOrigins.add(new URL(key, base).origin);
    } catch {
      continue;
    }
  }

  for (const [key, url] of Object.entries(map.imports ?? {})) {
    const slash = key.indexOf('/');
    if (slash <= 0) {
      continue;
    }

    let origin: string;
    try {
      origin = new URL(url, base).origin;
    } catch {
      continue;
    }

    if (remoteOrigins.has(origin)) {
      origins.set(origin, key.slice(0, slash));
    }
  }

  return origins;
}

/**
 * Which remote a stack trace came from, or null when it belongs to the shell.
 * Matching on origin is what makes this work at all: a remote's frames carry
 * its own host, which is the only thing tying an error back to its owner.
 */
export function remoteForStack(
  stack: string | undefined,
  origins: ReadonlyMap<string, string>,
): string | null {
  if (!stack) {
    return null;
  }
  for (const [origin, remote] of origins) {
    if (stack.includes(origin)) {
      return remote;
    }
  }
  return null;
}
