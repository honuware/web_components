/*
 * @honuware/ui/auth — the auth layer: AuthService + AuthData/permission
 * helpers, the five route guards, the ErrorInterceptor, the login/register/
 * verify pages (selectors `hw-`), the AUTH_ROUTES config token, and the
 * tryTokenLogin bootstrap initializer. Depends on foundation + access.
 */
export { AuthService } from './auth.service';

export { DEFAULT_NON_AUTH_DATA, hasPermission, hasManageProducts, hasStaffAccess } from './auth.types';
export type { AuthData } from './auth.types';

export { AUTH_ROUTES, DEFAULT_AUTH_ROUTES } from './auth-routes';
export type { AuthRoutes } from './auth-routes';

export { AdminGuard, AuthGuard, ManageProductsGuard, StaffGuard, NoAuthGuard } from './auth-guards';

export { ErrorInterceptor } from './error.interceptor';
export type { ParsedHttpErrorResponse } from './error.interceptor';

export { LoginComponent } from './login/login.component';
export { RegisterComponent } from './register/register.component';
export { VerifyComponent } from './verify/verify.component';

export { tryTokenLoginInitializer } from './try-token-login';
