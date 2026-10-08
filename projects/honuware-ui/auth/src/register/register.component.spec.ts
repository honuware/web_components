import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Observable, throwError } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { AuthData } from '../auth.types';
import { AUTH_ROUTES, DEFAULT_AUTH_ROUTES } from '../auth-routes';
import { AuthAccess, LoginInfo, UserInfo, HONUWARE_AUTH_ACCESS } from '@honuware/ui/access';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authService: AuthService;
  let routerSpy: jasmine.SpyObj<Router>;

  // A tiny stateful AuthAccess fake — register stores a user keyed by email,
  // login marks it current, getUserInfo returns it. Just enough of the seam
  // for the register → login round-trip below, with no app network layer.
  function makeFakeAuthAccess(): Pick<AuthAccess, 'register' | 'login' | 'getUserInfo'> {
    const users = new Map<string, UserInfo>();
    let currentEmail = '';
    return {
      register(firstName: string, lastName: string, email: string): Observable<void> {
        users.set(email, {
          person_id: users.size + 1,
          first_name: firstName,
          last_name: lastName,
          email,
          created_at: '0',
          roles: [],
          permissions: [],
          must_change_password: false,
        } as UserInfo);
        return of(void 0);
      },
      login(info: LoginInfo): Observable<void> {
        currentEmail = info.email;
        return of(void 0);
      },
      getUserInfo(): Observable<UserInfo> {
        const user = users.get(currentEmail);
        if (!user) throw new Error(`no registered user for ${currentEmail}`);
        return of(user);
      },
    };
  }

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        AuthService,
        { provide: HONUWARE_AUTH_ACCESS, useValue: makeFakeAuthAccess() },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Ships in @honuware/ui/auth — no hardcoded studio branding in the template.
  it('renders no hardcoded studio branding', () => {
    const html = (fixture.nativeElement as HTMLElement).innerHTML.toLowerCase();
    expect(html).not.toContain('knotty');
  });

  function fillAndSubmit(target: ComponentFixture<RegisterComponent>, email: string): void {
    const page: HTMLElement = target.nativeElement;
    const values: Record<string, string> = {
      '#email': email, '#first_name': 'John', '#last_name': 'Doe',
      '#password': 'Secret123', '#password2': 'Secret123',
    };
    for (const [selector, value] of Object.entries(values)) {
      const input = page.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    target.detectChanges();
    page.querySelector<HTMLButtonElement>('#Register')!.click();
    target.detectChanges();
  }

  it('should navigate to the check-email page, carrying the address, on successful register', () => {
    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('#email');
    const firstNameInput: HTMLInputElement = fixture.nativeElement.querySelector('#first_name');
    const lastNameInput: HTMLInputElement = fixture.nativeElement.querySelector('#last_name');
    const passwordInput: HTMLInputElement = fixture.nativeElement.querySelector('#password');
    const password2Input: HTMLInputElement = fixture.nativeElement.querySelector('#password2');
    const registerButton: HTMLButtonElement = fixture.nativeElement.querySelector('#Register');

    emailInput.value = 'john@example.com';
    emailInput.dispatchEvent(new Event('input'));
    firstNameInput.value = 'John';
    firstNameInput.dispatchEvent(new Event('input'));
    lastNameInput.value = 'Doe';
    lastNameInput.dispatchEvent(new Event('input'));
    passwordInput.value = 'Secret123';
    passwordInput.dispatchEvent(new Event('input'));
    password2Input.value = 'Secret123';
    password2Input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    registerButton.click();
    fixture.detectChanges();

    expect(routerSpy.navigate).toHaveBeenCalledWith(
      ['/check-email'], { state: { email: 'john@example.com' } });
  });

  // An app whose AuthRoutes predates checkEmailPath (CommunityFinder supplies
  // its own object) keeps the old behaviour: straight to the login page.
  it('goes straight to login when no check-email page is configured', () => {
    TestBed.resetTestingModule();
    const routesWithoutCheckEmail = { ...DEFAULT_AUTH_ROUTES };
    delete routesWithoutCheckEmail.checkEmailPath;
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        AuthService,
        { provide: HONUWARE_AUTH_ACCESS, useValue: makeFakeAuthAccess() },
        { provide: Router, useValue: routerSpy },
        { provide: AUTH_ROUTES, useValue: routesWithoutCheckEmail },
      ]
    });
    const legacyFixture = TestBed.createComponent(RegisterComponent);
    legacyFixture.detectChanges();
    fillAndSubmit(legacyFixture, 'john@example.com');

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does not navigate anywhere when registration fails', () => {
    const failingAccess = makeFakeAuthAccess();
    failingAccess.register = () => throwError(() => new HttpErrorResponse({ status: 400 }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        AuthService,
        { provide: HONUWARE_AUTH_ACCESS, useValue: failingAccess },
        { provide: Router, useValue: routerSpy },
      ]
    });
    const failingFixture = TestBed.createComponent(RegisterComponent);
    failingFixture.detectChanges();
    fillAndSubmit(failingFixture, 'john@example.com');

    // "Check your email" after a failed registration would send people to
    // wait for a message that is never coming.
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('fills form, submits, navigates to check-email, then login updates authData with registered values', (done) => {
    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('#email');
    const firstNameInput: HTMLInputElement = fixture.nativeElement.querySelector('#first_name');
    const lastNameInput: HTMLInputElement = fixture.nativeElement.querySelector('#last_name');
    const passwordInput: HTMLInputElement = fixture.nativeElement.querySelector('#password');
    const password2Input: HTMLInputElement = fixture.nativeElement.querySelector('#password2');
    const registerButton: HTMLButtonElement = fixture.nativeElement.querySelector('#Register');

    const email = 'alice@example.com';
    const firstName = 'Alice';
    const lastName = 'Smith';
    const password = 'Secret123';

    emailInput.value = email;
    emailInput.dispatchEvent(new Event('input'));
    firstNameInput.value = firstName;
    firstNameInput.dispatchEvent(new Event('input'));
    lastNameInput.value = lastName;
    lastNameInput.dispatchEvent(new Event('input'));
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input'));
    password2Input.value = password;
    password2Input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    registerButton.click();
    fixture.detectChanges();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/check-email'], { state: { email } });

    // Now simulate login and check authData$
    authService.login(email, password, false).subscribe({
      next: () => {
        authService.authData$.pipe(take(1)).subscribe((data: AuthData) => {
          expect(data.isAuth).toBeTrue();
          if (data.isAuth) {
            expect(data.email).toBe(email);
            expect(data.firstName).toBe(firstName);
            expect(data.lastName).toBe(lastName);
          }
          done();
        });
      },
      error: () => fail('login should succeed after register')
    });
  });

  it('should only show mismatch error when both password fields are dirty and not matching', () => {
    const passwordInput: HTMLInputElement = fixture.nativeElement.querySelector('#password');
    const password2Input: HTMLInputElement = fixture.nativeElement.querySelector('#password2');

    // Only first is dirty
    passwordInput.value = 'abc';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.showPasswordMismatch()).toBeFalse();

    // Now both dirty but mismatch
    password2Input.value = 'xyz';
    password2Input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.showPasswordMismatch()).toBeTrue();

    // Make them match
    password2Input.value = 'abc';
    password2Input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.showPasswordMismatch()).toBeFalse();
  });

  // Both show/hide-password eyes were 24×24 — under the 44px a finger needs
  // (found by the knottyyoga app's mobile audit at 375px).
  it('gives both show-password buttons a 44×44 tap target', () => {
    const toggles = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.password-toggle'));
    expect(toggles.length).toBe(2);
    for (const toggle of toggles) {
      const box = toggle.getBoundingClientRect();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});
