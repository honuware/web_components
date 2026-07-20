import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthHttpAccess } from './auth-http-access';

describe('AuthHttpAccess', () => {
  let svc: AuthHttpAccess;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthHttpAccess],
    });
    svc = TestBed.inject(AuthHttpAccess);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('login POSTs the credentials to /api/login', () => {
    svc.login({ email: 'a@b.c', password: 'pw', remember: true }).subscribe();
    const req = http.expectOne('/api/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.c', password: 'pw', remember: true });
    req.flush(null);
  });

  it('me GETs /api/me (read-only, no CSRF)', () => {
    svc.me().subscribe();
    const req = http.expectOne('/api/me');
    expect(req.request.method).toBe('GET');
    req.flush(null);
  });

  it('register POSTs a snake_cased body', () => {
    svc.register('Ada', 'Byte', 'ada@x.io', 'secret').subscribe();
    const req = http.expectOne('/api/register');
    expect(req.request.body).toEqual({ first_name: 'Ada', last_name: 'Byte', email: 'ada@x.io', password: 'secret' });
    req.flush(null);
  });

  it('getUserInfo POSTs /api/get_user_info', () => {
    svc.getUserInfo().subscribe();
    const req = http.expectOne('/api/get_user_info');
    expect(req.request.method).toBe('POST');
    req.flush({ person_id: 1, first_name: 'A', last_name: 'B', email: 'a@b.c', created_at: '0', roles: [], permissions: [] });
  });
});
