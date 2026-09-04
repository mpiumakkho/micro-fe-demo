import { signal, type Signal } from '@angular/core';

export interface RemoteError {
  readonly remote: string;
  readonly kind: 'load' | 'runtime';
  readonly message: string;
  readonly at: string;
}

const MAX_KEPT = 20;

const state = signal<readonly RemoteError[]>([]);

/** Failures attributed to a specific remote, newest first. */
export const remoteErrors: Signal<readonly RemoteError[]> = state.asReadonly();

export function recordRemoteError(remote: string, kind: RemoteError['kind'], message: string): void {
  const entry: RemoteError = { remote, kind, message, at: new Date().toISOString() };
  state.update((errors) => [entry, ...errors].slice(0, MAX_KEPT));
}

export function clearRemoteErrors(): void {
  state.set([]);
}
