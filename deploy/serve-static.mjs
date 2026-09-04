/**
 * Serves one built app on its own origin, which is how the three apps are laid
 * out by default: separate hosts, exercised against CORS and a per-origin CSP.
 *
 *   node deploy/serve-static.mjs <dist-dir> <port> [allowed-origin ...]
 *
 * Any origins listed after the port are added to script-src and connect-src and
 * a Content-Security-Policy is sent. Without them no CSP is sent at all, which
 * is the wrong default for production and is called out in docs/findings.md.
 *
 * MFE_CSP_SCRIPT_EXTRA adds further script-src tokens, for repeating the
 * measurement on another stack.
 *
 * See deploy/serve-composed.mjs for the single-origin layout.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { MIME, cacheControl, contentSecurityPolicy } from './asset-rules.mjs';

const [distArg, portArg, ...allowedOrigins] = process.argv.slice(2);

if (!distArg || !portArg) {
  console.error('usage: node deploy/serve-static.mjs <dist-dir> <port> [allowed-origin ...]');
  process.exit(1);
}

const root = resolve(distArg);
const port = Number.parseInt(portArg, 10);

if (!existsSync(root)) {
  console.error(`dist directory not found: ${root}\nRun "npm run build" in that app first.`);
  process.exit(1);
}

const policy =
  allowedOrigins.length > 0
    ? contentSecurityPolicy(allowedOrigins, process.env.MFE_CSP_SCRIPT_EXTRA ?? '')
    : null;

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
  if (policy) {
    headers['content-security-policy'] = policy;
  }

  response.writeHead(200, headers);
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`serving ${root} on http://localhost:${port}`);
  console.log(policy ? `  csp: ${policy}` : '  csp: not sent (no allowed origins given)');
});
