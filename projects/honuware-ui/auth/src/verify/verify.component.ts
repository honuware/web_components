import { Component, Inject, OnInit } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../auth.service';
import { AUTH_ROUTES, AuthRoutes } from '../auth-routes';
import { ToastService } from '@honuware/ui/foundation';

/**
 * Phase 3.3 of the security review.
 *
 * The verification email links at this SPA route — `/verify?email=…&secret=…` —
 * rather than at the API. The component:
 *
 *   1. Reads `email` and `secret` from the query string.
 *   2. Immediately calls `AuthService.verify(email, secret)` (POST /api/verify).
 *   3. Right after firing the request, scrubs the URL via
 *      `history.replaceState({}, '', '/verify-success')` so the secret
 *      stops appearing in the URL bar / browser history. We do this
 *      synchronously, NOT inside the response callback, so the URL is
 *      sanitized whether the request succeeds, fails, or is delayed.
 *   4. On success or failure, routes to `/login` with a toast. The two
 *      paths use different toasts but the toast text never echoes the
 *      server's error detail — failed verifications all collapse to one
 *      generic message to avoid distinguishing "wrong secret" from
 *      "expired" from "already verified".
 */
@Component({
  selector: 'hw-verify',
  standalone: true,
  imports: [],
  templateUrl: './verify.component.html',
  styleUrls: ['./verify.component.scss']
})
export class VerifyComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
    @Inject(AUTH_ROUTES) private authRoutes: AuthRoutes,
  ) {}

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email') ?? '';
    const secret = this.route.snapshot.queryParamMap.get('secret') ?? '';

    if (!email || !secret) {
      this.scrubUrl();
      this.toastService.error(
        'Verification link is missing required parameters.'
      );
      this.router.navigate([this.authRoutes.loginPath]);
      return;
    }

    // Fire the verification request first, THEN scrub the URL. The
    // secret is in memory either way; the goal of the scrub is to keep
    // it out of the browser's URL bar and history. Doing it before
    // we're sure about the response means even a slow / failed request
    // doesn't leave the secret visible.
    const verify$ = this.authService.verify(email, secret);
    this.scrubUrl();

    verify$.subscribe({
      next: () => {
        this.toastService.success(
          'Email verified — please log in.'
        );
        this.router.navigate([this.authRoutes.loginPath]);
      },
      error: () => {
        // Phase 3.3: don't echo the server error detail. All failure
        // modes (wrong secret, expired, already-used) collapse to a
        // single generic message.
        this.toastService.error(
          'Verification failed or expired. Please try again.'
        );
        this.router.navigate([this.authRoutes.loginPath]);
      },
    });
  }

  private scrubUrl(): void {
    // We can't replace the path via Router.navigate without triggering
    // a route change here — `history.replaceState` mutates only the URL
    // bar / history entry. The `/verify-success` path doesn't need to
    // be a real route; we navigate to /login on the next tick anyway.
    window.history.replaceState({}, '', '/verify-success');
  }
}
