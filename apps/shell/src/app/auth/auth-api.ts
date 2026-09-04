import { Injectable } from '@angular/core';
import type { AuthSession, User } from '@mfe-demo/platform';

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Username or password is incorrect');
    this.name = 'InvalidCredentialsError';
  }
}

export interface DemoAccount {
  readonly username: string;
  readonly password: string;
  readonly displayName: string;
  readonly roles: readonly string[];
}

const SESSION_TTL_MS = 30 * 60 * 1000;
const FAKE_LATENCY_MS = 250;

/**
 * Stand-in for an identity provider. The demo has no backend, so credentials
 * are checked in memory. Only the shell talks to this - remotes read the
 * resulting session from the platform singleton and never authenticate.
 */
const ACCOUNTS: readonly DemoAccount[] = [
  {
    username: 'somchai',
    password: 'demo1234',
    displayName: 'Somchai (Ops Manager)',
    roles: ['catalog.view', 'orders.view', 'orders.approve'],
  },
  {
    username: 'pranee',
    password: 'demo1234',
    displayName: 'Pranee (Catalog Editor)',
    roles: ['catalog.view'],
  },
];

@Injectable({ providedIn: 'root' })
export class AuthApi {
  async login(username: string, password: string): Promise<AuthSession> {
    await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY_MS));

    const account = ACCOUNTS.find((a) => a.username === username.trim().toLowerCase());
    if (!account || account.password !== password) {
      throw new InvalidCredentialsError();
    }

    const user: User = {
      id: `user-${account.username}`,
      username: account.username,
      displayName: account.displayName,
      roles: account.roles,
    };

    return {
      user,
      token: `mock-token.${user.id}.${Date.now().toString(36)}`,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    };
  }

  /** Shown on the login screen so the demo can be driven without a password list. */
  demoAccounts(): readonly DemoAccount[] {
    return ACCOUNTS;
  }
}
