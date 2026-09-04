import type { Routes } from '@angular/router';
import { requireRole, requireSession } from './auth/auth-guard';
import { loadRemoteRoutes } from './remote/load-remote';

/**
 * The shell owns the top-level path prefix and nothing below it. Everything
 * under /catalog and /orders is routed by the owning team inside the route
 * table their remote exposes, so they can add or rename inner pages without a
 * shell release.
 */
function accessDeniedRoutes(requiredRole: string): Routes {
  return [
    {
      path: '**',
      loadComponent: () => import('./access/access-denied').then((m) => m.AccessDenied),
      data: { requiredRole },
    },
  ];
}

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login').then((m) => m.Login),
  },

  {
    path: 'catalog',
    canMatch: [requireSession, requireRole('catalog.view')],
    loadChildren: () => loadRemoteRoutes('mfe-catalog'),
  },
  // Reached only when the guards above reject. Declared after the guarded route
  // so an authorised user never sees it.
  {
    path: 'catalog',
    loadChildren: () => Promise.resolve(accessDeniedRoutes('catalog.view')),
  },

  {
    path: 'orders',
    canMatch: [requireSession, requireRole('orders.view')],
    loadChildren: () => loadRemoteRoutes('mfe-orders'),
  },
  {
    path: 'orders',
    loadChildren: () => Promise.resolve(accessDeniedRoutes('orders.view')),
  },

  { path: '**', redirectTo: '' },
];
