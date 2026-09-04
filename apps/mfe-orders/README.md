# mfe-orders

Federated remote. Port 4201. Exposes `./routes`.

Owns order data and the order workflow. Reads the session and the cart from
`@mfe-demo/platform`; it never authenticates and never imports mfe-catalog.

## Running

```bash
npm start        # http://localhost:4201, runs standalone without the shell
npm run build
npm test
```

Standalone mode stubs a local session and offers a button to seed a cart item,
because mfe-catalog is not loaded to fill it. That scaffolding lives in
`src/bootstrap.ts`, which never runs when the shell loads this remote.

## Constraints when running inside the shell

- `src/styles.scss` is not loaded. Only component styles apply, so shared values
  are read as CSS custom properties with fallbacks.
- Route parameters are read through `ActivatedRoute`, not component input
  binding, because input binding is a router feature the host configures.
- Internal links are relative, so this remote never hardcodes the path prefix the
  shell mounted it under.
- `@angular/core` must be the same installed version as the shell. A different
  version loads a second copy of Angular and this remote stops rendering.
