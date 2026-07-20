import { TestBed } from '@angular/core/testing';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { ErrorInterceptor, ParsedHttpErrorResponse } from './error.interceptor';
import { ErrorTypes, ProblemDetails } from '@honuware/ui/access';
import { AUTH_ROUTES, AuthRoutes, DEFAULT_AUTH_ROUTES } from './auth-routes';

describe('ErrorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  // Configure a fresh TestBed, optionally with an overridden AUTH_ROUTES so a
  // test can prove the redirect target is token-driven, not hardcoded.
  function configure(routesOverride?: AuthRoutes): void {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        { provide: Router, useValue: routerSpy },
        ...(routesOverride ? [{ provide: AUTH_ROUTES, useValue: routesOverride }] : []),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    httpMock.verify();
  });

  function problem(type: string, status: number): ProblemDetails {
    return { type, title: 'Test error', status, detail: 'test detail' };
  }

  // Issues a request, flushes the given error body/status, and resolves with
  // the error the interceptor rethrew.
  function fire(
    url: string,
    body: ProblemDetails | string,
    status: number
  ): Promise<ParsedHttpErrorResponse> {
    return new Promise((resolve, reject) => {
      http.get(url).subscribe({
        next: () => reject(new Error('expected the request to error')),
        error: (err: ParsedHttpErrorResponse) => resolve(err),
      });
      httpMock.expectOne(url).flush(body, { status, statusText: 'Error' });
    });
  }

  // The login page lives at /login (auth routes are mounted at the app root),
  // NOT /auth/login — this pins the redirect target to the real route.
  it('redirects to the login path when the session has expired', async () => {
    configure();
    await fire('/api/get_user_info', problem(ErrorTypes.SESSION_EXPIRED, 401), 401);
    expect(routerSpy.navigate).toHaveBeenCalledWith([DEFAULT_AUTH_ROUTES.loginPath]);
  });

  it('redirects to the login path when not authenticated on a non-auth endpoint', async () => {
    configure();
    await fire('/api/get_user_info', problem(ErrorTypes.NOT_AUTHENTICATED, 401), 401);
    expect(routerSpy.navigate).toHaveBeenCalledWith([DEFAULT_AUTH_ROUTES.loginPath]);
  });

  it('does not redirect when not authenticated on an auth endpoint', async () => {
    configure();
    await fire('/api/login', problem(ErrorTypes.NOT_AUTHENTICATED, 401), 401);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('does not redirect for non-auth errors and attaches parsed problemDetails', async () => {
    configure();
    const err = await fire('/api/add_item', problem(ErrorTypes.VALIDATION_ERROR, 400), 400);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(err.problemDetails.type).toBe(ErrorTypes.VALIDATION_ERROR);
    expect(err.problemDetails.status).toBe(400);
  });

  it('parses legacy non-RFC7807 error bodies into problemDetails', async () => {
    configure();
    const err = await fire('/api/add_item', 'plain text failure', 500);
    expect(err.problemDetails.type).toBe(ErrorTypes.INTERNAL_ERROR);
    expect(err.problemDetails.detail).toBe('plain text failure');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  // The redirect target is token-driven: a consumer that mounts login at a
  // different path gets bounced there, not to '/login'.
  it('honors an overridden AUTH_ROUTES.loginPath', async () => {
    configure({ ...DEFAULT_AUTH_ROUTES, loginPath: '/sign-in' });
    await fire('/api/get_user_info', problem(ErrorTypes.SESSION_EXPIRED, 401), 401);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/sign-in']);
  });
});
