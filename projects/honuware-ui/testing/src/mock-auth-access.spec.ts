import { UserInfo } from '@honuware/ui/access';
import { MockAuthAccess } from './mock-auth-access';

// The mock's observables are synchronous (`of` / `throwError`), so subscribe
// callbacks below run before the surrounding `it` returns — no fakeAsync needed.

describe('MockAuthAccess', () => {
  it('register → login → getUserInfo returns the registered user', () => {
    const auth = new MockAuthAccess();
    auth.register('Alice', 'Smith', 'alice@example.com', 'pw').subscribe();
    auth.login({ email: 'alice@example.com', password: 'pw', remember: false }).subscribe();

    let user: UserInfo | undefined;
    auth.getUserInfo().subscribe((u) => (user = u));
    expect(user?.email).toBe('alice@example.com');
    expect(user?.first_name).toBe('Alice');
    expect(user?.last_name).toBe('Smith');
  });

  it('login rejects with 401 on a wrong password', () => {
    const auth = new MockAuthAccess();
    auth.register('Alice', 'Smith', 'alice@example.com', 'pw').subscribe();

    let status: number | undefined;
    auth.login({ email: 'alice@example.com', password: 'nope', remember: false })
      .subscribe({ error: (e) => (status = e.status) });
    expect(status).toBe(401);
  });

  it('me() rejects before login and resolves after', () => {
    const auth = new MockAuthAccess({
      users: [{ user: sampleUser(), password: 'pw' }],
    });

    let before: number | undefined;
    auth.me().subscribe({ error: (e) => (before = e.status) });
    expect(before).toBe(401);

    auth.login({ email: 'sample@example.com', password: 'pw', remember: false }).subscribe();
    let ok = false;
    auth.me().subscribe(() => (ok = true));
    expect(ok).toBeTrue();
  });

  it('remember() restores a session only after a login with remember=true', () => {
    const auth = new MockAuthAccess({ users: [{ user: sampleUser(), password: 'pw' }] });

    // Without remember, the device token stays empty.
    auth.login({ email: 'sample@example.com', password: 'pw', remember: false }).subscribe();
    auth.expireSession();
    let noToken: number | undefined;
    auth.remember().subscribe({ error: (e) => (noToken = e.status) });
    expect(noToken).toBe(401);

    // With remember, remember() reactivates the session after expiry.
    auth.login({ email: 'sample@example.com', password: 'pw', remember: true }).subscribe();
    auth.expireSession();
    let meAfterExpiry: number | undefined;
    auth.me().subscribe({ error: (e) => (meAfterExpiry = e.status) });
    expect(meAfterExpiry).toBe(401);

    let remembered = false;
    auth.remember().subscribe(() => (remembered = true));
    expect(remembered).toBeTrue();

    let ok = false;
    auth.me().subscribe(() => (ok = true));
    expect(ok).toBeTrue();
  });

  it('logout ends the session', () => {
    const auth = new MockAuthAccess({ users: [{ user: sampleUser(), password: 'pw' }] });
    auth.login({ email: 'sample@example.com', password: 'pw', remember: false }).subscribe();
    auth.logout().subscribe();

    let status: number | undefined;
    auth.me().subscribe({ error: (e) => (status = e.status) });
    expect(status).toBe(401);
  });

  it('setUserInfo updates the current user and re-keys a changed email', () => {
    const auth = new MockAuthAccess({ users: [{ user: sampleUser(), password: 'pw' }] });
    auth.login({ email: 'sample@example.com', password: 'pw', remember: false }).subscribe();

    auth.setUserInfo({ first_name: 'New', last_name: 'Name', email: 'new@example.com' }).subscribe();

    let user: UserInfo | undefined;
    auth.getUserInfo().subscribe((u) => (user = u));
    expect(user?.first_name).toBe('New');
    expect(user?.email).toBe('new@example.com');
  });

  it('updateUserPassword requires the correct old password', () => {
    const auth = new MockAuthAccess({ users: [{ user: sampleUser(), password: 'pw' }] });
    auth.login({ email: 'sample@example.com', password: 'pw', remember: false }).subscribe();

    let wrong: number | undefined;
    auth.updateUserPassword({ old_password: 'nope', new_password: 'new' })
      .subscribe({ error: (e) => (wrong = e.status) });
    expect(wrong).toBe(401);

    let ok = false;
    auth.updateUserPassword({ old_password: 'pw', new_password: 'new' }).subscribe(() => (ok = true));
    expect(ok).toBeTrue();

    // The new password now logs in.
    auth.logout().subscribe();
    let loggedIn = false;
    auth.login({ email: 'sample@example.com', password: 'new', remember: false }).subscribe(() => (loggedIn = true));
    expect(loggedIn).toBeTrue();
  });
});

function sampleUser(): UserInfo {
  return {
    person_id: 1,
    first_name: 'Sample',
    last_name: 'User',
    email: 'sample@example.com',
    created_at: '0',
    roles: [],
    permissions: [],
    must_change_password: false,
  };
}
