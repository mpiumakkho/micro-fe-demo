import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { cartStore } from '@mfe-demo/platform';
import { CatalogApi, type Product } from './catalog-api';

@Component({
  selector: 'mfe-catalog-product-detail',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail {
  private readonly api = inject(CatalogApi);
  private readonly route = inject(ActivatedRoute);

  readonly product = signal<Product | null>(null);
  readonly loading = signal(true);
  readonly quantity = signal(1);

  constructor() {
    // Read the parameter through ActivatedRoute rather than a component input.
    // Component input binding is a router feature the shell configures, and a
    // remote must not depend on how the host set up its router.
    void this.load(this.route.snapshot.paramMap.get('productId'));
  }

  private async load(productId: string | null): Promise<void> {
    try {
      this.product.set(productId ? await this.api.byId(productId) : null);
    } catch (cause) {
      console.error('[mfe-catalog] failed to load product', cause);
    } finally {
      this.loading.set(false);
    }
  }

  setQuantity(event: Event): void {
    const parsed = Number.parseInt((event.target as HTMLInputElement).value, 10);
    this.quantity.set(Number.isFinite(parsed) && parsed > 0 ? parsed : 1);
  }

  addToCart(product: Product): void {
    cartStore.add(
      { productId: product.id, name: product.name, unitPrice: product.unitPrice },
      this.quantity(),
    );
  }
}
