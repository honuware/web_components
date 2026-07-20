import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';

import { VerifyComponent } from './verify.component';
import { AuthService } from '../auth.service';
import { ToastService } from '@honuware/ui/foundation';

// Phase 3.3 of the security review: this spec pins the four behaviors
// of the new SPA verify component:
//   1. Successful verification routes to /login with a success toast.
//   2. Failed verification routes to /login with a generic error toast
//      (no echoing of the server detail).
//   3. Missing query parameters short-circuit to the same generic
//      failure path without calling the API at all.
//   4. The URL is scrubbed via history.replaceState BEFORE we wait for
//      the response — so an in-flight or failed request can't leave
//      the secret visible in the URL bar.

describe('VerifyComponent', () => {
  let fixture: ComponentFixture<VerifyComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let queryParams: Record<string, string>;
  let replaceStateSpy: jasmine.Spy;

  function setupComponent() {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['verify']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    toastServiceSpy = jasmine.createSpyObj<ToastService>(
      'ToastService', ['success', 'error']);

    TestBed.configureTestingModule({
      imports: [VerifyComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string): string | null =>
                  queryParams[key] ?? null,
              },
            },
          },
        },
      ],
    });

    replaceStateSpy = spyOn(window.history, 'replaceState');
    fixture = TestBed.createComponent(VerifyComponent);
  }

  // Ships in @honuware/ui/auth — no hardcoded studio branding in the template.
  it('renders no hardcoded studio branding', () => {
    queryParams = { email: 'user@example.com', secret: 'ABC123' };
    setupComponent();
    authServiceSpy.verify.and.returnValue(of(void 0));
    fixture.detectChanges();

    const html = (fixture.nativeElement as HTMLElement).innerHTML.toLowerCase();
    expect(html).not.toContain('knotty');
  });

  it('verifies and routes to /login with a success toast on success', () => {
    queryParams = { email: 'user@example.com', secret: 'ABC123' };
    setupComponent();
    authServiceSpy.verify.and.returnValue(of(void 0));

    fixture.detectChanges();

    expect(authServiceSpy.verify).toHaveBeenCalledOnceWith(
      'user@example.com', 'ABC123');
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(toastServiceSpy.error).not.toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledOnceWith(['/login']);
    expect(replaceStateSpy).toHaveBeenCalledOnceWith(
      jasmine.any(Object), '', '/verify-success');
  });

  it('routes to /login with a generic error toast on failure', () => {
    queryParams = { email: 'user@example.com', secret: 'ABC123' };
    setupComponent();
    authServiceSpy.verify.and.returnValue(
      throwError(() => ({ status: 422, type: 'validation_error' })));

    fixture.detectChanges();

    expect(authServiceSpy.verify).toHaveBeenCalledOnceWith(
      'user@example.com', 'ABC123');
    expect(toastServiceSpy.error).toHaveBeenCalled();
    expect(toastServiceSpy.success).not.toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledOnceWith(['/login']);
    // URL was scrubbed even though the request failed.
    expect(replaceStateSpy).toHaveBeenCalledOnceWith(
      jasmine.any(Object), '', '/verify-success');
  });

  it('does not call the API when email or secret is missing', () => {
    queryParams = {};
    setupComponent();

    fixture.detectChanges();

    expect(authServiceSpy.verify).not.toHaveBeenCalled();
    expect(toastServiceSpy.error).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledOnceWith(['/login']);
    // Even with missing params, the URL is scrubbed in case it had any
    // partial query string.
    expect(replaceStateSpy).toHaveBeenCalledOnceWith(
      jasmine.any(Object), '', '/verify-success');
  });

  it('does not call the API when secret is missing', () => {
    queryParams = { email: 'user@example.com' };
    setupComponent();

    fixture.detectChanges();

    expect(authServiceSpy.verify).not.toHaveBeenCalled();
    expect(toastServiceSpy.error).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledOnceWith(['/login']);
  });

  it('scrubs the URL BEFORE the verify response arrives', fakeAsync(() => {
    queryParams = { email: 'user@example.com', secret: 'ABC123' };
    setupComponent();

    // Use a Subject we can complete on demand to control timing.
    const verifySubject = new Subject<void>();
    authServiceSpy.verify.and.returnValue(verifySubject.asObservable());

    fixture.detectChanges();

    // Verify request fired, URL already scrubbed, but response hasn't
    // arrived yet — so no toast and no navigation.
    expect(authServiceSpy.verify).toHaveBeenCalled();
    expect(replaceStateSpy).toHaveBeenCalledOnceWith(
      jasmine.any(Object), '', '/verify-success');
    expect(toastServiceSpy.success).not.toHaveBeenCalled();
    expect(toastServiceSpy.error).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();

    // Now complete the request — the success path runs.
    verifySubject.next();
    verifySubject.complete();
    tick();

    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledOnceWith(['/login']);
  }));
});
