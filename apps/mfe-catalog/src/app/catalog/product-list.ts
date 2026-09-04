import { DecimalPipe } from '@angular/common';
import { Component, PendingTasks, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { authStore, cartStore } from '@mfe-demo/platform';
import { CatalogApi, type Product } from './catalog-api';

@Component({
  selector: 'mfe-catalog-product-list',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  private readonly api = inject(CatalogApi);
  private readonly pendingTasks = inject(PendingTasks);

  readonly products = signal<readonly Product[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Read from the shared platform instance the shell owns. This remote never
  // authenticates and never stores a session of its own.
  readonly user = authStore.user;
  readonly cartCount = cartStore.count;

  constructor() {
    void this.load();
  }

  /**
   * The load is registered as a pending task so the application is not reported
   * as stable while it is in flight. Without this, zoneless change detection has
   * no idea the work exists, and both server side rendering and tests would
   * observe an empty table as a finished state.
   */
  private async load(): Promise<void> {
    const taskDone = this.pendingTasks.add();
    try {
      this.products.set(await this.api.list());
    } catch (cause) {
      console.error('[mfe-catalog] failed to load products', cause);
      this.error.set('Could not load products.');
    } finally {
      this.loading.set(false);
      taskDone();
    }
  }

  addToCart(product: Product): void {
    cartStore.add({
      productId: product.id,
      name: product.name,
      unitPrice: product.unitPrice,
    });
  }
}
