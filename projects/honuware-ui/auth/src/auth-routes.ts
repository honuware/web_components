import { InjectionToken } from '@angular/core';

// Route literals the auth layer (guards, ErrorInterceptor, auth pages) would
// otherwise hardcode. Injected so a honuware consumer can remap them without
// forking the components — the seam that lets @honuware/ui/auth ship working
// auth screens + guards a new site *configures* rather than rewrites.
export interface AuthRoutes {
  /** Where the login page lives. */
  loginPath: string;
  /** Where the register page lives. */
  registerPath: string;
  /**
   * Home path — used both after logout and as the "access denied" fallback
   * for guard checks that reject the current user.
   */
  postLogoutPath: string;
  /** Forced-password-change page (users with must_change_password). */
  mustChangePasswordPath: string;
  /**
   * Same-origin path prefixes a post-login returnUrl may target. Anything
   * outside this list (or off-origin) is rejected to '/' by sanitizeReturnUrl.
   */
  returnUrlAllowlist: ReadonlyArray<string>;
}

export const DEFAULT_AUTH_ROUTES: AuthRoutes = {
  loginPath: '/login',
  registerPath: '/register',
  postLogoutPath: '/',
  mustChangePasswordPath: '/my/update-user-password',
  returnUrlAllowlist: ['/my', '/admin', '/manage', '/staff', '/calendar', '/shop'],
};

// Root-provided with the knottyyoga defaults, so nothing needs wiring today.
// When the auth layer moves into @honuware/ui/auth the library token drops the
// app default and each consumer provides its own AuthRoutes.
export const AUTH_ROUTES = new InjectionToken<AuthRoutes>('AUTH_ROUTES', {
  providedIn: 'root',
  factory: () => DEFAULT_AUTH_ROUTES,
});
