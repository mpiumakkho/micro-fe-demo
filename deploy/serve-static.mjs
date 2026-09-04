/**
 * Minimal static server used to simulate three independent deployments on one
 * machine. Zero dependencies on purpose - this is deployment simulation, not
 * application code.
 *
 *   node deploy/serve-static.mjs <dist-dir> <port> [allowed-origin ...]
 *
 * Any origins listed after the port are added to script-src and connect-src and
 * a Content-Security-Policy is sent. Federation loads code from other origins,
 * so those origins have to be named explicitly; without the argument no CSP is
 * sent at all, which is the wrong default for production and is called out in
 * docs/findings.md.
 *
 * The cache headers are the point of this file, not an afterthought:
 *
 *   remoteEntry.json  must never be cached. It is the only file that names the
 *                     current hashed bundles, so a cached copy pins the browser
 *                     to the previous deployment and the redeploy silently has
 *                     no effect.
 *   hashed bundles    are immutable - the hash changes when the content does.
 *   index.html        must never be cached, for the same reason as above.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const [distArg, portArg, ...allowedOrigins] = process.argv.slice(2);

if (!distArg || !portArg) {
  console.error('usage: node deploy/serve-static.mjs <dist-dir> <port>');
  process.exit(1);
}

const root = resolve(distArg);
const port = Number.parseInt(portArg, 10);

if (!existsSync(root)) {
  console.error(`dist directory not found: ${root}\nRun "npm run build" in that app first.`);
  process.exit(1);
}

/**
 * Built from the origins this deployment is allowed to pull code from.
 * style-src needs 'unsafe-inline' because Angular writes component styles into
 * inline <style> elements; there is no nonce plumbing in a static server.
 */
function contentSecurityPolicy() {
  const remotes = allowedOrigins.join(' ');
  // Escape hatch for measuring which relaxations a stack actually needs,
  // e.g. MFE_CSP_SCRIPT_EXTRA="'unsafe-eval'".
  const scriptExtra = process.env.MFE_CSP_SCRIPT_EXTRA ?? '';
  return [
    "default-src 'self'",
    // Measured, not chosen. blob: is required because es-module-shims runs
    // shimmed modules from URL.createObjectURL. 'unsafe-inline' is required
    // because the federation runtime injects the computed import map as an
    // inline script and sets no nonce on it; es-module-shims accepts an
    // esmsInitOptions.nonce, but nothing passes one in. 'unsafe-eval' is NOT
    // needed. See docs/findings.md for the measurements and what this costs.
    `script-src 'self' blob: 'unsafe-inline' ${scriptExtra} ${remotes}`.replace(/\s+/g, ' ').trim(),
    `connect-src 'self' ${remotes}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

const MIME = {
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

/** True for filenames the Angular build stamped with a content hash. */
// Angular stamps bundles as name-HASH.js; native federation stamps the shared
// bundles as name.HASH.js. Both are content addressed and safe to pin forever.
const HASHED = /[.-][A-Za-z0-9_-]{8,}\.(?:js|css)$/;

function cacheControl(pathname) {
  if (pathname.endsWith('remoteEntry.json') || pathname.endsWith('federation.manifest.json')) {
    return 'no-cache';
  }
  if (pathname.endsWith('index.html') || pathname === '/') {
    return 'no-cache';
  }
  return HASHED.test(pathname) ? 'public, max-age=31536000, immutable' : 'no-cache';
}

function resolveFile(pathname) {
  let relative = normalize(decodeURIComponent(pathname));
  while (relative.startsWith('/') || relative.startsWith(sep)) {
    relative = relative.slice(1);
  }
  const candidate = join(root, relative);

  // Reject anything that escaped the dist directory.
  if (candidate !== root && !candidate.startsWith(root + sep)) {
    return null;
  }
  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }

  // Single page app fallback, so deep links work after a reload.
  const indexHtml = join(root, 'index.html');
  return existsSync(indexHtml) ? indexHtml : null;
}

createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  const file = resolveFile(pathname);

  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const headers = {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': cacheControl(pathname),
    // The shell fetches remoteEntry.json and the bundles from another origin.
    'access-control-allow-origin': '*',
  };

  if (allowedOrigins.length > 0) {
    headers['content-security-policy'] = contentSecurityPolicy();
  }

  response.writeHead(200, headers);

  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`serving ${root} on http://localhost:${port}`);
  if (allowedOrigins.length > 0) {
    console.log(`  csp: ${contentSecurityPolicy()}`);
  } else {
    console.log('  csp: not sent (no allowed origins given)');
  }
});
