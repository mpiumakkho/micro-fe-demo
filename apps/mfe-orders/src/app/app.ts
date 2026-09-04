import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { authStore, cartStore } from '@mfe-demo/platform';

/**
 * Harness for running this remote on its own. The cart is empty here because
 * mfe-catalog is not loaded - that is the honest standalone behaviour, and the
 * seed button below exists so the team can still exercise the flow alone.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <div class="standalone">
      <strong>mfe-orders</strong> running standalone. The shell and mfe-catalog are not involved.
      <button type="button" (click)="seedCart()">Seed a cart item</button>
      <span>signed in as {{ user()?.displayName }}</span>
    </div>
    <main>
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: block;
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Thai', sans-serif;
      font-size: 14px;
      color: #1c2430;
    }
    .standalone {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      background: #fff8e6;
      border: 1px solid #e0c67a;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 0.85rem;
    }
    .standalone span {
      margin-left: auto;
      color: #5f6b7a;
    }
    .standalone button {
      font: inherit;
      cursor: pointer;
    }
  `,
})
export class App {
  readonly user = authStore.user;

  seedCart(): void {
    cartStore.add({ productId: 'sku-1001', name: 'Thermal receipt printer', unitPrice: 4200 });
  }
}
