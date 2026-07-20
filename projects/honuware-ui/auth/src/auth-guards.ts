import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChildFn, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { hasManageProducts, hasStaffAccess } from './auth.types';
import { AUTH_ROUTES } from './auth-routes';

export const AdminGuard: CanActivateFn | CanActivateChildFn = () => {
  const router: Router = inject(Router);
  const authService: AuthService = inject(AuthService);
  const routes = inject(AUTH_ROUTES);

  if (!authService.authData.isAuth || !authService.authData.isAdmin) {
    return router.parseUrl(routes.postLogoutPath);
  }

  return true;
};

export const AuthGuard: CanActivateFn | CanActivateChildFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router: Router = inject(Router);
  const authService: AuthService = inject(AuthService);
  const routes = inject(AUTH_ROUTES);

  const url = state.url;
  // Allow access to login and register without auth
  if (url.startsWith(routes.loginPath) || url.startsWith(routes.registerPath)) {
    return true;
  }

  if (!authService.authData.isAuth) {
    const returnUrl = encodeURIComponent(url);
    return router.parseUrl(`${routes.loginPath}?returnUrl=${returnUrl}`);
  }

  // Force password change if required (allow access to the change password page itself)
  if (authService.authData.mustChangePassword &&
      !url.startsWith(routes.mustChangePasswordPath)) {
    return router.parseUrl(routes.mustChangePasswordPath);
  }

  return true;
};

export const ManageProductsGuard: CanActivateFn | CanActivateChildFn = () => {
  const router: Router = inject(Router);
  const authService: AuthService = inject(AuthService);
  const routes = inject(AUTH_ROUTES);

  if (!hasManageProducts(authService.authData)) {
    return router.parseUrl(routes.postLogoutPath);
  }

  return true;
};

export const StaffGuard: CanActivateFn | CanActivateChildFn = () => {
  const router: Router = inject(Router);
  const authService: AuthService = inject(AuthService);
  const routes = inject(AUTH_ROUTES);

  if (!hasStaffAccess(authService.authData)) {
    return router.parseUrl(routes.postLogoutPath);
  }

  return true;
};

export const NoAuthGuard: CanActivateFn | CanActivateChildFn = () => {
  const router: Router = inject(Router);
  const authService: AuthService = inject(AuthService);
  const routes = inject(AUTH_ROUTES);

  if (authService.authData.isAuth) {
    return router.parseUrl(routes.postLogoutPath);
  }

  return true;
};
