import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { authStore } from '@mfe-demo/platform';

/**
 * Harness for running this remote on its own, without the shell. The team that
 * owns mfe-catalog can develop and test here with no dependency on the shell
 * being available - that independence is the point of the exercise.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <div class="standalone">
      <strong>mfe-catalog</strong> running standalone. The shell is not involved; the session below
      is stubbed locally.
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
  `,
})
export class App {
  readonly user = authStore.user;
}
