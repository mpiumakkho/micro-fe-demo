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

---

## 2. Can the teams move independently?

**Partly. Not for the Angular version, and that is the important half.**

### What was measured

Baseline: all three apps on `@angular/core@21.2.22`. Everything works.

Skew: `shell` moved to the Angular 21.1 toolchain (`@angular/core@21.1.6`,
`@angular/build@21.1.5`, `@angular-architects/native-federation@21.1.1`), remotes
left on 21.2.22. That is one minor version of drift between host and remotes.

Result: **both remotes stopped rendering.**

| Route | Console error | Rendered |
| --- | --- | --- |
| `/orders` | `NG0203` | nothing |
| `/catalog` | `NG0200` | nothing |

The cause, read out of the injected import map (`npm run inspect:imports`):

```
skewed:
  root                          @angular/core -> ./_angular_core...js            (21.1.6, the host's)
  scope http://localhost:4201/  @angular/core -> http://localhost:4202/...js     (21.2.22)
  scope http://localhost:4202/  @angular/core -> http://localhost:4202/...js     (21.2.22)
  => 2 INSTANCES

aligned:
  root                          @angular/core -> ./_angular_core.5-AGBur5af.js
  scope http://localhost:4201/  @angular/core -> ./_angular_core.5-AGBur5af.js
  scope http://localhost:4202/  @angular/core -> ./_angular_core.5-AGBur5af.js
  => one instance
```

Two copies of Angular in one page means two dependency injection systems, which
is what `NG0203` and `NG0200` are reporting.

### The part that is easy to get wrong

The failure is decided by the **installed** version, not by the declared range.
This was isolated by changing only the declared ranges and rebuilding:

| `mfe-catalog` declares | `shell` declares | Installed versions | Result |
| --- | --- | --- | --- |
| `^21.2.0` | `21.1.6` (exact) | 21.2.22 vs 21.1.6 | 2 instances, both remotes dead |
| `^21.1.0` | `21.1.6` (exact) | 21.2.22 vs 21.1.6 | 2 instances, both remotes dead |
| `^21.1.0` | `^21.1.0` | 21.2.22 vs 21.1.6 | 2 instances, both remotes dead |
| `^21.1.0` | `^21.1.0` | 21.2.22 everywhere | 1 instance, works |

Relaxing `strictVersion` or widening `requiredVersion` does not help. Native
Federation picks the highest available version per scope, so as soon as any app
ships a different `@angular/core` build, the remotes get their own copy.

Two further points worth noting:

- `mfe-orders` broke even though its declared range `^21.1.0` was satisfied by
  the host's 21.1.6. One team's drift took down a team that had not drifted.
- `@mfe-demo/platform` stayed a single instance throughout, because all three
  apps had the identical version of it. The rule is the same for every
  singleton, framework or not.

### What this means in practice

Independent per team:

- application code, components, styles, internal routes
- their own non-shared libraries
- release cadence and deploy timing
- their own CI pipeline and test suite

Not independent, must move in lockstep across all apps:

- `@angular/core` and every other Angular package
- `@mfe-demo/platform`
- anything else declared `singleton: true`

An Angular upgrade is a coordinated release of all three apps. That does not
remove the value of micro frontends here, but it has to be planned for: it is the
largest recurring cost of this architecture, and it recurs every Angular release.

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

| Gap | Risk |
| --- | --- |
| No backend; auth, catalog and orders are in-memory mocks | Token refresh, expiry handling and 401 propagation across remotes are untested |
| Cart state is memory-only and lost on reload | Deliberate here, but a real cart needs server-side persistence |
| No Content-Security-Policy | Federation loads script from other origins; CSP has to allow them explicitly and was not exercised |
| No SSR | Native Federation supports it; nothing here was tested with it |
| No per-remote error reporting | A remote's runtime error only reaches the browser console; production needs to know which remote failed |
| No bundle budget across the composed page | Each app is measured alone; nobody measures what the user actually downloads |
| Only two remotes | Communication is one shared store between two consumers. Ownership and contention questions appear at five or ten |
| `mfe-orders` and `mfe-catalog` have no unit tests | Only the shell and `packages/platform` are covered |

### Recommendation

Fit for production **if** the organisation accepts a coordinated Angular upgrade
across every app in the federation. If teams need to upgrade Angular on their own
schedule, this approach does not deliver that, and no configuration change in
Native Federation makes it deliver that. The remaining options are separate pages
per team, or iframes, each with its own costs.

The other gaps above are ordinary engineering work with known solutions. The
version lockstep is the one architectural constraint that has to be accepted or
designed around before committing.
