/**
 * The rules that decide how a federated app's files must be served, shared by
 * every server in deploy/. They are the part that is easy to get wrong on a
 * real CDN, so they live in one place rather than being repeated per server.
 */

export const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Angular stamps bundles as name-HASH.js; native federation stamps the shared
 * bundles as name.HASH.js. Both are content addressed and safe to pin forever.
 */
const HASHED = /[.-][A-Za-z0-9_-]{8,}\.(?:js|css)$/;

/**
 * remoteEntry.json and index.html must never be cached: they are what name the
 * current hashed bundles, so a cached copy pins the browser to the previous
 * deployment and the redeploy silently has no effect.
 */
export function cacheControl(pathname) {
  if (pathname.endsWith('remoteEntry.json') || pathname.endsWith('federation.manifest.json')) {
    return 'no-cache';
  }
  if (pathname.endsWith('index.html') || pathname.endsWith('/')) {
    return 'no-cache';
  }
  return HASHED.test(pathname) ? 'public, max-age=31536000, immutable' : 'no-cache';
}

/**
 * Measured, not chosen. See docs/findings.md.
 *
 * - blob: is required because es-module-shims runs shimmed modules from
 *   URL.createObjectURL.
 * - 'unsafe-inline' is required because the federation runtime injects the
 *   computed import map as an inline script and sets no nonce on it.
 * - 'unsafe-eval' is not needed.
 *
 * `allowedOrigins` is empty when every app is served from one origin, which is
 * the main operational argument for that layout: adding a remote then needs no
 * change to the policy and no new security review.
 */
export function contentSecurityPolicy(allowedOrigins = [], scriptExtra = '') {
  const remotes = allowedOrigins.join(' ');
  return [
    "default-src 'self'",
    `script-src 'self' blob: 'unsafe-inline' ${scriptExtra} ${remotes}`.replace(/\s+/g, ' ').trim(),
    `connect-src 'self' ${remotes}`.replace(/\s+/g, ' ').trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}
