import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import {
  HONUWARE_CRUD_ACCESS,
  HONUWARE_AUTH_ACCESS,
  HONUWARE_PHOTO_ACCESS,
  provideHonuwareAccess,
} from './access-tokens';
import { HonuwareAccessProxy } from './honuware-access-proxy';
import { CrudAccess } from './crud-access';
import { AuthAccess } from './auth-access';
import { PhotoAccess } from './photo-access';

describe('honuware access tokens', () => {
  it('default to the request-serializing HonuwareAccessProxy', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const proxy = TestBed.inject(HonuwareAccessProxy);
    expect(TestBed.inject(HONUWARE_CRUD_ACCESS)).toBe(proxy);
    expect(TestBed.inject(HONUWARE_AUTH_ACCESS)).toBe(proxy);
    expect(TestBed.inject(HONUWARE_PHOTO_ACCESS)).toBe(proxy);
  });

  it('provideHonuwareAccess() (http mode) wires the tokens to the proxy', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideHonuwareAccess()],
    });
    const proxy = TestBed.inject(HonuwareAccessProxy);
    expect(TestBed.inject(HONUWARE_CRUD_ACCESS)).toBe(proxy);
  });

  it('provideHonuwareAccess({ mode: "mock" }) wires caller-supplied implementations', () => {
    const crud = { tag: 'crud' } as unknown as CrudAccess;
    const auth = { tag: 'auth' } as unknown as AuthAccess;
    const photo = { tag: 'photo' } as unknown as PhotoAccess;
    TestBed.configureTestingModule({ providers: [provideHonuwareAccess({ mode: 'mock', crud, auth, photo })] });
    expect(TestBed.inject(HONUWARE_CRUD_ACCESS)).toBe(crud);
    expect(TestBed.inject(HONUWARE_AUTH_ACCESS)).toBe(auth);
    expect(TestBed.inject(HONUWARE_PHOTO_ACCESS)).toBe(photo);
  });

  it('provideHonuwareAccess({ mode: "mock" }) without implementations throws', () => {
    expect(() => provideHonuwareAccess({ mode: 'mock' })).toThrowError(/requires crud, auth, and photo/);
  });
});
