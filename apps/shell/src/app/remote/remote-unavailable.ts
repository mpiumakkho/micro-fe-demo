import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Shown in place of a remote that could not be loaded. The shell stays usable:
 * navigation, session and every other remote keep working.
 */
@Component({
  selector: 'app-remote-unavailable',
  template: `
    <section class="panel">
      <h2>This section is temporarily unavailable</h2>
      <p>
        The <code>{{ remoteName }}</code> micro frontend could not be loaded. The rest of the
        application is unaffected.
      </p>
      <p class="reason"><strong>Reason:</strong> {{ reason }}</p>
      <button type="button" (click)="reload()">Retry</button>
    </section>
  `,
  styles: `
    .panel {
      background: var(--mfe-surface, #fff);
      border: 1px solid var(--mfe-danger, #b3261e);
      border-radius: var(--mfe-radius, 6px);
      padding: 20px;
    }
    h2 {
      margin-top: 0;
      font-size: 1.1rem;
      color: var(--mfe-danger, #b3261e);
    }
    .reason {
      font-family: var(--mfe-mono, monospace);
      font-size: 0.85rem;
      color: var(--mfe-text-muted, #5f6b7a);
      word-break: break-word;
    }
    button {
      padding: 6px 14px;
      cursor: pointer;
    }
  `,
})
export class RemoteUnavailable {
  private readonly route = inject(ActivatedRoute);

  readonly remoteName: string = this.route.snapshot.data['remoteName'] ?? 'unknown';
  readonly reason: string = this.route.snapshot.data['reason'] ?? 'No detail available';

  reload(): void {
    location.reload();
  }
}
