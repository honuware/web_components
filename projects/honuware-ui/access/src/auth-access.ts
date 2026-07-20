import { Observable } from 'rxjs';

// The framework auth/account surface of the server (honuware_platform's
// session + account endpoints). AuthService and the auth pages inject
// HONUWARE_AUTH_ACCESS (see access-tokens.ts) instead of the full
// ServerAccess. Signatures are verbatim from ServerAccess, which extends this
// interface — the compiler enforces that the app implementation stays a
// superset.

export interface UserInfo {
  person_id: number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  roles: string[];
  permissions: string[];
  must_change_password?: boolean;
}

export interface SetUserInfo {
  first_name: string;
  last_name: string;
  email: string;
}

export interface LoginInfo {
  email: string;
  password: string;
  remember: boolean;
}

export interface UpdateUserPasswordInfo {
  old_password: string;
  new_password: string;
}

export interface AuthAccess {
  register(firstName: string, lastName: string, email: string, password: string): Observable<void>;
  // POST /api/verify with `{ email, secret }`. Phase 3.3 of the security
  // review: the verification email points at the SPA, which calls this.
  verify(email: string, secret: string): Observable<void>;
  login(loginInfo: LoginInfo): Observable<void>;
  logout(): Observable<void>;
  me(): Observable<void>;
  remember(): Observable<void>;
  getUserInfo(): Observable<UserInfo>;
  setUserInfo(userInfo: SetUserInfo): Observable<void>;
  updateUserPassword(passwordInfo: UpdateUserPasswordInfo): Observable<void>;
}
