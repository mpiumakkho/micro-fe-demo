# Findings

What was actually measured, on Windows 11 / Node 20.19.6 / Angular CLI 21.1.4,
with `@angular-architects/native-federation@21.2.5` and Angular 21.2.22.

Every claim below has a reproducible check. Where a check is automated, the spec
file is named.

---

## 1. Can a remote be deployed on its own?

**Yes.** Verified.

`e2e/tests/independent-deploy.spec.ts` records the build id of all three apps,
rebuilds `mfe-catalog` only, reloads, and compares:

- `mfe-catalog` build id changed
- `shell` build id unchanged
- `mfe-orders` build id unchanged

No shell rebuild, no shell redeploy, no edit to
`apps/shell/public/federation.manifest.json`.

Four things have to be true for this to hold, and all four are load-bearing:

| Requirement | Where it lives | What breaks without it |
| --- | --- | --- |
| Remote URLs read at runtime | `dynamic-host` + `initFederation('federation.manifest.json')` in `apps/shell/src/main.ts` | Remote URLs are compiled into the shell; moving a remote needs a shell release |
| `remoteEntry.json` never cached | `deploy/serve-static.mjs`, `cacheControl()` | The browser keeps the previous deployment's bundle list, and the redeploy has no visible effect |
| `index.html` never cached | same | Same problem one level up |
| Hashed bundles immutable | same | Either stale code, or no caching at all |

The cache rules are the part most likely to be got wrong on a real CDN. A
`remoteEntry.json` served with a long max-age turns an independent deploy into a
deploy that appears to do nothing.

Deploying a new build of a remote is only half of it. `e2e/tests/relocate.spec.ts`
covers the other half: the same catalog build is served from a second origin,
`deploy/apply-manifest.mjs` writes a manifest pointing there, and the shell picks
it up on the next load with the same build id it already had. Nothing is
compiled. That is what makes one shell build usable across environments, and
what lets a remote change host without a coordinated release.

---

## 2. Can the teams move independently?

**Partly. Application code yes, the Angular runtime version no.**

### What was measured

Three configurations of the same code, moving only `@angular/core`:

| shell (host) | mfe-orders | mfe-catalog | core instances | outcome |
| --- | --- | --- | --- | --- |
| 21.1.6 | 21.2.22 | 21.2.22 | 2 | both remotes dead: `NG0203`, `NG0200`, nothing rendered |
| 21.2.22 | 21.2.22 | 21.1.6 | 2 | only `mfe-catalog` dead (`NG0203`); shell and `mfe-orders` unaffected |
| 21.2.22 | 21.2.22 | 21.2.22 | 1 | works |

Two copies of Angular in one page means two dependency injection systems, which
is what `NG0203` and `NG0200` are reporting.

### The rule

Native Federation deduplicates a shared package by its **exact installed version
string**. Every app whose version matches the host uses the host's single copy;
any app that differs loads its own.

Read out of the injected import map with `npm run inspect:imports`:

```
aligned (row 3):
  root                          @angular/core -> ./_angular_core.5-AGBur5af.js
  scope http://localhost:4201/  @angular/core -> ./_angular_core.5-AGBur5af.js
  scope http://localhost:4202/  @angular/core -> ./_angular_core.5-AGBur5af.js
  => one instance

mfe-catalog lagging (row 2):
  root                          @angular/core -> ./_angular_core.5-AGBur5af.js   (21.2.22, host)
  scope http://localhost:4201/  @angular/core -> ./_angular_core.5-AGBur5af.js   (21.2.22, host's copy)
  scope http://localhost:4202/  @angular/core -> http://localhost:4202/...js     (21.1.6, its own)
  => 2 INSTANCES
```

### Three things that do not decide it

**Not the declared range.** Isolated by changing only the ranges and rebuilding:

| `mfe-catalog` declares | `shell` declares | Installed versions | Result |
| --- | --- | --- | --- |
| `^21.2.0` | `21.1.6` (exact) | 21.2.22 vs 21.1.6 | 2 instances |
| `^21.1.0` | `21.1.6` (exact) | 21.2.22 vs 21.1.6 | 2 instances |
| `^21.1.0` | `^21.1.0` | 21.2.22 vs 21.1.6 | 2 instances |
| `^21.1.0` | `^21.1.0` | 21.2.22 everywhere | 1 instance |

Relaxing `strictVersion` or widening `requiredVersion` changes nothing. In row 2
of the first table the host's 21.2.22 satisfies the remote's `^21.1.0`, and the
remote still loaded its own 21.1.6.

**Not the direction.** A remote lagging behind the host fails exactly as a remote
running ahead of it. "Upgrade the shell first and let the remotes catch up" does
not work.

**Not the federation plugin version.** With `mfe-catalog` built on
`@angular-architects/native-federation@21.1.1` against the shell's `21.2.5`, but
Angular matched at 21.2.22, both remotes render and there is one instance. Only
the Angular runtime version has to match; the plugin version may differ.

### The blast radius is asymmetric

- A **remote** on the wrong version breaks only itself. The shell and every other
  remote keep working, so a bad remote deploy stays survivable.
