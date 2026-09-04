import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { authStore } from '@mfe-demo/platform';
import { AuthApi, InvalidCredentialsError, type DemoAccount } from './auth-api';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  readonly username = signal('');
  readonly password = signal('');
  readonly pending = signal(false);
  readonly error = signal<string | null>(null);

  readonly accounts = this.api.demoAccounts();
  readonly session = authStore.session;

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    this.pending.set(true);

    try {
      authStore.setSession(await this.api.login(this.username(), this.password()));
      await this.router.navigateByUrl('/');
    } catch (cause) {
      if (cause instanceof InvalidCredentialsError) {
        this.error.set(cause.message);
      } else {
        // Anything else is a defect, not a user mistake. Surface it rather than
        // folding it into the same message.
        console.error('[shell] login failed unexpectedly', cause);
        this.error.set('Login failed unexpectedly. See the browser console.');
      }
    } finally {
      this.pending.set(false);
    }
  }

  fill(account: DemoAccount): void {
    this.username.set(account.username);
    this.password.set(account.password);
    this.error.set(null);
  }

  signOut(): void {
    authStore.setSession(null);
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
