# mfe-catalog

Federated remote. Port 4202. Exposes `./routes`.

Owns the product catalog. Writes into the shared cart in `@mfe-demo/platform`,
which mfe-orders reads. The two remotes never import each other.

## Running

```bash
npm start        # http://localhost:4202, runs standalone without the shell
npm run build
npm test
```

Standalone mode stubs a local session in `src/bootstrap.ts`, which never runs
when the shell loads this remote.

## Constraints when running inside the shell

- `src/styles.scss` is not loaded. Only component styles apply, so shared values
  are read as CSS custom properties with fallbacks.
- Route parameters are read through `ActivatedRoute`, not component input
  binding, because input binding is a router feature the host configures.
- Internal links are relative, so this remote never hardcodes the path prefix the
  shell mounted it under.
- Async loads register with `PendingTasks`. Under zoneless change detection,
  work that does not register is invisible to `whenStable()`, so tests and server
  side rendering would treat a half-loaded page as finished.
- `@angular/core` must be the same installed version as the shell.
