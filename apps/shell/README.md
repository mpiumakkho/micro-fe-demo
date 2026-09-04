# shell

The federation host. Port 4200.

Owns the things a remote must not own:

- authentication, including the login form and the session pushed into
  `@mfe-demo/platform`
- top-level routing and the path prefix each remote is mounted under
- the failure boundary that keeps a broken remote out of the rest of the page

It is a `dynamic-host`: remote URLs are read from
`public/federation.manifest.json` at runtime, never compiled in. Replacing that
file at deploy time points the shell at different origins with no rebuild.

## Running

```bash
npm start        # http://localhost:4200, expects the remotes on 4201 and 4202
npm run build
npm test
```

Sign in as `somchai` / `demo1234` for every role, or `pranee` / `demo1234` for a
user without access to orders.

## Notes

- Route guards use `canMatch`, not `canActivate`, so an unauthorised user never
  downloads the remote bundle.
- The `test` target points at the `esbuild` target on purpose. The federation
  schematic replaces the `build` target, and `@angular/build:unit-test` derives
  its options from it.
