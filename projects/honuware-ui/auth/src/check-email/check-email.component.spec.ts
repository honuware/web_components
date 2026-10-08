import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

import { CheckEmailComponent } from './check-email.component';
import { AUTH_ROUTES, DEFAULT_AUTH_ROUTES } from '../auth-routes';

// The page registration leads to. Registration used to go straight to the
// login page, where logging in fails until the account is activated — users
// found that confusing. These tests pin what the page must tell them.

describe('CheckEmailComponent', () => {
  let routerSpy: jasmine.SpyObj<Router>;

  function render(historyState: unknown, loginPath = '/login') {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      imports: [CheckEmailComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: Location, useValue: { getState: () => historyState } },
        { provide: AUTH_ROUTES, useValue: { ...DEFAULT_AUTH_ROUTES, loginPath } },
      ],
    });
    const fixture = TestBed.createComponent(CheckEmailComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function text(element: HTMLElement): string {
    return (element.textContent ?? '').replace(/\s+/g, ' ');
  }

  it('says an activation link was sent, naming the address registered', () => {
    const page = render({ email: 'alice@example.com' });
    expect(text(page)).toContain('Check your email');
    expect(text(page.querySelector('[data-test="sent-to"]')!))
      .toContain('activation link to alice@example.com');
  });

  it('still makes sense without an address (a bookmark or a typed URL)', () => {
    const page = render(null);
    expect(text(page.querySelector('[data-test="sent-to"]')!))
      .toContain('the email address you registered with');
  });

  it('ignores a non-string email in history state', () => {
    // History state is anything a previous page left there; only a string is
    // an address worth printing.
    const page = render({ email: { not: 'an address' } });
    expect(text(page.querySelector('[data-test="sent-to"]')!))
      .toContain('the email address you registered with');
  });

  it('tells people to look in their spam folder', () => {
    const page = render({ email: 'alice@example.com' });
    expect(text(page.querySelector('[data-test="spam-note"]')!).toLowerCase())
      .toContain('spam');
  });

  it('explains that activation comes before logging in', () => {
    const page = render({ email: 'alice@example.com' });
    expect(text(page)).toContain('activate your account, then log in');
  });

  it('goes to the configured login page from its button', () => {
    const page = render({ email: 'alice@example.com' }, '/signin');
    const button = page.querySelector<HTMLButtonElement>('#GoToLogin')!;
    expect(text(button).trim()).toBe('Go to login');
    button.click();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/signin']);
  });

  // Ships in @honuware/ui/auth — no hardcoded studio branding in the template.
  it('renders no hardcoded studio branding', () => {
    const page = render({ email: 'alice@example.com' });
    expect(page.innerHTML.toLowerCase()).not.toContain('knotty');
  });
});
