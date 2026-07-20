import { Component, Inject } from '@angular/core';

import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../auth.service';
import { AUTH_ROUTES, AuthRoutes } from '../auth-routes';
import { sanitizeReturnUrl, ToastService } from '@honuware/ui/foundation';
import { ErrorService } from '@honuware/ui/access';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'hw-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIcon,
    RouterLink
],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  form: FormGroup;
  hidePassword = true;
  private returnUrl: string;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private errorService: ErrorService,
    @Inject(AUTH_ROUTES) private authRoutes: AuthRoutes
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required]],
      remember: [false],
    });
    // Phase 10.2: never trust the raw query parameter — see
    // sanitizeReturnUrl above for the threat model.
    this.returnUrl = sanitizeReturnUrl(
      this.route.snapshot.queryParamMap.get('returnUrl'),
      this.authRoutes.returnUrlAllowlist,
    );
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  onSignIn(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const email = this.form.get('email')?.value ?? '';
    const password = this.form.get('password')?.value ?? '';
    const remember = !!this.form.get('remember')?.value;

    this.authService.login(email, password, remember).subscribe({
      next: () => {
        if (this.authService.authData.isAuth && this.authService.authData.mustChangePassword) {
          this.router.navigateByUrl(this.authRoutes.mustChangePasswordPath);
        } else {
          this.router.navigateByUrl(this.returnUrl);
        }
      },
      error: (err: HttpErrorResponse) => {
        const problem = this.errorService.parseError(err);
        this.toastService.error(this.errorService.getUserFriendlyMessage(problem));
      },
    });
  }
}
