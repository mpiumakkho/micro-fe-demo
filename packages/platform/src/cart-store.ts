import { computed, signal, type Signal } from '@angular/core';
import type { CartItem } from './types';

/**
 * Cart state shared across remotes.
 *
 * This is the cross-remote case: mfe-catalog writes, mfe-orders reads, and
 * neither imports the other. State lives in the platform singleton so that
 * adding a third remote does not require changing the two existing ones.
 */
export class CartStore {
  private readonly state = signal<readonly CartItem[]>([]);

  readonly items: Signal<readonly CartItem[]> = this.state.asReadonly();

  readonly count: Signal<number> = computed(() =>
    this.state().reduce((sum, item) => sum + item.quantity, 0),
  );

  readonly total: Signal<number> = computed(() =>
    this.state().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );

  add(item: Omit<CartItem, 'quantity'>, quantity = 1): void {
    if (quantity <= 0) {
      throw new RangeError(`quantity must be greater than 0, received ${quantity}`);
    }
    this.state.update((items) => {
      const existing = items.find((i) => i.productId === item.productId);
      if (!existing) {
        return [...items, { ...item, quantity }];
      }
      return items.map((i) =>
        i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i,
      );
    });
  }

  remove(productId: string): void {
    this.state.update((items) => items.filter((i) => i.productId !== productId));
  }

  clear(): void {
    this.state.set([]);
  }
}

export const cartStore = new CartStore();