- The **shell** on the wrong version breaks every remote at once, because then
  every remote differs from the host. The host's Angular version is a single
  point of failure for the whole federation.

### What this means in practice

Independent per team:

- application code, components, styles, internal routes
- their own non-shared libraries
- the federation plugin version
- release cadence and deploy timing
- their own CI pipeline and test suite

Must be the identical installed version in every app:

- `@angular/core` and every other Angular package
- `@mfe-demo/platform`
- anything else declared `singleton: true`

An Angular upgrade is a coordinated release of all three apps, and no
configuration setting removes that. The upgrades are not equally risky though: a
remote that gets it wrong takes out its own section, while the shell that gets it
wrong takes out all of them, so the shell's upgrade is the one that needs a
rehearsal and a rollback path.

---

## 3. Is this safe to take to production?

**Conditionally.** The mechanics hold up. The gaps below are work that remains,
not reasons to stop.

### Verified working

| Property | Evidence |
| --- | --- |
| Two remotes compose into one page at runtime | `e2e/tests/composition.spec.ts` |
| A remote owns its own inner routes | `e2e/tests/composition.spec.ts` |
| State written by one remote is read by the other, with no import between them | `e2e/tests/shared-state.spec.ts` |
| An unreachable remote does not take the shell down | `e2e/tests/isolation.spec.ts` |
| An unauthorised user never downloads the remote's bundle | `e2e/tests/isolation.spec.ts` |
| The shared package stays a single instance | `PlatformStatus` panel, `npm run inspect:imports` |
| A remote can be moved to another origin with no rebuild | `e2e/tests/relocate.spec.ts` |
| The composed page works under a Content-Security-Policy | `e2e/tests/csp.spec.ts` |
| A remote costs its own code, not a second framework | `e2e/tests/payload.spec.ts` |
| A failure is attributed to the remote that caused it | `e2e/tests/isolation.spec.ts` |

### Problems found and fixed while building this

**`ng test` does not work in a federated app.** The
`@angular-architects/native-federation:init` schematic replaces the project's
`build` target, and `@angular/build:unit-test` derives its build options from
that target by default. The result is
`pluginOptions.instrumentForCoverage is not a function`.

Reproduced on a clean `ng new` app: passing before the schematic, failing after
it, with no other change. Fix applied to all three apps in `angular.json`:

```json
"test": {
  "builder": "@angular/build:unit-test",
  "options": { "buildTarget": "<project>:esbuild:development" }
}
```

Worth knowing because it is silent: a team that never wrote a unit test would not
discover it until they wrote the first one.

**The session did not survive a reload.** Found by `e2e/tests/isolation.spec.ts`,
which navigates directly to `/orders` instead of clicking through. The store was
memory-only, so every hard navigation and every deep link signed the user out.
`AuthStore` now hydrates from `sessionStorage`
(`packages/platform/src/auth-store.ts`). In a real system the token belongs in an
http-only cookie and this would be cache, not the source of truth.

**A strict CSP stops the app from booting.** Measured by serving the shell with
a policy and tightening it until the page worked. The minimum this stack needs:

```
script-src 'self' blob: 'unsafe-inline' <each remote origin>
```

- `blob:` is required because es-module-shims runs shimmed modules through
  `URL.createObjectURL`.
- `'unsafe-inline'` is required because the federation runtime injects the
  computed import map as an inline script and sets no nonce on it.
  es-module-shims accepts an `esmsInitOptions.nonce`, but nothing in
  `@softarc/native-federation-runtime` passes one, so a nonce-based policy is
  not reachable without changing that package.
- `'unsafe-eval'` is **not** needed. Adding it changed nothing.
- Angular's `inlineCritical` optimisation emits
  `<link ... onload="this.media='all'">`, an inline event handler that a strict
  policy blocks. It is turned off in all three apps; the cost is a small first
  paint regression, the benefit is not needing `'unsafe-inline'` for that too.

`'unsafe-inline'` in `script-src` is a real weakening and it is forced by the
tooling, not chosen. It is the strongest argument in this report for treating a
federation host as a higher risk surface than an ordinary Angular app.

**Serving every app from one origin removes most of the CSP problem.** Measured
by putting the same three builds behind one port under path prefixes
(`/`, `/remotes/mfe-orders/`, `/remotes/mfe-catalog/`) with
`deploy/serve-composed.mjs`, and pointing the shell there with
`deploy/manifests/single-origin.json`:

| | separate origins | one origin |
| --- | --- | --- |
| `script-src` | `'self' blob: 'unsafe-inline'` **plus every remote origin** | `'self' blob: 'unsafe-inline'` |
| adding a remote | edit the policy, new security review | no change |
| CORS | required on every remote | not applicable, nothing is cross-origin |
| Angular instances | 1 | 1 |
| independent deploy | works | works, each prefix is its own upload target |

Everything still composes: both remotes render, one Angular instance, zero CSP
violations, and the browser contacts exactly one origin. `e2e/tests/single-origin.spec.ts`
holds it.

