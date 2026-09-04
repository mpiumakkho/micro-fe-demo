/**
 * Fails when two apps would ship different versions of a package they share.
 *
 * Federation deduplicates a shared package by its exact installed version
 * string: an app whose version differs from the host loads its own copy, and
 * for @angular/core that means two dependency injection systems and a remote
 * that renders nothing. The failure is silent at build time and only appears in
 * the browser, which is why it is checked here.
 *
 * Reads the lockfiles, so it needs no install and runs in seconds.
 *
 *   node scripts/check-shared-versions.mjs
 *
 * See docs/findings.md, question 2, for the measurements behind this.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The host decides the version every remote has to match. */
const HOST = 'shell';
const APPS = ['shell', 'mfe-orders', 'mfe-catalog'];

/** Linked into every app from packages/, so the lockfile records no version. */
const NOT_VERSIONED = new Set(['@mfe-demo/platform']);

const readJson = (path) => JSON.parse(readFileSync(join(repoRoot, path), 'utf8'));

/** @type {Map<string, Map<string, string>>} package -> app -> version */
const versions = new Map();

for (const app of APPS) {
  const manifest = readJson(`apps/${app}/package.json`);
  const lock = readJson(`apps/${app}/package-lock.json`);

  for (const name of Object.keys(manifest.dependencies ?? {})) {
    if (NOT_VERSIONED.has(name)) {
      continue;
    }
    const resolved = lock.packages?.[`node_modules/${name}`]?.version;
    if (!resolved) {
      continue;
    }
    if (!versions.has(name)) {
      versions.set(name, new Map());
    }
    versions.get(name).set(app, resolved);
  }
}

const mismatches = [];
for (const [name, byApp] of versions) {
  // A package only one app depends on is never shared, so it cannot conflict.
  if (byApp.size < 2) {
    continue;
  }
  if (new Set(byApp.values()).size > 1) {
    mismatches.push({ name, byApp });
  }
}

if (mismatches.length === 0) {
  const shared = [...versions].filter(([, byApp]) => byApp.size > 1).length;
  console.log(`ok: ${shared} shared packages resolve to one version across ${APPS.length} apps`);
  process.exit(0);
}

console.error('shared packages resolve to different versions.\n');
console.error('Federation gives an app its own copy when its version differs from the host,');
console.error('which breaks dependency injection for that app at runtime.\n');

for (const { name, byApp } of mismatches) {
  const hostVersion = byApp.get(HOST) ?? '(not a dependency of the host)';
  console.error(`  ${name}`);
  console.error(`    ${HOST} (host): ${hostVersion}`);
  for (const [app, version] of byApp) {
    if (app !== HOST) {
      const verdict = version === hostVersion ? 'matches' : 'DIFFERS -> loads its own copy';
      console.error(`    ${app}: ${version}  ${verdict}`);
    }
  }
  console.error('');
}

console.error(`Align every app on the ${HOST} version, then commit the updated lockfiles.`);
process.exit(1);
