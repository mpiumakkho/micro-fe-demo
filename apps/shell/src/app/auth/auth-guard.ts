import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { authStore } from '@mfe-demo/platform';

/**
 * canMatch rather than canActivate on purpose.
 *
 * canMatch runs before loadChildren, so a user without the role never
 * downloads the remote's bundle. With canActivate the remote would be fetched
 * first and rejected afterwards, which leaks both bandwidth and the fact that
 * the feature exists.
 */
export const requireSession: CanMatchFn = () => {
  const router = inject(Router);
  return authStore.isAuthenticated() || router.createUrlTree(['/login']);
};

export function requireRole(role: string): CanMatchFn {
  return () => authStore.hasRole(role);
}
