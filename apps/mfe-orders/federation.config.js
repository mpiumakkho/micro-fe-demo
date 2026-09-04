const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

/**
 * Remote: mfe-orders
 *
 * Exposes its route table rather than a single component, so this team owns its
 * own internal navigation. The shell only knows the path prefix it mounts the
 * remote under; it does not know the routes inside.
 */
module.exports = withNativeFederation({
  name: 'mfe-orders',

  exposes: {
    './routes': './src/app/orders/orders.routes.ts',
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),

    // See the note in shell/federation.config.js. Every app must declare this
    // the same way or the singleton is not shared.
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
    // Do not add '@angular/common/http' here even though nothing in this repo
    // uses HttpClient. @angular/platform-browser imports it, so skipping it
    // fails at runtime with "Unable to resolve specifier '@angular/common/http'"
    // and the app never boots. Its ~47 kB is not removable this way.
  ],

  features: {
    ignoreUnusedDeps: true,
  },
});
