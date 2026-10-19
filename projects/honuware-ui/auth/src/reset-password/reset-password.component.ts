import { Component, Inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ToastService } from '@honuware/ui/foundation';

import { AuthService } from '../auth.service';
import { AUTH_ROUTES, AuthRoutes, DEFAULT_AUTH_ROUTES } from '../auth-routes';

/**
 * Where the reset mail's link lands (AuthRoutes.resetPasswordPath):
 * `/reset-password?email=…&secret=…`.
 *
 * Like VerifyComponent, it reads the email and secret from the query string
 * and then scrubs them from the URL bar straight away, so the secret doesn't
 * sit in browser history (or leak in a Referer) while the person types. The
 * values stay in memory for the request.
 *
 * Any failure — wrong, expired, used or missing link — shows the one message
 * "This reset link is invalid or has expired." with a way to ask for a new
 * link; the server's own detail is never echoed.
 */
@Component({
  selector: 'hw-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIcon],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  hidePassword = true;
  /** The link didn't work (or was never complete); the form is replaced. */
  linkFailed = false;
  saving = false;
  private email = '';
  private secret = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
    @Inject(AUTH_ROUTES) private authRoutes: AuthRoutes,
  ) {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required]],
        password2: ['', [Validators.required]],
      },
      { validators: ResetPasswordComponent.passwordsMatch },
    );
  }

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    this.secret = this.route.snapshot.queryParamMap.get('secret') ?? '';
    window.history.replaceState(
      {}, '', this.authRoutes.resetPasswordPath ?? DEFAULT_AUTH_ROUTES.resetPasswordPath);
    if (!this.email || !this.secret) {
      this.linkFailed = true;
    }
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  showPasswordMismatch(): boolean {
    const password2 = this.form.get('password2');
    return !!password2?.dirty && this.form.hasError('mismatch');
  }

  onSetPassword(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.authService.resetPassword(this.email, this.secret, this.form.get('password')?.value).subscribe({
      next: () => {
        this.saving = false;
        this.toastService.success('Your password has been changed. Please log in.');
        this.router.navigate([this.authRoutes.loginPath]);
      },
      error: () => {
        this.saving = false;
        this.linkFailed = true;
      },
    });
  }

  sendNewLink(): void {
    this.router.navigate([this.authRoutes.forgotPasswordPath ?? DEFAULT_AUTH_ROUTES.forgotPasswordPath]);
  }

  private static passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const password2 = group.get('password2')?.value;
    return password && password2 && password !== password2 ? { mismatch: true } : null;
  }
}
