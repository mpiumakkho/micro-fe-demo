import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authStore, type AuthSession } from '@mfe-demo/platform';
import { App } from './app';

function sessionWith(roles: readonly string[]): AuthSession {
  return {
    user: { id: 'u1', username: 'tester', displayName: 'Tester', roles },
    token: 'test-token',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
}

function visibleNavLinks(element: HTMLElement): string[] {
  return Array.from(element.querySelectorAll('nav a')).map((a) => a.textContent?.trim() ?? '');
}

describe('App navigation', () => {
  beforeEach(async () => {
    authStore.setSession(null);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    authStore.setSession(null);
  });

  it('offers no remote sections when signed out', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(visibleNavLinks(fixture.nativeElement)).toEqual(['Home']);
  });

  it('offers only the sections the roles allow', async () => {
    authStore.setSession(sessionWith(['catalog.view']));

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(visibleNavLinks(fixture.nativeElement)).toEqual(['Home', 'Catalog']);
  });

  it('offers every section to a user holding both roles', async () => {
    authStore.setSession(sessionWith(['catalog.view', 'orders.view']));

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(visibleNavLinks(fixture.nativeElement)).toEqual(['Home', 'Catalog', 'Orders']);
  });
});
