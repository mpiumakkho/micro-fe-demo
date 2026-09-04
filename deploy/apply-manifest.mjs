/**
 * Writes an environment's federation manifest into an already built shell.
 *
 *   node deploy/apply-manifest.mjs deploy/manifests/local.json
 *   node deploy/apply-manifest.mjs deploy/manifests/example-production.json
 *
 * The shell reads this file over http at startup, so it is deployment
 * configuration rather than build output: the same shell build serves every
 * environment, and moving a remote to a new origin needs no rebuild. That is
 * only true as long as nothing compiles a remote url into the bundle, which is
 * what the dynamic-host setup in federation.config.js avoids.
 */
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [manifestArg, distArg] = process.argv.slice(2);

if (!manifestArg) {
  console.error('usage: node deploy/apply-manifest.mjs <manifest.json> [shell-dist-dir]');
  process.exit(1);
}

const manifestPath = resolve(manifestArg);
const shellDist = resolve(distArg ?? join(repoRoot, 'apps/shell/dist/shell/browser'));

if (!existsSync(manifestPath)) {
  console.error(`manifest not found: ${manifestPath}`);
  process.exit(1);
}
if (!existsSync(shellDist)) {
  console.error(`shell dist not found: ${shellDist}\nRun "npm run build" in apps/shell first.`);
  process.exit(1);
}

let remotes;
try {
  remotes = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (cause) {
  console.error(`manifest is not valid json: ${manifestPath}`);
  console.error(String(cause));
  process.exit(1);
}

const problems = [];
for (const [name, url] of Object.entries(remotes)) {
  if (typeof url !== 'string') {
    problems.push(`${name}: value is not a string`);
    continue;
  }
  // A relative or misspelled url fails at runtime in the browser, where it is
  // far more expensive to notice than here.
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    problems.push(`${name}: "${url}" is not an absolute url`);
    continue;
  }
  if (!parsed.pathname.endsWith('/remoteEntry.json')) {
    problems.push(`${name}: "${url}" does not point at a remoteEntry.json`);
  }
}

if (problems.length > 0) {
  console.error('manifest is not usable:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const target = join(shellDist, 'federation.manifest.json');
copyFileSync(manifestPath, target);

console.log(`applied ${manifestArg} to ${target}`);
for (const [name, url] of Object.entries(remotes)) console.log(`  ${name} -> ${url}`);
