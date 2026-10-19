import { Component, Inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '../auth.service';
import { AUTH_ROUTES, AuthRoutes } from '../auth-routes';

/**
 * "Forgot password?" (AuthRoutes.forgotPasswordPath): asks the server to mail
 * a reset link.
 *
 * After the request the page ALWAYS says the same thing — "if an account
 * exists, we've sent a link" — whether the server answered 200, refused for
 * too many requests, or failed outright. The server never reveals whether an
 * address has an account, and this page mustn't either.
 */
@Component({
  selector: 'hw-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  form: FormGroup;
  /** True once a request has gone out; the page then shows the outcome. */
  sent = false;
  sending = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    @Inject(AUTH_ROUTES) private authRoutes: AuthRoutes,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSend(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending = true;
    const email = this.form.get('email')?.value ?? '';
    const done = () => {
      this.sending = false;
      this.sent = true;
    };
    this.authService.forgotPassword(email).subscribe({ next: done, error: done });
  }

  backToLogin(): void {
    this.router.navigate([this.authRoutes.loginPath]);
  }
}
