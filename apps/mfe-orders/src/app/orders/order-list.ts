import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { authStore, cartStore } from '@mfe-demo/platform';
import { EmptyOrderError, OrdersApi } from './orders-api';

@Component({
  selector: 'mfe-orders-order-list',
  imports: [RouterLink, DecimalPipe, DatePipe],
  templateUrl: './order-list.html',
  styleUrl: './order-list.scss',
})
export class OrderList {
  private readonly api = inject(OrdersApi);

  readonly orders = this.api.orders;
  readonly user = authStore.user;
  readonly error = signal<string | null>(null);
  readonly placed = signal<string | null>(null);

  // Written by mfe-catalog, read here. Neither remote imports the other; the
  // shared platform instance is the only thing between them.
  readonly cartItems = cartStore.items;
  readonly cartTotal = cartStore.total;

  readonly canApprove = computed(() => authStore.hasRole('orders.approve'));
  readonly canPlace = computed(() => this.cartItems().length > 0);

  placeFromCart(): void {
    this.error.set(null);
    this.placed.set(null);

    try {
      const order = this.api.place(
        this.user()?.displayName ?? 'unknown',
        this.cartItems().map((item) => ({
          productId: item.productId,
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
      );
      cartStore.clear();
      this.placed.set(order.id);
    } catch (cause) {
      if (cause instanceof EmptyOrderError) {
        this.error.set(cause.message);
      } else {
        console.error('[mfe-orders] could not place order', cause);
        this.error.set('Could not place the order. See the browser console.');
      }
    }
  }

  approve(orderId: string): void {
    this.api.approve(orderId);
  }
}
