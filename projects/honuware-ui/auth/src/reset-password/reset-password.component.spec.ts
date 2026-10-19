import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ToastService } from '@honuware/ui/foundation';

import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../auth.service';
import { AUTH_ROUTES, AuthRoutes, DEFAULT_AUTH_ROUTES } from '../auth-routes';

// Finishing website Phase 11.6: the page the reset mail's link opens.

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let replaceStateSpy: jasmine.Spy;

  function render(
    queryParams: Record<string, string>,
    routes: AuthRoutes = DEFAULT_AUTH_ROUTES,
  ): void {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['resetPassword']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    toastServiceSpy = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: AUTH_ROUTES, useValue: routes },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: (key: string): string | null => queryParams[key] ?? null },
            },
          },
        },
      ],
    });
    // One spy per test, even when a test renders more than once.
    replaceStateSpy = jasmine.isSpy(window.history.replaceState)
      ? (window.history.replaceState as jasmine.Spy)
      : spyOn(window.history, 'replaceState');
    replaceStateSpy.calls.reset();
    fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
  }

  function page(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(element: Element | null): string {
    return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  function type(selector: string, value: string): void {
    const input = page().querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function submit(password: string, confirm: string): void {
    type('#password', password);
    type('#password2', confirm);
    fixture.detectChanges();
    page().querySelector<HTMLButtonElement>('#SetPassword')!.click();
    fixture.detectChanges();
  }

  const link = { email: 'alice@example.com', secret: 'AbC-123_xyz' };
  const kLinkFailed = 'This reset link is invalid or has expired.';

  it('offers New Password, Confirm New Password and Set Password', () => {
    render(link);
    expect(page().querySelector('#password')).not.toBeNull();
    expect(page().querySelector('#password2')).not.toBeNull();
    const labels = Array.from(page().querySelectorAll('mat-label')).map((label) => text(label));
    expect(labels).toEqual(['New Password', 'Confirm New Password']);
    expect(text(page().querySelector('#SetPassword'))).toBe('Set Password');
  });

  it('sends the email and secret from the link with the new password', () => {
    render(link);
    authServiceSpy.resetPassword.and.returnValue(of(void 0));
    submit('fresh-password', 'fresh-password');
    expect(authServiceSpy.resetPassword)
      .toHaveBeenCalledOnceWith('alice@example.com', 'AbC-123_xyz', 'fresh-password');
  });

  it('scrubs the secret from the URL as soon as the page opens', () => {
    render(link);
    expect(replaceStateSpy).toHaveBeenCalledOnceWith(jasmine.any(Object), '', '/reset-password');
  });

  it('rejects mismatched passwords without calling the server', () => {
    render(link);
    submit('fresh-password', 'fresh-passwrd');
    expect(authServiceSpy.resetPassword).not.toHaveBeenCalled();
    expect(text(page().querySelector('[data-test="mismatch"]'))).toBe('Passwords do not match.');
  });

  it('needs both fields before it calls the server', () => {
    render(link);
    submit('', '');
    submit('fresh-password', '');
    expect(authServiceSpy.resetPassword).not.toHaveBeenCalled();
  });

  it('on success says so and goes to the login page', () => {
    render(link, { ...DEFAULT_AUTH_ROUTES, loginPath: '/signin' });
    authServiceSpy.resetPassword.and.returnValue(of(void 0));
    submit('fresh-password', 'fresh-password');
    expect(toastServiceSpy.success)
      .toHaveBeenCalledOnceWith('Your password has been changed. Please log in.');
    expect(routerSpy.navigate).toHaveBeenCalledOnceWith(['/signin']);
  });

  it('on failure says the link is invalid or expired, without the server detail', () => {
    render(link);
    authServiceSpy.resetPassword.and.returnValue(throwError(() => ({
      status: 400, error: { detail: 'reset link is invalid or expired' },
    })));
    submit('fresh-password', 'fresh-password');

    expect(text(page().querySelector('[data-test="link-failed"]'))).toBe(kLinkFailed);
    expect(page().querySelector('#SetPassword')).toBeNull();
    expect(toastServiceSpy.success).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('offers a new link after a failure', () => {
    render(link, { ...DEFAULT_AUTH_ROUTES, forgotPasswordPath: '/account/forgot' });
    authServiceSpy.resetPassword.and.returnValue(throwError(() => ({ status: 400 })));
    submit('fresh-password', 'fresh-password');

    const button = page().querySelector<HTMLButtonElement>('#SendNewLink')!;
    expect(text(button)).toBe('Send a new link');
    button.click();
    expect(routerSpy.navigate).toHaveBeenCalledOnceWith(['/account/forgot']);
  });

  it('treats a link missing its email or secret as a failed one', () => {
    const partials: Record<string, string>[] = [{}, { email: 'alice@example.com' }, { secret: 'AbC' }];
    for (const partial of partials) {
      TestBed.resetTestingModule();
      render(partial);
      expect(text(page().querySelector('[data-test="link-failed"]'))).toBe(kLinkFailed);
      expect(page().querySelector('#SetPassword')).toBeNull();
    }
    expect(authServiceSpy.resetPassword).not.toHaveBeenCalled();
  });

  it('shows and hides both passwords together', () => {
    render(link);
    const inputs = () => Array.from(page().querySelectorAll<HTMLInputElement>('input'));
    expect(inputs().map((input) => input.type)).toEqual(['password', 'password']);
    page().querySelector<HTMLButtonElement>('.password-toggle')!.click();
    fixture.detectChanges();
    expect(inputs().map((input) => input.type)).toEqual(['text', 'text']);
  });

  it('gives the show-password buttons a 44×44 tap target', () => {
    render(link);
    for (const toggle of Array.from(page().querySelectorAll<HTMLElement>('.password-toggle'))) {
      const box = toggle.getBoundingClientRect();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  // Ships in @honuware/ui/auth — no hardcoded studio branding in the template.
  it('renders no hardcoded studio branding', () => {
    render(link);
    expect(page().innerHTML.toLowerCase()).not.toContain('knotty');
  });
});
