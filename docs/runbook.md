# Runbook

Verified on Windows 11, Node 20.19.6, npm 10.8.2, Angular CLI 21.1.4.

## Prerequisites

Node must satisfy Angular 21's engine range: `^20.19.0 || ^22.12.0 || >=24.0.0`.
Angular 22 requires `^22.22.3 || ^24.15.0 || >=26.0.0` and will not install on Node 20.

## First run

The shared package must be compiled before the apps, because each app installs
it as a `file:` dependency and imports its `dist`.

```bash
npm --prefix packages/platform install
npm --prefix packages/platform run build

npm --prefix apps/shell install
npm --prefix apps/mfe-orders install
npm --prefix apps/mfe-catalog install
npm --prefix e2e install
```

## Development, all three apps live

Three terminals. Each app has its own dev server; none of them needs the others
to start.

```bash
npm --prefix apps/shell start        # http://localhost:4200
npm --prefix apps/mfe-orders start   # http://localhost:4201
npm --prefix apps/mfe-catalog start  # http://localhost:4202
```

Open http://localhost:4200 and sign in. Demo accounts:

| Username  | Password   | Roles                                        |
| --------- | ---------- | -------------------------------------------- |
| `somchai` | `demo1234` | catalog.view, orders.view, orders.approve    |
| `pranee`  | `demo1234` | catalog.view                                 |

## Development, one remote on its own

A remote team does not need the shell running. Each remote boots with a stubbed
local session so the pages are usable alone:

```bash
npm --prefix apps/mfe-catalog start   # http://localhost:4202 renders the catalog directly
```

## Production-shaped run

This is the arrangement the evaluation is about: three separate builds served
from three origins with production cache headers.

```bash
npm run build          # platform, then all three apps

# three terminals
npm run serve:shell
npm run serve:orders
npm run serve:catalog
```

## Tests

```bash
npm run test:unit      # platform (vitest) + shell (Angular vitest builder)
npm run test:e2e       # Playwright, needs the three builds in dist/
```

The e2e project starts the three static servers itself if they are not already
running.

## Diagnosing a duplicated shared package

The failure that produces `NG0203` / `NG0200` in a composed page is two copies
of Angular being loaded. This prints how the browser actually resolved each
shared package:

```bash
npm run inspect:imports
```

Every scope pointing at the same file means one instance. A scope pointing at
another origin means a second copy and broken dependency injection.

## Pointing the shell at different origins

The manifest is a deployment artefact, not build output. The same shell build
serves every environment:

```bash
node deploy/apply-manifest.mjs deploy/manifests/local.json
node deploy/apply-manifest.mjs deploy/manifests/example-production.json
```

The script refuses a manifest with relative urls or one that does not point at a
`remoteEntry.json`, and leaves the existing file untouched when it refuses.

## Serving with a Content-Security-Policy

Any origins listed after the port are added to `script-src` and `connect-src`,
and a policy is sent:

```bash
node deploy/serve-static.mjs apps/shell/dist/shell/browser 4400   http://localhost:4201 http://localhost:4202
```

The policy this produces is the measured minimum for this stack; see
`docs/findings.md`. `MFE_CSP_SCRIPT_EXTRA` adds further `script-src` tokens if
you want to re-run the experiment.

## Measuring what the composed page actually downloads

```bash
npm run measure:payload
```

Reports transferred bytes by origin and the ten largest files, which is the
number a bundle budget belongs on. `e2e/tests/payload.spec.ts` enforces it.

## Continuous integration

`.github/workflows/` has one pipeline per deployable app, filtered to its own
paths, plus an `e2e` pipeline with no filter because composition can break from
a change in any app. Each app pipeline also triggers on `packages/platform/**`,
which is the shared singleton coupling made visible rather than hidden.

## Reproducing the independent-deploy proof by hand

```bash
# note the build ids at the bottom of http://localhost:4200
npm --prefix apps/mfe-catalog run build
# reload: only the mfe-catalog row changed
```

The automated version of this is `e2e/tests/independent-deploy.spec.ts`.
