import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateChildFn,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import {
  AdminGuard,
  AuthGuard,
  ManageProductsGuard,
  NoAuthGuard,
  StaffGuard,
} from './auth-guards';
import { AuthService } from './auth.service';
import { AUTH_ROUTES, AuthRoutes, DEFAULT_AUTH_ROUTES } from './auth-routes';
import { AuthData } from './auth.types';

type Guard = CanActivateFn | CanActivateChildFn;
type GuardResult = boolean | UrlTree;

const NO_AUTH: AuthData = { isAuth: false };

function authed(overrides: Partial<Extract<AuthData, { isAuth: true }>> = {}): AuthData {
  return {
    isAuth: true,
    personId: 1,
    firstName: 'A',
    lastName: 'B',
    email: 'a@b.c',
    createdAt: '0',
    isAdmin: false,
    roles: [],
    permissions: [],
    mustChangePassword: false,
    ...overrides,
  };
}

describe('auth guards', () => {
  let router: Router;

  function configure(authData: AuthData, routesOverride?: AuthRoutes): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { authData } },
        ...(routesOverride ? [{ provide: AUTH_ROUTES, useValue: routesOverride }] : []),
      ],
    });
    router = TestBed.inject(Router);
  }

  function run(guard: Guard, url = '/my/account'): GuardResult {
    const state = { url } as RouterStateSnapshot;
    const route = {} as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(
      () => (guard as CanActivateFn)(route, state)
    ) as GuardResult;
  }

  function expectRedirect(result: GuardResult, expectedPath: string): void {
    expect(result).withContext('should be a redirect, not `true`').not.toBe(true);
    expect((result as UrlTree).toString()).toBe(router.parseUrl(expectedPath).toString());
  }

  // --- Defaults (AUTH_ROUTES resolves to DEFAULT_AUTH_ROUTES) ---

  describe('AdminGuard', () => {
    it('allows an admin', () => {
      configure(authed({ isAdmin: true }));
      expect(run(AdminGuard)).toBeTrue();
    });

    it('redirects a non-admin to the home path', () => {
      configure(authed());
      expectRedirect(run(AdminGuard), DEFAULT_AUTH_ROUTES.postLogoutPath);
    });

    it('redirects an unauthenticated user to the home path', () => {
      configure(NO_AUTH);
      expectRedirect(run(AdminGuard), DEFAULT_AUTH_ROUTES.postLogoutPath);
    });
  });

  describe('AuthGuard', () => {
    it('allows an authenticated user', () => {
      configure(authed());
      expect(run(AuthGuard)).toBeTrue();
    });

    it('redirects an unauthenticated user to login with an encoded returnUrl', () => {
      configure(NO_AUTH);
      expectRedirect(run(AuthGuard, '/my/account'), '/login?returnUrl=%2Fmy%2Faccount');
    });

    it('lets the login and register pages through even when unauthenticated', () => {
      configure(NO_AUTH);
      expect(run(AuthGuard, '/login')).toBeTrue();
      expect(run(AuthGuard, '/register')).toBeTrue();
    });

    it('forces a must-change-password user to the change-password page', () => {
      configure(authed({ mustChangePassword: true }));
      expectRedirect(run(AuthGuard, '/my/account'), DEFAULT_AUTH_ROUTES.mustChangePasswordPath);
    });

    it('lets a must-change-password user reach the change-password page itself', () => {
      configure(authed({ mustChangePassword: true }));
      expect(run(AuthGuard, '/my/update-user-password')).toBeTrue();
    });
  });

  describe('ManageProductsGuard', () => {
    it('allows a user with the manage_products permission', () => {
      configure(authed({ permissions: ['manage_products'] }));
      expect(run(ManageProductsGuard)).toBeTrue();
    });

    it('redirects a user without it to the home path', () => {
      configure(authed());
      expectRedirect(run(ManageProductsGuard), DEFAULT_AUTH_ROUTES.postLogoutPath);
    });
  });

  describe('StaffGuard', () => {
    it('allows a user with staff access (instructor)', () => {
      configure(authed({ permissions: ['instructor'] }));
      expect(run(StaffGuard)).toBeTrue();
    });

    it('redirects a non-staff user to the home path', () => {
      configure(authed());
      expectRedirect(run(StaffGuard), DEFAULT_AUTH_ROUTES.postLogoutPath);
    });
  });

  describe('NoAuthGuard', () => {
    it('allows an unauthenticated user', () => {
      configure(NO_AUTH);
      expect(run(NoAuthGuard)).toBeTrue();
    });

    it('redirects an authenticated user to the home path', () => {
      configure(authed());
      expectRedirect(run(NoAuthGuard), DEFAULT_AUTH_ROUTES.postLogoutPath);
    });
  });

  // --- Overridden AUTH_ROUTES: every redirect target is token-driven ---

  describe('with overridden AUTH_ROUTES', () => {
    const CUSTOM: AuthRoutes = {
      loginPath: '/sign-in',
      registerPath: '/sign-up',
      postLogoutPath: '/home',
      mustChangePasswordPath: '/force-pw',
      returnUrlAllowlist: ['/area'],
    };

    it('AdminGuard denies to the custom home path', () => {
      configure(authed(), CUSTOM);
      expectRedirect(run(AdminGuard), '/home');
    });

    it('AuthGuard redirects to the custom login path with returnUrl', () => {
      configure(NO_AUTH, CUSTOM);
      expectRedirect(run(AuthGuard, '/my/account'), '/sign-in?returnUrl=%2Fmy%2Faccount');
    });

    it('AuthGuard forces the custom change-password path', () => {
      configure(authed({ mustChangePassword: true }), CUSTOM);
      expectRedirect(run(AuthGuard, '/my/account'), '/force-pw');
    });

    it('AuthGuard lets the custom register path through unauthenticated', () => {
      configure(NO_AUTH, CUSTOM);
      expect(run(AuthGuard, '/sign-up')).toBeTrue();
    });
  });
});
