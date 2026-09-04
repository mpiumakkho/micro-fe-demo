import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { authStore } from '@mfe-demo/platform';

@Component({
  selector: 'app-access-denied',
  imports: [RouterLink],
  template: `
    <section class="panel">
      <h2>You do not have access to this section</h2>
      <p>
        It requires the <code>{{ requiredRole }}</code> role. Signed in as
        <strong>{{ user()?.displayName ?? 'nobody' }}</strong> with
        <code>{{ user()?.roles?.join(', ') || 'no roles' }}</code
        >.
      </p>
      <p>
        The remote was never downloaded - the guard runs before the bundle is fetched. Sign in as a
        different user from the <a routerLink="/login">login page</a> to compare.
      </p>
    </section>
  `,
  styles: `
    .panel {
      background: var(--mfe-surface, #fff);
      border: 1px solid var(--mfe-border, #d9dee5);
      border-left: 4px solid var(--mfe-danger, #b3261e);
      border-radius: var(--mfe-radius, 6px);
      padding: 20px;
    }
    h2 {
      margin-top: 0;
      font-size: 1.1rem;
    }
  `,
})
export class AccessDenied {
  private readonly route = inject(ActivatedRoute);

  readonly requiredRole: string = this.route.snapshot.data['requiredRole'] ?? 'unknown';
  readonly user = authStore.user;
}
