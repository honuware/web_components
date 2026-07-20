import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthData } from './auth.types';
import { AuthAccess, UserInfo, HONUWARE_AUTH_ACCESS } from '@honuware/ui/access';

describe('AuthService', () => {
  let service: AuthService;
  let authAccess: jasmine.SpyObj<AuthAccess>;

  beforeEach(() => {
    // Narrow AuthAccess seam — no ServerAccessMock, no app network layer.
    authAccess = jasmine.createSpyObj<AuthAccess>('AuthAccess', ['logout']);
    authAccess.logout.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: HONUWARE_AUTH_ACCESS, useValue: authAccess },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // The confirm-and-navigate flow lives in the header sign-out path
  // (HeaderService) — logout() itself is pure state + server call.
  it('logout() ends the server session and clears auth state', fakeAsync(() => {
    // updateAuthData is the state setter the login/tryTokenLogin flows call;
    // drive it directly to put the service in an authenticated state.
    service.updateAuthData({
      person_id: 1,
      first_name: 'Mason',
      last_name: 'Tester',
      email: 'mason@test.com',
      created_at: '0',
      roles: [],
      permissions: [],
    } as UserInfo);
    expect(service.authData.isAuth).toBeTrue();

    service.logout().subscribe();
    tick();

    expect(authAccess.logout).toHaveBeenCalled();
    expect(service.authData.isAuth).toBeFalse();
  }));
});

// Phase 10.1 of the security review: tryTokenLogin is the bootstrap-
// time silent-auth path called from APP_INITIALIZER. It MUST:
//   - return true and populate authData$ when /api/me succeeds
//   - on /api/me 401, try /api/remember and re-issue /api/me, returning
//     true only when the full chain succeeds
//   - return false and leave authData$ at the default when any
//     branch terminates in 401
//
// We drive this via a hand-rolled stub instead of ServerAccessMock so
// each call's outcome is exact and observable in sequence — the
// existing mock conflates session/device token state with the user-
// info store and can't represent "remember succeeds but me still 401"
// without monkey-patching.
describe('AuthService.tryTokenLogin', () => {
  interface CallRecorder {
    meCalls: number;
    rememberCalls: number;
    userInfoCalls: number;
  }

  function buildSampleUserInfo(): UserInfo {
    return {
      person_id: 7,
      email: 'auth@example.com',
      first_name: 'Auth',
      last_name: 'Tester',
      created_at: '0',
      roles: [],
      permissions: [],
      must_change_password: false,
    } as UserInfo;
  }

  // Stub that lets each test program the per-call responses without
  // tying the assertions to ServerAccessMock's bookkeeping. Only the
  // three methods tryTokenLogin touches are implemented; everything
  // else throws so a future code change that calls more methods
  // shows up loudly instead of silently misbehaving.
  function buildStub(
    meQueue: Array<{ ok: boolean; status?: number }>,
    rememberQueue: Array<{ ok: boolean; status?: number }>,
    userInfoQueue: Array<{ ok: boolean; status?: number; data?: UserInfo }>,
    recorder: CallRecorder,
  ): Pick<AuthAccess, 'me' | 'remember' | 'getUserInfo'> {
    return {
      me(): Observable<void> {
        recorder.meCalls += 1;
        const next = meQueue.shift();
        if (!next) throw new Error('me() called more times than the test queue allows');
        return next.ok
          ? of(void 0)
          : throwError(() => ({ status: next.status ?? 401, message: 'Unauthorized' }));
      },
      remember(): Observable<void> {
        recorder.rememberCalls += 1;
        const next = rememberQueue.shift();
        if (!next) throw new Error('remember() called more times than the test queue allows');
        return next.ok
          ? of(void 0)
          : throwError(() => ({ status: next.status ?? 401, message: 'Unauthorized' }));
      },
      getUserInfo(): Observable<UserInfo> {
        recorder.userInfoCalls += 1;
        const next = userInfoQueue.shift();
        if (!next) throw new Error('getUserInfo() called more times than the test queue allows');
        return next.ok && next.data
          ? of(next.data)
          : throwError(() => ({ status: next.status ?? 401, message: 'Unauthorized' }));
      },
    };
  }

  function makeServiceWithStub(
    stub: Pick<AuthAccess, 'me' | 'remember' | 'getUserInfo'>,
  ): AuthService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: HONUWARE_AUTH_ACCESS, useValue: stub },
      ],
    });
    return TestBed.inject(AuthService);
  }

  // Branch 1: 200/200 — session cookie is valid, /api/me succeeds on
  // the first try, getUserInfo returns the profile. Most common path
  // for a returning user with a live session.
  it('Branch 200/200: me OK then getUserInfo OK populates authData and returns true', fakeAsync(() => {
    const recorder: CallRecorder = { meCalls: 0, rememberCalls: 0, userInfoCalls: 0 };
    const stub = buildStub(
      [{ ok: true }],
      [],
      [{ ok: true, data: buildSampleUserInfo() }],
      recorder,
    );
    const svc = makeServiceWithStub(stub);

    let result: boolean | undefined;
    svc.tryTokenLogin().subscribe((v) => (result = v));
    tick();

    expect(result).toBeTrue();
    expect(recorder.meCalls).toBe(1);
    expect(recorder.rememberCalls).toBe(0);
    expect(recorder.userInfoCalls).toBe(1);
    // AuthData is a discriminated union ({isAuth: false} | {isAuth: true, ...});
    // narrow on isAuth before reading the authenticated-only fields.
    const data: AuthData = svc.authData;
    expect(data.isAuth).toBeTrue();
    if (data.isAuth) {
      expect(data.email).toBe('auth@example.com');
    }
  }));

  // Branch 2: 401/200/200 — session expired or absent, but the
  // device-token cookie reactivates auth. /api/remember mints a new
  // session, the second /api/me succeeds, and we hydrate authData.
  // This is the path a "remember me" user takes on app boot.
  it('Branch 401/200/200: me 401 → remember OK → me OK → getUserInfo OK returns true', fakeAsync(() => {
    const recorder: CallRecorder = { meCalls: 0, rememberCalls: 0, userInfoCalls: 0 };
    const stub = buildStub(
      [{ ok: false, status: 401 }, { ok: true }],
      [{ ok: true }],
      [{ ok: true, data: buildSampleUserInfo() }],
      recorder,
    );
    const svc = makeServiceWithStub(stub);

    let result: boolean | undefined;
    svc.tryTokenLogin().subscribe((v) => (result = v));
    tick();

    expect(result).toBeTrue();
    expect(recorder.meCalls).toBe(2);
    expect(recorder.rememberCalls).toBe(1);
    expect(recorder.userInfoCalls).toBe(1);
    expect(svc.authData.isAuth).toBeTrue();
  }));

  // Branch 3: 401/401 — no session AND no valid device token. The
  // catchError wraps the failure to `of(false)`. authData stays at
  // the unauthenticated default. /api/me is NOT retried — we don't
  // burn a second request when remember already 401'd.
  it('Branch 401/401: me 401 → remember 401 returns false without retrying me', fakeAsync(() => {
    const recorder: CallRecorder = { meCalls: 0, rememberCalls: 0, userInfoCalls: 0 };
    const stub = buildStub(
      [{ ok: false, status: 401 }],
      [{ ok: false, status: 401 }],
      [],
      recorder,
    );
    const svc = makeServiceWithStub(stub);

    let result: boolean | undefined;
    svc.tryTokenLogin().subscribe((v) => (result = v));
    tick();

    expect(result).toBeFalse();
    expect(recorder.meCalls).toBe(1);
    expect(recorder.rememberCalls).toBe(1);
    expect(recorder.userInfoCalls).toBe(0);
    expect(svc.authData.isAuth).toBeFalse();
  }));

  // Branch 4: 200/_ — /api/me succeeds but the follow-up
  // getUserInfo errors (e.g., a transient 500 between auth + profile
  // services). tryTokenLogin's outer catchError returns `false` —
  // we don't fall through to the remember path because remember
  // wouldn't fix a non-auth error.
  it('Branch 200/_: me OK but getUserInfo fails returns false and leaves authData unauthenticated', fakeAsync(() => {
    const recorder: CallRecorder = { meCalls: 0, rememberCalls: 0, userInfoCalls: 0 };
    const stub = buildStub(
      [{ ok: true }],
      [],
      [{ ok: false, status: 500 }],
      recorder,
    );
    const svc = makeServiceWithStub(stub);

    let result: boolean | undefined;
    svc.tryTokenLogin().subscribe((v) => (result = v));
    tick();

    expect(result).toBeFalse();
    expect(recorder.meCalls).toBe(1);
    expect(recorder.rememberCalls).toBe(0);
    expect(recorder.userInfoCalls).toBe(1);
    expect(svc.authData.isAuth).toBeFalse();
  }));
});
