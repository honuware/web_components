import { Component, Inject, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { AUTH_ROUTES, AuthRoutes } from '../auth-routes';

/**
 * Where registration leads (AuthRoutes.checkEmailPath).
 *
 * Registration used to land people straight on the login page, where logging
 * in fails until the account is activated — users found that confusing. This
 * page says what happens next: an activation link is on its way, it may land
 * in spam, and logging in works once it has been clicked.
 *
 * RegisterComponent passes the address it registered as navigation state
 * (`{ email }`). History state survives a page refresh, so the address stays;
 * reached any other way (a bookmark, a typed URL) the page still makes sense
 * without it.
 */
@Component({
  selector: 'hw-check-email',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './check-email.component.html',
  styleUrls: ['./check-email.component.scss']
})
export class CheckEmailComponent implements OnInit {
  email = '';

  constructor(
    private location: Location,
    private router: Router,
    @Inject(AUTH_ROUTES) private authRoutes: AuthRoutes,
  ) {}

  ngOnInit(): void {
    const state = this.location.getState() as { email?: unknown } | null;
    this.email = typeof state?.email === 'string' ? state.email : '';
  }

  goToLogin(): void {
    this.router.navigate([this.authRoutes.loginPath]);
  }
}
