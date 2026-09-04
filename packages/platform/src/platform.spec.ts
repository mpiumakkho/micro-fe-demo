import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from './auth-store';
import { CartStore } from './cart-store';
import type { AuthSession } from './types';

function sessionExpiringIn(ms: number, roles: readonly string[] = ['orders.view']): AuthSession {
  return {
    user: { id: 'u1', username: 'tester', displayName: 'Tester', roles },
    token: 'token-1',
    expiresAt: new Date(Date.now() + ms).toISOString(),
  };
}

/** Minimal in-memory stand-in for sessionStorage. */
function useFakeStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
  vi.stubGlobal('sessionStorage', storage);
  return data;
}

describe('CartStore', () => {
  let cart: CartStore;

  beforeEach(() => {
    cart = new CartStore();
  });

  it('merges a repeated product into one line', () => {
    cart.add({ productId: 'p1', name: 'Printer', unitPrice: 100 }, 2);
    cart.add({ productId: 'p1', name: 'Printer', unitPrice: 100 }, 3);

    expect(cart.items()).toHaveLength(1);
    expect(cart.items()[0]?.quantity).toBe(5);
    expect(cart.count()).toBe(5);
    expect(cart.total()).toBe(500);
  });

  it('rejects a non-positive quantity rather than silently ignoring it', () => {
    expect(() => cart.add({ productId: 'p1', name: 'Printer', unitPrice: 100 }, 0)).toThrow(RangeError);
    expect(cart.items()).toHaveLength(0);
  });

  it('removes one product without touching the others', () => {
    cart.add({ productId: 'p1', name: 'Printer', unitPrice: 100 });
    cart.add({ productId: 'p2', name: 'Scanner', unitPrice: 50 });
    cart.remove('p1');

    expect(cart.items().map((i) => i.productId)).toEqual(['p2']);
  });
});

describe('AuthStore', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports roles from the current session only', () => {
    useFakeStorage();
    const auth = new AuthStore();

    expect(auth.hasRole('orders.view')).toBe(false);

    auth.setSession(sessionExpiringIn(60_000, ['orders.view']));
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.hasRole('orders.view')).toBe(true);
    expect(auth.hasRole('orders.approve')).toBe(false);

    auth.setSession(null);
    expect(auth.hasRole('orders.view')).toBe(false);
    expect(auth.getToken()).toBeNull();
  });

  it('restores a stored session so a reload does not sign the user out', () => {
    useFakeStorage({ 'mfe-demo.session': JSON.stringify(sessionExpiringIn(60_000)) });

    const auth = new AuthStore();

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()?.username).toBe('tester');
  });

  it('discards a stored session that has already expired', () => {
    const data = useFakeStorage({ 'mfe-demo.session': JSON.stringify(sessionExpiringIn(-1_000)) });

    const auth = new AuthStore();

    expect(auth.isAuthenticated()).toBe(false);
    expect(data.has('mfe-demo.session')).toBe(false);
  });

  it('starts signed out when the stored value is corrupt', () => {
    useFakeStorage({ 'mfe-demo.session': 'not json' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const auth = new AuthStore();

    expect(auth.isAuthenticated()).toBe(false);
    // The failure is reported rather than swallowed.
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
