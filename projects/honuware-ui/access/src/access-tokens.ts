import { InjectionToken, Provider, inject } from '@angular/core';
import { CrudAccess } from './crud-access';
import { AuthAccess } from './auth-access';
import { PhotoAccess } from './photo-access';
import { HonuwareAccessProxy } from './honuware-access-proxy';

// Narrow injection seams over the server-access layer. Framework-generic
// consumers (controls, auth, photos, the generic CRUD editor) inject these
// instead of a full ~250-method app interface, so a foreign app can satisfy
// them with a 25-method implementation.
//
// The default resolves to HonuwareAccessProxy — the request-serializing façade
// over the default HTTP implementations — so a consumer that does nothing gets
// working, correctly-serialized access to the standard honuware endpoints. An
// app that has its own request-serializing client (like knottyyoga's
// ServerAccessProxy) overrides these tokens to point at it.

export const HONUWARE_CRUD_ACCESS = new InjectionToken<CrudAccess>(
  'HONUWARE_CRUD_ACCESS',
  { providedIn: 'root', factory: () => inject(HonuwareAccessProxy) }
);

export const HONUWARE_AUTH_ACCESS = new InjectionToken<AuthAccess>(
  'HONUWARE_AUTH_ACCESS',
  { providedIn: 'root', factory: () => inject(HonuwareAccessProxy) }
);

export const HONUWARE_PHOTO_ACCESS = new InjectionToken<PhotoAccess>(
  'HONUWARE_PHOTO_ACCESS',
  { providedIn: 'root', factory: () => inject(HonuwareAccessProxy) }
);

export interface HonuwareAccessConfig {
  /**
   * 'http' (default): wire the three tokens to the serializing proxy over the
   * default HTTP implementations. 'mock': wire them to caller-supplied
   * implementations (e.g. the in-memory mocks from @honuware/ui/testing).
   */
  mode?: 'http' | 'mock';
  crud?: CrudAccess;
  auth?: AuthAccess;
  photo?: PhotoAccess;
}

// Convenience wiring for a consumer's app config. `mode: 'http'` (default) is
// equivalent to the token defaults; `mode: 'mock'` requires the caller to
// supply crud/auth/photo implementations (the testing entry point provides a
// wrapper that fills them in).
export function provideHonuwareAccess(config: HonuwareAccessConfig = {}): Provider[] {
  if (config.mode === 'mock') {
    if (!config.crud || !config.auth || !config.photo) {
      throw new Error('provideHonuwareAccess({ mode: "mock" }) requires crud, auth, and photo implementations.');
    }
    return [
      { provide: HONUWARE_CRUD_ACCESS, useValue: config.crud },
      { provide: HONUWARE_AUTH_ACCESS, useValue: config.auth },
      { provide: HONUWARE_PHOTO_ACCESS, useValue: config.photo },
    ];
  }
  return [
    { provide: HONUWARE_CRUD_ACCESS, useExisting: HonuwareAccessProxy },
    { provide: HONUWARE_AUTH_ACCESS, useExisting: HonuwareAccessProxy },
    { provide: HONUWARE_PHOTO_ACCESS, useExisting: HonuwareAccessProxy },
  ];
}
