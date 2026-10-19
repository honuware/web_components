import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { AuthService } from '../auth.service';
import { AUTH_ROUTES, AuthRoutes, DEFAULT_AUTH_ROUTES } from '../auth-routes';
import { AuthAccess, UserInfo, HONUWARE_AUTH_ACCESS } from '@honuware/ui/access';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let authAccess: jasmine.SpyObj<AuthAccess>;
  let authService: AuthService;
  let router: Router;

  // The admin profile these assertions pin — the same default the app's
  // ServerAccessMock handed back, reproduced through the narrow AuthAccess
  // seam so this library spec carries no app-network-layer dependency.
  const DEFAULT_USER: UserInfo = {
    person_id: 1,
    first_name: 'Mason',
    last_name: 'Bendixen',
    email: 'masonbendixen@gmail.com',
    created_at: '0',
    roles: ['admin'],
    permissions: [],
    must_change_password: false,
  } as UserInfo;

  function setup(returnUrl?: string, routes?: AuthRoutes): void {
    authAccess = jasmine.createSpyObj<AuthAccess>('AuthAccess', ['login', 'getUserInfo']);
    authAccess.login.and.returnValue(of(void 0));
    authAccess.getUserInfo.and.returnValue(of(DEFAULT_USER));

    const queryParamMap = {
      get: (key: string) => key === 'returnUrl' ? (returnUrl || null) : null,
    };

    TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule.withRoutes([]), NoopAnimationsModule],
      providers: [
        AuthService,
        { provide: HONUWARE_AUTH_ACCESS, useValue: authAccess },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap } },
        },
        ...(routes ? [{ provide: AUTH_ROUTES, useValue: routes }] : []),
      ],
    });

    fixture = TestBed.createComponent(LoginComponent);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');

    fixture.detectChanges();
  }

  function fillAndSubmitLogin(): void {
    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('#email');
    const passwordInput: HTMLInputElement = fixture.nativeElement.querySelector('#password');
    const signInButton: HTMLButtonElement = fixture.nativeElement.querySelector('#signIn');

    emailInput.value = 'masonbendixen@gmail.com';
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = 'Secret';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    signInButton.click();
    fixture.detectChanges();
  }

  it('should navigate to "/" after successful login with no returnUrl', () => {
    setup();
    fillAndSubmitLogin();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should navigate to returnUrl after successful login when returnUrl is provided', () => {
    setup('/shop/event/1');
    fillAndSubmitLogin();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/shop/event/1');
  });

  // Phase 10.2 of the security review: end-to-end behavioural checks
  // that the component goes through sanitizeReturnUrl and refuses to
  // bounce the user to an attacker-supplied destination after login.
  // Unit tests for the pure sanitizer function live below — these
  // pin the wiring inside the component constructor.
  it('returnUrlValidationRejectsAbsoluteUrls: external URL falls back to "/"', () => {
    setup('https://evil.example.com/phish');
    fillAndSubmitLogin();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('returnUrlValidationRejectsProtocolRelative: //evil.com falls back to "/"', () => {
    setup('//evil.example.com/phish');
    fillAndSubmitLogin();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('returnUrlValidationAllowsKnownPath: /my/account passes through unchanged', () => {
    setup('/my/account');
    fillAndSubmitLogin();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/my/account');
  });

  it('after login, AuthService.authData reflects default user info and admin privileges', () => {
    setup();
    fillAndSubmitLogin();

    const data = authService.authData;
    expect(data.isAuth).toBeTrue();
    if (data.isAuth) {
      expect(data.isAdmin).toBeTrue();
      expect(data.firstName).toBe('Mason');
      expect(data.lastName).toBe('Bendixen');
      expect(data.email).toBe('masonbendixen@gmail.com');
      expect(data.roles).toContain('admin');
    }

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  // The login page ships in @honuware/ui/auth — it must carry no studio
  // branding (a consumer supplies that via layout/theme), so the template
  // must not hardcode the knottyyoga name. Mirrors the server mail-branding
  // Not(HasSubstr("Knotty Yoga")) assertions.
  it('renders no hardcoded studio branding', () => {
    setup();
    const html = (fixture.nativeElement as HTMLElement).innerHTML.toLowerCase();
    expect(html).not.toContain('knotty');
  });

  // Tap targets: 44px is the smallest box a finger reliably hits (Apple HIG /
  // WCAG 2.5.5). The password eye was 24×24 and the register link 24px tall —
  // found by the knottyyoga app's mobile audit at 375px.
  it('gives the show-password button a 44×44 tap target', () => {
    setup();
    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.password-toggle')!;
    const box = toggle.getBoundingClientRect();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  it('gives the create-account link a 44px-tall tap target', () => {
    setup();
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('#create-account-link')!;
    expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });

  // Finishing website Phase 11: the way into forgot password.
  describe('Forgot password? link', () => {
    function forgotLink(): HTMLAnchorElement | null {
      return (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLAnchorElement>('#forgot-password-link');
    }

    it('sits beneath the password field and opens the forgot-password page', () => {
      setup();
      const link = forgotLink();
      expect(link).not.toBeNull();
      expect(link!.textContent!.trim()).toBe('Forgot password?');
      expect(link!.getAttribute('href')).toBe(DEFAULT_AUTH_ROUTES.forgotPasswordPath!);

      const passwordField = (fixture.nativeElement as HTMLElement)
        .querySelector('#password')!.closest('mat-form-field')!;
      expect(passwordField.compareDocumentPosition(link!) & Node.DOCUMENT_POSITION_FOLLOWING)
        .toBeTruthy();
      const checkbox = (fixture.nativeElement as HTMLElement).querySelector('#remember')!;
      expect(link!.compareDocumentPosition(checkbox) & Node.DOCUMENT_POSITION_FOLLOWING)
        .toBeTruthy();
    });

    it('follows a remapped forgotPasswordPath', () => {
      setup(undefined, { ...DEFAULT_AUTH_ROUTES, forgotPasswordPath: '/account/forgot' });
      expect(forgotLink()!.getAttribute('href')).toBe('/account/forgot');
    });

    it('is left out when the consumer routes no forgot-password page', () => {
      setup(undefined, { ...DEFAULT_AUTH_ROUTES, forgotPasswordPath: undefined });
      expect(forgotLink()).toBeNull();
    });

    it('has a 44px-tall tap target', () => {
      setup();
      expect(forgotLink()!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    });
  });
});
