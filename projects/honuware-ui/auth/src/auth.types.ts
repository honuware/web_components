export type AuthData =
  | {
      isAuth: false;
    }
  | {
      isAuth: true;
      personId: number;
      firstName: string;
      lastName: string;
      email: string;
      createdAt: string;
      isAdmin: boolean;
      roles: string[];
      permissions: string[];
      mustChangePassword: boolean;
    };

export const DEFAULT_NON_AUTH_DATA: AuthData = {
  isAuth: false,
};

export function hasPermission(authData: AuthData, permission: string): boolean {
  return authData.isAuth && authData.permissions.includes(permission);
}

export function hasManageProducts(authData: AuthData): boolean {
  return (authData.isAuth && authData.isAdmin) || hasPermission(authData, 'manage_products');
}

export function hasStaffAccess(authData: AuthData): boolean {
  return (authData.isAuth && authData.isAdmin)
    || hasPermission(authData, 'instructor')
    || hasPermission(authData, 'admin_portal')
    || hasPermission(authData, 'provider');
}
