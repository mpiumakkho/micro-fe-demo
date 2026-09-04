# micro-fe-demo

Three separately built and separately deployed Angular applications composed in
the browser at runtime with Native Federation.

This exists to answer three questions with evidence, not to look like a product:

1. Can a remote be deployed on its own?
2. Can the teams move independently?
3. Is this safe to take to production?

The answers, with the measurements behind them, are in
[docs/findings.md](docs/findings.md). The short version:

| Question | Answer |
| --- | --- |
| Independent deploy | Yes, verified by rebuilding one remote and comparing build ids |
| Team autonomy | Partly. Code, libraries, pipeline and release timing yes; the installed Angular version must be identical in every app |
| Production ready | Conditionally, if a coordinated Angular upgrade is acceptable |

## Layout

```
apps/
  shell/          host, owns auth and top-level routing        :4200
  mfe-orders/     remote, exposes ./routes                     :4201
  mfe-catalog/    remote, exposes ./routes                     :4202
packages/
  platform/       @mfe-demo/platform - shared auth, cart, build registry
deploy/
  asset-rules.mjs    cache headers and the CSP, in one place
  serve-static.mjs   one app on its own origin
  serve-composed.mjs every app on one origin under path prefixes
  apply-manifest.mjs points a built shell at another environment's remotes
  manifests/         one manifest per environment and per layout
e2e/              Playwright proofs, one spec per property
.github/workflows/ one pipeline per deployable app, filtered to its own paths
docs/             findings, decisions, runbook
```

Each app under `apps/` has its own `package.json`, lockfile, `node_modules`,
build and test command. That is deliberate: a single Angular workspace cannot
answer questions 1 and 2, because its projects are physically incapable of
diverging. See [docs/adr-001-structure-and-federation.md](docs/adr-001-structure-and-federation.md).

## Running it

Full instructions in [docs/runbook.md](docs/runbook.md). Short version:

```bash
npm --prefix packages/platform install && npm --prefix packages/platform run build
npm --prefix apps/shell install
npm --prefix apps/mfe-orders install
npm --prefix apps/mfe-catalog install

npm run build      # all three apps
npm run serve:shell    # three terminals
npm run serve:orders
npm run serve:catalog
```

Open http://localhost:4200 and sign in as `somchai` / `demo1234`.

The panel at the bottom of every page is the evidence surface: it reports the
build each loaded app came from, and whether the shared platform package ended
up as one instance or several.

## Verifying the answers

```bash
npm run check:versions    # do the apps agree on every shared package?
npm run test:unit         # platform, shell, and both remotes
npm run test:e2e          # the three questions, as tests
npm run inspect:imports   # is Angular loaded once or twice?
npm run measure:payload   # what the composed page actually downloads
```

`npm run test:e2e` needs the three builds present in `dist/`; it starts the
static origins itself, including one with a Content-Security-Policy and one that
serves the catalog from a second host so relocation can be proved.

## Versions

Angular 21 and Node 20. Angular 22 requires Node `^22.22.3 || ^24.15.0 || >=26`
and will not install on Node 20.19.x.

| Package | Version |
| --- | --- |
| `@angular/core` | 21.2.22 |
| `@angular/cli` | 21.1.4 |
| `@angular-architects/native-federation` | 21.2.5 |
| Node | 20.19.6 |

All three apps must install the **same** `@angular/core` build, which
`npm run check:versions` enforces in CI. Federation
deduplicates a shared package by its exact version string, so an app on a
different build loads its own copy of Angular and its dependency injection stops
working. A mismatched remote breaks only itself; a mismatched shell breaks every
remote at once. Measurements are in
[docs/findings.md](docs/findings.md#2-can-the-teams-move-independently).
