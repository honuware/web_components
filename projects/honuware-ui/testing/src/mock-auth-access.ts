import { Observable, of, throwError } from 'rxjs';
import {
  AuthAccess,
  UserInfo,
  LoginInfo,
  SetUserInfo,
  UpdateUserPasswordInfo,
} from '@honuware/ui/access';

export interface StoredUser {
  user: UserInfo;
  password: string;
}

export interface MockAuthAccessOptions {
  /** Seed users the store knows about (with their login password). */
  users?: StoredUser[];
}

const unauthorized = (): Observable<never> =>
  throwError(() => ({ status: 401, message: 'Unauthorized' }));

/**
 * In-memory {@link AuthAccess} session simulator for tests. Tracks registered
 * users, a current session, and a "remember me" token. `me()`/`getUserInfo()`
 * reject with a 401-shaped error when no session is active — enough to exercise
 * AuthService's login / silent-reauth (me → remember → me) flows.
 */
export class MockAuthAccess implements AuthAccess {
  private readonly users = new Map<string, StoredUser>();
  private currentEmail: string | null = null;
  private rememberedEmail: string | null = null;
  private personIdCounter = 0;

  constructor(options: MockAuthAccessOptions = {}) {
    for (const seed of options.users ?? []) {
      this.users.set(seed.user.email, { user: { ...seed.user }, password: seed.password });
      this.personIdCounter = Math.max(this.personIdCounter, seed.user.person_id);
    }
  }

  register(firstName: string, lastName: string, email: string, password: string): Observable<void> {
    this.users.set(email, {
      user: {
        person_id: ++this.personIdCounter,
        first_name: firstName,
        last_name: lastName,
        email,
        created_at: '0',
        roles: [],
        permissions: [],
        must_change_password: false,
      },
      password,
    });
    return of(void 0);
  }

  verify(): Observable<void> {
    // The mock treats every verification link as valid.
    return of(void 0);
  }

  login(loginInfo: LoginInfo): Observable<void> {
    const stored = this.users.get(loginInfo.email);
    if (!stored || stored.password !== loginInfo.password) return unauthorized();
    this.currentEmail = loginInfo.email;
    this.rememberedEmail = loginInfo.remember ? loginInfo.email : null;
    return of(void 0);
  }

  logout(): Observable<void> {
    this.currentEmail = null;
    this.rememberedEmail = null;
    return of(void 0);
  }

  me(): Observable<void> {
    return this.currentEmail ? of(void 0) : unauthorized();
  }

  remember(): Observable<void> {
    if (!this.rememberedEmail) return unauthorized();
    this.currentEmail = this.rememberedEmail;
    return of(void 0);
  }

  getUserInfo(): Observable<UserInfo> {
    const stored = this.currentEmail ? this.users.get(this.currentEmail) : undefined;
    return stored ? of({ ...stored.user }) : unauthorized();
  }

  setUserInfo(userInfo: SetUserInfo): Observable<void> {
    const email = this.currentEmail;
    const stored = email ? this.users.get(email) : undefined;
    if (!email || !stored) return unauthorized();
    stored.user = { ...stored.user, ...userInfo };
    if (userInfo.email !== email) {
      this.users.delete(email);
      this.users.set(userInfo.email, stored);
      this.currentEmail = userInfo.email;
    }
    return of(void 0);
  }

  updateUserPassword(passwordInfo: UpdateUserPasswordInfo): Observable<void> {
    const stored = this.currentEmail ? this.users.get(this.currentEmail) : undefined;
    if (!stored || stored.password !== passwordInfo.old_password) return unauthorized();
    stored.password = passwordInfo.new_password;
    return of(void 0);
  }

  /**
   * Test helper (not part of AuthAccess): drop the active session but keep the
   * "remember me" token — so a subsequent `me()` rejects and `remember()` can
   * restore the session, exercising the silent-reauth path (me → remember → me).
   */
  expireSession(): void {
    this.currentEmail = null;
  }
}
