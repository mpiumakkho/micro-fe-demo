/**
 * Serves every app from ONE origin, each under its own path prefix.
 *
 *   node deploy/serve-composed.mjs <port> <prefix>=<dist-dir> ...
 *
 * Use "." for the root mount and a bare path for the rest, e.g.
 * "remotes/mfe-orders=...". A leading slash is accepted but git bash on Windows
 * rewrites an argument that starts with one into a filesystem path, so the
 * documented form avoids it.
 *
 * Independent deploy is unaffected: each prefix is a separate upload target, so
 * a remote is still released on its own. What changes is everything the browser
 * treats as cross-origin:
 *
 *   - no CORS at all, because nothing is cross-origin any more
 *   - script-src is just 'self', so adding a remote needs no CSP change and no
 *     new security review. With separate origins every new remote has to be
 *     added to the policy by hand.
 *
 * The isolation given up is smaller than it looks: every remote already runs in
 * the shell's JavaScript context, so separate origins buy almost no security
 * boundary in this architecture.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { MIME, cacheControl, contentSecurityPolicy } from './asset-rules.mjs';

const [portArg, ...mountArgs] = process.argv.slice(2);

if (!portArg || mountArgs.length === 0) {
  console.error('usage: node deploy/serve-composed.mjs <port> <prefix>=<dist-dir> ...');
  console.error('use "." for the root mount, e.g. .=apps/shell/dist/shell/browser');
  console.error('example: node deploy/serve-composed.mjs 4500 /=apps/shell/dist/shell/browser');
  console.error('         plus /remotes/mfe-orders=apps/mfe-orders/dist/mfe-orders/browser');
  process.exit(1);
}

const port = Number.parseInt(portArg, 10);

const mounts = mountArgs.map((arg) => {
  const at = arg.indexOf('=');
  if (at <= 0) {
    console.error(`mount must look like <prefix>=<dist-dir>, received: ${arg}`);
    process.exit(1);
  }

  // Normalised so "/remotes/x", "remotes/x" and "remotes/x/" all mean the same
  // mount, and "." or "/" mean the root.
  const raw = arg.slice(0, at).replace(/^[./]+/, '').replace(/\/+$/, '');
  const prefix = raw === '' ? '/' : `/${raw}`;
  const root = resolve(arg.slice(at + 1));

  if (!existsSync(root)) {
    console.error(`dist directory not found: ${root}\nRun "npm run build" in that app first.`);
    process.exit(1);
  }

  return { prefix, root, isRoot: prefix === '/' };
});

// Longest prefix first, so /remotes/mfe-orders wins over /.
mounts.sort((a, b) => b.prefix.length - a.prefix.length);

const policy = contentSecurityPolicy([], process.env.MFE_CSP_SCRIPT_EXTRA ?? '');

function mountFor(pathname) {
  return mounts.find(
    (mount) => mount.isRoot || pathname === mount.prefix || pathname.startsWith(mount.prefix + '/'),
  );
}

function resolveFile(mount, pathname) {
  const withinMount = mount.isRoot ? pathname : pathname.slice(mount.prefix.length);

  let relative = normalize(decodeURIComponent(withinMount));
  while (relative.startsWith('/') || relative.startsWith(sep)) {
    relative = relative.slice(1);
  }

  const candidate = join(mount.root, relative);
  if (candidate !== mount.root && !candidate.startsWith(mount.root + sep)) {
    return null;
  }
  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }

  // Only the shell needs the single page app fallback. A missing file under a
  // remote's prefix is a real 404 and should not be answered with html.
  if (!mount.isRoot) {
    return null;
  }
  const indexHtml = join(mount.root, 'index.html');
  return existsSync(indexHtml) ? indexHtml : null;
}

createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  const mount = mountFor(pathname);
  const file = mount ? resolveFile(mount, pathname) : null;

  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': cacheControl(pathname),
    'content-security-policy': policy,
  });

  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`serving one origin on http://localhost:${port}`);
  for (const mount of mounts) {
    console.log(`  ${mount.prefix.padEnd(24)} -> ${mount.root}`);
  }
  console.log(`  csp: ${policy}`);
});
