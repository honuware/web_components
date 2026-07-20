import { TestBed } from '@angular/core/testing';
import { HttpClient, HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CsrfInterceptor } from './csrf.interceptor';

describe('CsrfInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  // Backup of document.cookie so each test starts from a clean slate.
  let originalCookie: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: CsrfInterceptor, multi: true },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    originalCookie = document.cookie;
    clearAllCookies();
  });

  afterEach(() => {
    controller.verify();
    clearAllCookies();
    // Restore any test-runner cookies that were present before.
    if (originalCookie) {
      for (const pair of originalCookie.split(';')) {
        const trimmed = pair.trim();
        if (trimmed) document.cookie = trimmed + ';path=/';
      }
    }
  });

  function setCookie(name: string, value: string): void {
    document.cookie = `${name}=${value};path=/`;
  }

  function clearAllCookies(): void {
    for (const pair of document.cookie.split(';')) {
      const eq = pair.indexOf('=');
      const name = (eq < 0 ? pair : pair.slice(0, eq)).trim();
      if (name) {
        document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    }
  }

  it('attaches X-CSRF-Token header on POST when csrft cookie is set', () => {
    setCookie('csrft', 'token-abc');

    http.post('/api/something', { hello: 'world' }).subscribe();

    const req = controller.expectOne('/api/something');
    expect(req.request.headers.get('X-CSRF-Token')).toBe('token-abc');
    req.flush({});
  });

  it('attaches X-CSRF-Token header on PUT', () => {
    setCookie('csrft', 'token-put');
    http.put('/api/something', {}).subscribe();
    const req = controller.expectOne('/api/something');
    expect(req.request.headers.get('X-CSRF-Token')).toBe('token-put');
    req.flush({});
  });

  it('attaches X-CSRF-Token header on PATCH', () => {
    setCookie('csrft', 'token-patch');
    http.patch('/api/something', {}).subscribe();
    const req = controller.expectOne('/api/something');
    expect(req.request.headers.get('X-CSRF-Token')).toBe('token-patch');
    req.flush({});
  });

  it('attaches X-CSRF-Token header on DELETE', () => {
    setCookie('csrft', 'token-delete');
    http.delete('/api/something').subscribe();
    const req = controller.expectOne('/api/something');
    expect(req.request.headers.get('X-CSRF-Token')).toBe('token-delete');
    req.flush({});
  });

  it('does NOT attach the header on GET', () => {
    setCookie('csrft', 'token-get-shouldnt-appear');
    http.get('/api/something').subscribe();
    const req = controller.expectOne('/api/something');
    expect(req.request.headers.has('X-CSRF-Token')).toBeFalse();
    req.flush({});
  });

  it('does NOT attach the header on HEAD', () => {
    setCookie('csrft', 'token-head-shouldnt-appear');
    http.head('/api/something').subscribe();
    const req = controller.expectOne('/api/something');
    expect(req.request.headers.has('X-CSRF-Token')).toBeFalse();
    req.flush({});
  });

  it('does NOT attach the header on OPTIONS', () => {
    setCookie('csrft', 'token-options-shouldnt-appear');
    http.options('/api/something').subscribe();
    const req = controller.expectOne('/api/something');
    expect(req.request.headers.has('X-CSRF-Token')).toBeFalse();
    req.flush({});
  });

  it('does NOT attach the header when the csrft cookie is absent', () => {
    // No setCookie call — emulates the bootstrap scenario where the
    // user has not logged in yet. The bootstrap endpoints
    // (login / register / remember / verify) are exempt server-side,
    // so no header is needed and we must not invent one.
    http.post('/api/login', { email: 'x', password: 'y' }).subscribe();
    const req = controller.expectOne('/api/login');
    expect(req.request.headers.has('X-CSRF-Token')).toBeFalse();
    req.flush({});
  });

  it('finds the csrft cookie when other cookies are present alongside', () => {
    setCookie('session_token', 'sess-123');
    setCookie('csrft', 'token-multi');
    setCookie('extra', 'something-else');

    http.post('/api/something', {}).subscribe();
    const req = controller.expectOne('/api/something');
    expect(req.request.headers.get('X-CSRF-Token')).toBe('token-multi');
    req.flush({});
  });

  it('does NOT match a partial-name cookie', () => {
    // A cookie named `csrft_other` must not be treated as `csrft`.
    setCookie('csrft_other', 'wrong-token');

    http.post('/api/something', {}).subscribe();
    const req = controller.expectOne('/api/something');
    expect(req.request.headers.has('X-CSRF-Token')).toBeFalse();
    req.flush({});
  });
});
