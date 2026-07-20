import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly defaultDuration = 5000;

  constructor(private snackBar: MatSnackBar) {}

  /**
   * Show a success toast notification
   */
  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  /**
   * Show an error toast notification
   */
  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  /**
   * Show a warning toast notification
   */
  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  /**
   * Show an info toast notification
   */
  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  /**
   * Show a toast notification with the specified type
   */
  show(message: string, type: ToastType = 'info', duration?: number): void {
    const config: MatSnackBarConfig = {
      duration: duration ?? this.defaultDuration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: [`toast-${type}`],
    };

    this.snackBar.open(message, 'Dismiss', config);
  }

  /**
   * Dismiss any currently visible toast
   */
  dismiss(): void {
    this.snackBar.dismiss();
  }
}
