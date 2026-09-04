import { computed, signal, type Signal } from '@angular/core';
import type { AuthSession, User } from './types';

const STORAGE_KEY = 'mfe-demo.session';

/**
 * sessionStorage, not memory alone.
 *
 * Without this every hard navigation and every reload signs the user out, which
 * breaks deep links into a remote. It is also per-tab and cleared on close,
 * which is the weakest storage that still makes the app usable. A real system
 * would keep the token in an http-only cookie and treat this as cache.
 */
function readStoredSession(): AuthSession | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw) as AuthSession;
    if (!Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= Date.now()) {
      globalThis.sessionStorage?.removeItem(STORAGE_KEY);
      return null;
    }

    return session;
  } catch (cause) {
    // Corrupt or unreadable storage must not stop the app from starting, but it
    // is worth knowing about rather than swallowing.
    console.warn('[@mfe-demo/platform] stored session could not be restored', cause);
    return null;
  }
}

function writeStoredSession(session: AuthSession | null): void {
  try {
    if (session) {
      globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      globalThis.sessionStorage?.removeItem(STORAGE_KEY);
    }
  } catch (cause) {
    console.warn('[@mfe-demo/platform] session could not be persisted', cause);
  }
}

/**
 * Session state shared by the shell and every remote.
 *
 * The store holds state only; it never calls a backend. The shell owns
 * authentication (login form, credential check, token refresh) and pushes the
 * result in via `setSession`. Remotes are read-only consumers, which keeps a
 * remote from having to know how the shell authenticates.
 */
export class AuthStore {
  private readonly state = signal<AuthSession | null>(readStoredSession());

  readonly session: Signal<AuthSession | null> = this.state.asReadonly();

  readonly user: Signal<User | null> = computed(() => this.state()?.user ?? null);

  readonly isAuthenticated: Signal<boolean> = computed(() => this.state() !== null);

  hasRole(role: string): boolean {
    return this.state()?.user.roles.includes(role) ?? false;
  }

  getToken(): string | null {
    return this.state()?.token ?? null;
  }

  /** Shell only. Remotes must treat the session as read-only. */
  setSession(session: AuthSession | null): void {
    this.state.set(session);
    writeStoredSession(session);
  }
}

export const authStore = new AuthStore();
