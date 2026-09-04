const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

/**
 * Shell = dynamic host.
 *
 * Remote URLs are NOT listed here. They are read at runtime from
 * public/federation.manifest.json, which is why a remote can be redeployed to a
 * new origin without rebuilding or redeploying the shell.
 */
module.exports = withNativeFederation({
  name: 'shell',

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),

    // Shared application state. This must collapse to exactly one instance or
    // the shell and each remote silently get their own auth session and cart.
    // requiredVersion is pinned by hand: the package is installed as a file:
    // dependency, so shareAll has no semver range to read from package.json.
    // strictVersion is false on purpose - a remote is allowed to ship against a
    // newer 1.x platform than the shell without being blocked from loading.
    '@mfe-demo/platform': {
      singleton: true,
      strictVersion: false,
      requiredVersion: '^1.0.0',
    },
  },

  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
  ],

  features: {
    ignoreUnusedDeps: true,
  },
});
