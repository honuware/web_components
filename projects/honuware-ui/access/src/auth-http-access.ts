import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthAccess, LoginInfo, UserInfo, SetUserInfo, UpdateUserPasswordInfo } from './auth-access';
import { HONUWARE_API_BASE } from './api-base';

// Default HttpClient implementation of the framework auth/account surface.
@Injectable({ providedIn: 'root' })
export class AuthHttpAccess implements AuthAccess {
  constructor(
    private http: HttpClient,
    @Inject(HONUWARE_API_BASE) private base: string,
  ) {}

  register(firstName: string, lastName: string, email: string, password: string): Observable<void> {
    return this.http.post(`${this.base}/register`, {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
    }, { withCredentials: true }).pipe(map(() => void 0));
  }

  verify(email: string, secret: string): Observable<void> {
    return this.http.post(`${this.base}/verify`, { email, secret }, { withCredentials: true }).pipe(map(() => void 0));
  }

  login(loginInfo: LoginInfo): Observable<void> {
    return this.http.post(`${this.base}/login`, loginInfo, { withCredentials: true }).pipe(map(() => void 0));
  }

  logout(): Observable<void> {
    return this.http.post(`${this.base}/logout`, null, { withCredentials: true }).pipe(map(() => void 0));
  }

  me(): Observable<void> {
    return this.http.get(`${this.base}/me`, { withCredentials: true }).pipe(map(() => void 0));
  }

  remember(): Observable<void> {
    return this.http.post(`${this.base}/remember`, null, { withCredentials: true }).pipe(map(() => void 0));
  }

  getUserInfo(): Observable<UserInfo> {
    return this.http.post<UserInfo>(`${this.base}/get_user_info`, null, { withCredentials: true });
  }

  setUserInfo(userInfo: SetUserInfo): Observable<void> {
    return this.http.post(`${this.base}/set_user_info`, userInfo, { withCredentials: true }).pipe(map(() => void 0));
  }

  updateUserPassword(passwordInfo: UpdateUserPasswordInfo): Observable<void> {
    return this.http.post(`${this.base}/update_user_password`, passwordInfo, { withCredentials: true }).pipe(map(() => void 0));
  }
}
