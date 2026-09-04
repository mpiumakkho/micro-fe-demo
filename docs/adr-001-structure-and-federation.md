# ADR 001: Repository structure and federation approach

Status: accepted
Date: 2026-09-04

## Context

The demo has to answer three questions with evidence, not with a working screen:

1. Can a remote be deployed on its own?
2. Can the teams move independently?
3. Is this safe to take to production?

The structure had to be chosen so that a negative answer is actually reachable.
A setup that cannot fail proves nothing.

## Decisions

### 1. One npm package per app, not one Angular workspace

Each app under `apps/` has its own `package.json`, lockfile, `node_modules`,
build and test command.

A single Angular workspace with multiple projects would have been faster to set
up and quicker to install, but it shares one lockfile and one Angular version
across every project. Under that layout question 1 can only be answered "yes"
trivially and question 2 cannot be answered at all, because the apps are
physically incapable of diverging. The cost is disk space and slower installs;
the benefit is that both questions have a real answer.

This also matches the layout already used in `../mfe-task-manage`.

### 2. Native Federation, with the shell as a dynamic host

`@angular-architects/native-federation@21.2.5` on Angular 21, esbuild-based.

The shell is a `dynamic-host`: remote URLs live in
`apps/shell/public/federation.manifest.json` and are read at runtime by
`initFederation('federation.manifest.json')`. They are never compiled into the
shell bundle. This is the mechanical reason a remote can move to a new origin,
or be redeployed, without a shell release.

### 3. Remotes expose a route table, not a component

Each remote exposes `./routes`. The shell mounts that table under a path prefix
it chooses and knows nothing about what is inside. A remote team can add,
rename and reorder its own pages without touching the shell.

The cost is that the shell cannot statically know a remote's URLs, so deep
links into a remote are only validated at runtime.

### 4. One shared package, `@mfe-demo/platform`, as a federation singleton

Shared session and cart state live in a single package that every app declares
as `singleton: true`. A separate types-only "contracts" package was considered
and rejected: it would have added a second package to version without changing
the answer to any of the three questions, because the implementation has to be
a runtime singleton regardless.

The package is installed as a `file:` dependency. In a real setup this would be
a private registry; `file:` keeps the demo self-contained while producing the
same federation behaviour (confirmed in the generated `remoteEntry.json`).

Consequence, and it is a real one: changing `@mfe-demo/platform` requires
rebuilding and redeploying all three apps. The shared singleton is the coupling
point of this architecture. Anything that does not have to be shared should not
go in it — order data, for example, stays inside `mfe-orders`.

### 5. The shell owns authentication; remotes are read-only consumers

`AuthStore` holds state and never calls a backend. The shell runs the login
form and pushes the result in with `setSession`. Remotes read `user()`,
`isAuthenticated()` and `hasRole()`. No remote can authenticate, and no remote
needs to know how the shell does it.

### 6. Role checks use `canMatch`, not `canActivate`

`canMatch` runs before `loadChildren`, so a user without the role never
downloads the remote's bundle. With `canActivate` the remote would be fetched
first and rejected afterwards, which wastes bandwidth and reveals that the
feature exists. Verified in `e2e/tests/isolation.spec.ts`.

### 7. Zoneless change detection

Angular 21 defaults to it, and it removes a class of federation problems:
`zone.js` is a singleton that patches globals, and two copies in one page
misbehave in ways that are hard to diagnose. Cross-app state is signals only.

### 8. Each app carries its own copy of `scripts/write-build-info.mjs`

Roughly 40 duplicated lines. An app that needs a file from outside its own
folder in order to build is not independently buildable, which would undercut
decision 1. The duplication is the honest cost of the property being tested.

## Consequences

- Installing the repo takes three separate `npm install` runs plus the platform.
- Angular upgrades are not independent per team. See `findings.md` question 2.
- The evidence for each question is automated in `e2e/`, so the answers can be
  re-checked after any change rather than trusted from this document.
