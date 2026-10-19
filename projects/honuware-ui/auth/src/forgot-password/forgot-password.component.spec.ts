import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';

import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../auth.service';
import { AUTH_ROUTES, DEFAULT_AUTH_ROUTES } from '../auth-routes';

// Finishing website Phase 11.6. The page must never say whether an address
// has an account: whatever the server answers, the person sees the same words.

describe('ForgotPasswordComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  function render(loginPath = '/login') {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['forgotPassword']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: AUTH_ROUTES, useValue: { ...DEFAULT_AUTH_ROUTES, loginPath } },
      ],
    });
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.detectChanges();
    return fixture;
  }

  function page(fixture: { nativeElement: unknown }): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(element: Element | null): string {
    return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  function submit(fixture: ReturnType<typeof render>, email: string): void {
    const input = page(fixture).querySelector<HTMLInputElement>('#email')!;
    input.value = email;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    page(fixture).querySelector<HTMLButtonElement>('#SendResetLink')!.click();
    fixture.detectChanges();
  }

  const kSentMessage =
    "If an account exists for that email, we've sent a link to reset your password. " +
    'Check your spam folder too.';

  it('asks for an email under the title "Reset your password"', () => {
    const fixture = render();
    expect(text(page(fixture).querySelector('h1'))).toBe('Reset your password');
    expect(page(fixture).querySelector('#email')).not.toBeNull();
    expect(text(page(fixture).querySelector('#SendResetLink'))).toBe('Send reset link');
  });

  it('sends the typed address', () => {
    const fixture = render();
    authServiceSpy.forgotPassword.and.returnValue(of(void 0));
    submit(fixture, 'alice@example.com');
    expect(authServiceSpy.forgotPassword).toHaveBeenCalledOnceWith('alice@example.com');
  });

  it('says the link may have been sent once the server answers', () => {
    const fixture = render();
    authServiceSpy.forgotPassword.and.returnValue(of(void 0));
    submit(fixture, 'alice@example.com');
    expect(text(page(fixture).querySelector('[data-test="sent-message"]'))).toBe(kSentMessage);
    // The form is gone, so the same address isn't sent twice by accident.
    expect(page(fixture).querySelector('#SendResetLink')).toBeNull();
  });

  it('says exactly the same thing when the request fails', () => {
    for (const failure of [
      { status: 429, type: 'too_many_attempts' },
      { status: 500, type: 'internal_error' },
      { status: 0 },
    ]) {
      TestBed.resetTestingModule();
      const fixture = render();
      authServiceSpy.forgotPassword.and.returnValue(throwError(() => failure));
      submit(fixture, 'alice@example.com');
      expect(text(page(fixture).querySelector('[data-test="sent-message"]')))
        .withContext(`status ${failure.status}`)
        .toBe(kSentMessage);
    }
  });

  it('shows nothing until the server has answered', () => {
    const fixture = render();
    const pending = new Subject<void>();
    authServiceSpy.forgotPassword.and.returnValue(pending.asObservable());
    submit(fixture, 'alice@example.com');
    expect(page(fixture).querySelector('[data-test="sent-message"]')).toBeNull();
    expect(page(fixture).querySelector<HTMLButtonElement>('#SendResetLink')!.disabled).toBeTrue();

    pending.next();
    pending.complete();
    fixture.detectChanges();
    expect(page(fixture).querySelector('[data-test="sent-message"]')).not.toBeNull();
  });

  it('does not call the server without a valid email', () => {
    const fixture = render();
    submit(fixture, '');
    submit(fixture, 'not-an-email');
    expect(authServiceSpy.forgotPassword).not.toHaveBeenCalled();
    expect(page(fixture).querySelector('[data-test="sent-message"]')).toBeNull();
  });

  it('goes back to the configured login page', () => {
    const fixture = render('/signin');
    authServiceSpy.forgotPassword.and.returnValue(of(void 0));
    submit(fixture, 'alice@example.com');
    const back = page(fixture).querySelector<HTMLButtonElement>('#BackToLogin')!;
    expect(text(back)).toBe('Back to log in');
    back.click();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/signin']);
  });

  // Ships in @honuware/ui/auth — no hardcoded studio branding in the template.
  it('renders no hardcoded studio branding', () => {
    const fixture = render();
    expect(page(fixture).innerHTML.toLowerCase()).not.toContain('knotty');
  });
});
