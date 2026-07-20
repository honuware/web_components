import { AuthData, hasPermission, hasManageProducts, hasStaffAccess } from './auth.types';

describe('auth.types helpers', () => {
  const unauthData: AuthData = { isAuth: false };

  function makeAuthData(overrides: Partial<{
    isAdmin: boolean;
    permissions: string[];
    roles: string[];
  }> = {}): AuthData {
    return {
      isAuth: true,
      personId: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@test.com',
      createdAt: '2026-01-01',
      isAdmin: overrides.isAdmin ?? false,
      roles: overrides.roles ?? [],
      permissions: overrides.permissions ?? [],
      mustChangePassword: false,
    };
  }

  describe('hasPermission', () => {
    it('should return false for unauthenticated user', () => {
      expect(hasPermission(unauthData, 'manage_products')).toBeFalse();
    });

    it('should return false when user does not have the permission', () => {
      const authData = makeAuthData({ permissions: ['other_permission'] });
      expect(hasPermission(authData, 'manage_products')).toBeFalse();
    });

    it('should return true when user has the permission', () => {
      const authData = makeAuthData({ permissions: ['manage_products'] });
      expect(hasPermission(authData, 'manage_products')).toBeTrue();
    });

    it('should return true when user has the permission among others', () => {
      const authData = makeAuthData({ permissions: ['admin_portal', 'manage_products', 'other'] });
      expect(hasPermission(authData, 'manage_products')).toBeTrue();
    });
  });

  describe('hasManageProducts', () => {
    it('should return false for unauthenticated user', () => {
      expect(hasManageProducts(unauthData)).toBeFalse();
    });

    it('should return false for authenticated user with no permissions and not admin', () => {
      const authData = makeAuthData();
      expect(hasManageProducts(authData)).toBeFalse();
    });

    it('should return true for admin user even without manage_products permission', () => {
      const authData = makeAuthData({ isAdmin: true, roles: ['admin'] });
      expect(hasManageProducts(authData)).toBeTrue();
    });

    it('should return true for non-admin user with manage_products permission', () => {
      const authData = makeAuthData({ permissions: ['manage_products'] });
      expect(hasManageProducts(authData)).toBeTrue();
    });

    it('should return true for admin user who also has manage_products permission', () => {
      const authData = makeAuthData({ isAdmin: true, roles: ['admin'], permissions: ['manage_products'] });
      expect(hasManageProducts(authData)).toBeTrue();
    });
  });

  describe('hasStaffAccess', () => {
    it('should return false for unauthenticated user', () => {
      expect(hasStaffAccess(unauthData)).toBeFalse();
    });

    it('should return false for authenticated user with no relevant permissions', () => {
      const authData = makeAuthData({ permissions: ['gold_member'] });
      expect(hasStaffAccess(authData)).toBeFalse();
    });

    it('should return true for admin user', () => {
      const authData = makeAuthData({ isAdmin: true });
      expect(hasStaffAccess(authData)).toBeTrue();
    });

    it('should return true for user with instructor permission', () => {
      const authData = makeAuthData({ permissions: ['instructor'] });
      expect(hasStaffAccess(authData)).toBeTrue();
    });

    it('should return true for user with admin_portal permission', () => {
      const authData = makeAuthData({ permissions: ['admin_portal'] });
      expect(hasStaffAccess(authData)).toBeTrue();
    });

    it('should return true for user with provider permission', () => {
      const authData = makeAuthData({ permissions: ['provider'] });
      expect(hasStaffAccess(authData)).toBeTrue();
    });

    it('should return false for user with only manage_products permission', () => {
      const authData = makeAuthData({ permissions: ['manage_products'] });
      expect(hasStaffAccess(authData)).toBeFalse();
    });
  });
});
