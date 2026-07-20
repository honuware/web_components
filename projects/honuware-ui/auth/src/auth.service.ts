import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import {
  AuthData,
  DEFAULT_NON_AUTH_DATA,
} from './auth.types';
import { AuthAccess, LoginInfo, UserInfo, SetUserInfo, UpdateUserPasswordInfo, HONUWARE_AUTH_ACCESS } from '@honuware/ui/access';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _authDataSubject = new BehaviorSubject<AuthData>(
    DEFAULT_NON_AUTH_DATA
  );
  public get authData$(): Observable<AuthData> {
    return this._authDataSubject.asObservable();
  }
  public get authData(): AuthData {
    return this._authDataSubject.value;
  }

  constructor(
    @Inject(HONUWARE_AUTH_ACCESS) private authAccess: AuthAccess,
  ) {}

  public updateAuthData(userInfo: UserInfo): void {
    const isAdmin = (userInfo.roles || []).includes('admin');
    const updated: AuthData = {
      isAuth: true,
      personId: userInfo.person_id,
      firstName: userInfo.first_name,
      lastName: userInfo.last_name,
      email: userInfo.email,
      createdAt: userInfo.created_at,
      roles: userInfo.roles,
      permissions: userInfo.permissions,
      isAdmin: isAdmin,
      mustChangePassword: userInfo.must_change_password ?? false,
    };
    this._authDataSubject.next(updated);
  }

  public setUserInfo(firstName: string, lastName: string, email: string): Observable<void> {
    const body: SetUserInfo = {
      first_name: firstName,
      last_name: lastName,
      email: email
    };

    return this.authAccess.setUserInfo(body).pipe(
      mergeMap(() => this.authAccess.getUserInfo()),
      tap((ui: UserInfo) => this.updateAuthData(ui)),
      map(() => void 0)
    );
  }

  public doSetUserInfo(firstName: string, lastName: string, email: string): void {
    this.setUserInfo(firstName, lastName, email).subscribe();
  }

  public updateUserPassword(oldPassword: string, newPassword: string): Observable<void> {
    const body: UpdateUserPasswordInfo = {
      old_password: oldPassword,
      new_password: newPassword,
    };
    return this.authAccess.updateUserPassword(body);
  }

  public doUpdateUserPassword(oldPassword: string, newPassword: string): void {
    this.updateUserPassword(oldPassword, newPassword).subscribe();
  }

  public tryTokenLogin(): Observable<boolean> {
    // Path A: session token valid -> get user info
    return this.authAccess.me().pipe(
      mergeMap(() =>
        this.authAccess.getUserInfo().pipe(
          tap((ui) => this.updateAuthData(ui)),
          map(() => true)
        )
      ),
      catchError((err) => {
        // If 401, attempt device remember token flow
        if (err?.status === 401) {
          return this.authAccess.remember().pipe(
            mergeMap(() => this.authAccess.me()),
            mergeMap(() =>
              this.authAccess.getUserInfo().pipe(
                tap((ui) => this.updateAuthData(ui)),
                map(() => true)
              )
            ),
            catchError(() => of(false))
          );
        }
        return of(false);
      })
    );
  }

  public login(
    email: string,
    password: string,
    remember: boolean
  ): Observable<void> {
    const body: LoginInfo = { email, password, remember };
    return this.authAccess.login(body).pipe(
      mergeMap(() =>
        this.authAccess.getUserInfo().pipe(
          tap((ui) => this.updateAuthData(ui)),
          map(() => void 0)
        )
      )
    );
  }

  public logout(): Observable<void> {
    return this.authAccess.logout().pipe(
      tap(() => this._authDataSubject.next(DEFAULT_NON_AUTH_DATA))
    );
  }

  public register(
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ): Observable<void> {
    return this.authAccess.register(firstName, lastName, email, password);
  }

  // Phase 3.3 of the security review: the SPA's /verify route lands
  // here. The verification email's link points at the SPA, which calls
  // this and then immediately scrubs the URL via history.replaceState.
  public verify(email: string, secret: string): Observable<void> {
    return this.authAccess.verify(email, secret);
  }
}
