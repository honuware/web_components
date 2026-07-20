import { Component, Inject } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../auth.service';
import { AUTH_ROUTES, AuthRoutes } from '../auth-routes';
import { Router } from '@angular/router';
import { ToastService } from '@honuware/ui/foundation';
import { ErrorService } from '@honuware/ui/access';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'hw-register',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIcon],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  form: FormGroup;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    private errorService: ErrorService,
    @Inject(AUTH_ROUTES) private authRoutes: AuthRoutes
  ) {
    this.form = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        first_name: ['', [Validators.required]],
        last_name: ['', [Validators.required]],
        password: ['', [Validators.required]],
        password2: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  // Custom validator that flags mismatch only when both fields are dirty and values differ
  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password');
    const password2 = group.get('password2');
    if (!password || !password2) return null;

    const bothDirty = password.dirty && password2.dirty;
    const mismatch = password.value !== password2.value;

    if (bothDirty && mismatch) {
      password2.setErrors({ mismatch: true });
      return { mismatch: true };
    } else {
      // Clear mismatch error when aligned or not both dirty
      if (password2.hasError('mismatch')) {
        const otherErrors = { ...password2.errors };
        delete otherErrors['mismatch'];
        password2.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
      }
      return null;
    }
  }

  onRegister(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const email = this.form.get('email')?.value ?? '';
    const firstName = this.form.get('first_name')?.value ?? '';
    const lastName = this.form.get('last_name')?.value ?? '';
    const password = this.form.get('password')?.value ?? '';

    this.authService.register(firstName, lastName, email, password).subscribe({
      next: () => this.router.navigate([this.authRoutes.loginPath]),
      error: (err: HttpErrorResponse) => {
        const problem = this.errorService.parseError(err);
        this.toastService.error(this.errorService.getUserFriendlyMessage(problem));
      }
    });
  }

  showPasswordMismatch(): boolean {
    const password = this.form.get('password');
    const password2 = this.form.get('password2');
    if (!password || !password2) return false;
    return !!password.dirty && !!password2.dirty && password.value !== password2.value;
  }
}