The isolation given up is smaller than it looks. Every remote already executes in
the shell's JavaScript context and can reach its storage and its DOM, so separate
origins buy almost no security boundary here while costing a policy edit per
remote. The `'unsafe-inline'` relaxation remains either way; what changes is that
it stops growing.

**An unattributed error names no owner.** A runtime failure inside a remote used
to reach the console as an anonymous stack trace. The shell now derives
origin-to-remote from the import map federation injected and tags errors with
the remote they came from, shown in the evidence panel and ready to forward to a
monitoring backend. Writing the unit test for it found a defect in the first
implementation: splitting a root import key on `/` turns `@angular/core` into a
remote called `@angular` mapped to the shell's own origin, which would have
misattributed every shell error. The registry keys off the import map scopes
instead.

**The composed page is 858 kB uncompressed**, of which the remotes contribute
16 kB and 4 kB. Everything else is the framework, downloaded once from the
shell's origin, which is the sharing working as intended. `deploy/serve-static.mjs`
sends no compression, so a real CDN transfers roughly a quarter of that.

`@angular/common/http` is in that total at about 47 kB even though nothing here
uses `HttpClient`. Adding it to the federation `skip` list looks like free
savings and is not: `@angular/platform-browser` imports it, and the app fails to
boot with `Unable to resolve specifier '@angular/common/http'`. The comment in
each `federation.config.js` records this so nobody tries it again.

### Constraints a remote team has to respect

- A remote's global `styles.scss` is **not** loaded inside the shell. Only
  component styles apply. Shared values are read as CSS custom properties with
  fallbacks, so standalone mode still looks right.
- A remote must not depend on router features the host configures. Route
  parameters are read through `ActivatedRoute`, not component input binding,
  because `withComponentInputBinding()` is the host's choice.
- Remote-internal links are relative, so no remote hardcodes the path prefix the
  shell mounted it under.
- Cross-origin remotes need CORS: `angular.json` `serve-original.headers` for
  development, `deploy/serve-static.mjs` for the built output.

### Not covered, and the risk of each

Left out on purpose, because the demo was scoped to a mock backend and two
remotes:

| Gap | Risk |
| --- | --- |
| No backend; auth, catalog and orders are in-memory mocks | Token refresh, expiry handling and 401 propagation across remotes are untested. This is the largest remaining unknown |
| Cart state is memory-only and lost on reload | Fine for a demo; a real cart needs server-side persistence |
| Only two remotes | Communication is one shared store between two consumers. Ownership and contention questions appear at five or ten |

Not attempted:

| Gap | Risk |
| --- | --- |
| No SSR | Native Federation supports it, and the shell's inline import map makes hydration worth checking before committing to it |
| No CDN in front of the origins | The cache rules are verified against `deploy/serve-static.mjs`, not against a real CDN's defaults, which are usually wrong for `remoteEntry.json` |
| CI is defined but only exercised on this repo's own pushes | The per-app pipelines in `.github/workflows/` express the independence claim; they have not been run against a deploy target |
| Error attribution is reported, not shipped anywhere | `RemoteAwareErrorHandler` tags the remote and writes to the evidence panel. Forwarding to a monitoring backend is a one-line change that nobody has made |

### Recommendation

Fit for production **if** the organisation accepts a coordinated Angular upgrade
across every app in the federation. If teams need to upgrade Angular on their own
schedule, this approach does not deliver that, and no configuration change in
Native Federation makes it deliver that. The remaining options are separate pages
per team, or iframes, each with its own costs.

The lockstep is narrower than it first looks, which makes it easier to live with:
it applies to the installed version of Angular and of anything else declared
`singleton: true`, and to nothing else. Teams keep their own code, their own
libraries, their own pipeline, their own release timing, and even their own
version of the federation plugin. A remote that gets the Angular version wrong
takes out only its own section.

The one place that needs real process is the shell. Its Angular version decides
what every remote must match, so its upgrade breaks every remote at once if it
lands alone. That release needs all three apps staged together, a rehearsal, and
a rollback path.

The other gaps above are ordinary engineering work with known solutions. The
Angular version lockstep is the one architectural constraint that has to be
accepted or designed around before committing.

### If it is adopted, four rules follow from the measurements

1. **Enforce the version lockstep in CI, do not agree to it.** Any app can bump
   its own dependency, the build stays green, and the browser breaks.
   `scripts/check-shared-versions.mjs` reads the lockfiles and fails the build
   when two apps disagree on a package they share.
2. **Serve every app from one origin under path prefixes.** Same independence,
   no CORS, and a policy that does not have to be edited for each new remote.
   Measured above.
3. **Upgrade Angular blue/green through the manifest.** No ordering is safe: the
   shell moving first breaks every remote, a remote moving first breaks itself.
   Build all apps on the new version, deploy them beside the old ones, then flip
   the shell and `federation.manifest.json` together. Rollback is flipping back.
   Old builds have to stay online through the transition, because a browser that
   already loaded the previous shell is still holding its import map.
4. **Keep the shell thin.** Routing, auth, layout, error boundary. Its Angular
   version dictates everyone else's, and a defect in it has no failure boundary
   above it. Business features and a component library both belong in remotes or
   in versioned libraries, not in the host.
