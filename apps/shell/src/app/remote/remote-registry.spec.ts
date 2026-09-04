import { remoteForStack, remoteOriginsFromImportMap } from './remote-registry';

function withImportMap(content: string): Document {
  const scope = document.implementation.createHTMLDocument('test');
  const script = scope.createElement('script');
  script.setAttribute('type', 'importmap-shim');
  script.textContent = content;
  scope.head.appendChild(script);
  return scope;
}

const IMPORT_MAP = JSON.stringify({
  imports: {
    '@angular/core': 'http://localhost:4200/_angular_core.abc.js',
    'mfe-orders/routes': 'http://localhost:4201/routes-PDVXVUAJ.js',
    'mfe-catalog/routes': 'http://localhost:4202/routes-4HHEMZ22.js',
  },
  scopes: {
    'http://localhost:4201/': { '@angular/core': 'http://localhost:4200/_angular_core.abc.js' },
    'http://localhost:4202/': { '@angular/core': 'http://localhost:4200/_angular_core.abc.js' },
  },
});

describe('remoteOriginsFromImportMap', () => {
  it('maps each remote origin to the remote that serves it', () => {
    const origins = remoteOriginsFromImportMap(withImportMap(IMPORT_MAP));

    expect(origins.get('http://localhost:4201')).toBe('mfe-orders');
    expect(origins.get('http://localhost:4202')).toBe('mfe-catalog');
  });

  it('ignores shared packages, which are not remotes', () => {
    const origins = remoteOriginsFromImportMap(withImportMap(IMPORT_MAP));

    // "@angular/core" also contains a slash. Treating it as a remote would name
    // the shell's own origin and misattribute every shell error to it.
    expect([...origins.values()]).not.toContain('@angular');
    expect(origins.has('http://localhost:4200')).toBe(false);
    expect(origins.size).toBe(2);
  });

  it('returns an empty map rather than throwing when there is no import map', () => {
    expect(remoteOriginsFromImportMap(document.implementation.createHTMLDocument('empty')).size).toBe(0);
  });

  it('returns an empty map rather than throwing when the import map is malformed', () => {
    expect(remoteOriginsFromImportMap(withImportMap('{ not json')).size).toBe(0);
  });
});

describe('remoteForStack', () => {
  const origins = remoteOriginsFromImportMap(withImportMap(IMPORT_MAP));

  it('names the remote whose origin appears in the stack', () => {
    const stack = [
      'TypeError: cannot read properties of undefined',
      '    at OrderList.place (http://localhost:4201/routes-PDVXVUAJ.js:12:9)',
      '    at http://localhost:4200/main-abc.js:1:1',
    ].join('\n');

    expect(remoteForStack(stack, origins)).toBe('mfe-orders');
  });

  it('returns null for an error raised in the shell itself', () => {
    const stack = 'Error: boom\n    at Login.submit (http://localhost:4200/chunk-abc.js:4:2)';

    expect(remoteForStack(stack, origins)).toBeNull();
  });

  it('returns null when the error carries no stack', () => {
    expect(remoteForStack(undefined, origins)).toBeNull();
  });
});
