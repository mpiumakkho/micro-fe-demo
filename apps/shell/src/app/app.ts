import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { authStore, cartStore } from '@mfe-demo/platform';
import { PlatformStatus } from './platform/platform-status';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DecimalPipe, PlatformStatus],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);

  readonly user = authStore.user;
  readonly cartCount = cartStore.count;
  readonly cartTotal = cartStore.total;

  // hasRole reads the session signal internally, so these stay reactive.
  readonly canSeeCatalog = computed(() => authStore.hasRole('catalog.view'));
  readonly canSeeOrders = computed(() => authStore.hasRole('orders.view'));

  async signOut(): Promise<void> {
    authStore.setSession(null);
    cartStore.clear();
    await this.router.navigateByUrl('/login');
  }
}
