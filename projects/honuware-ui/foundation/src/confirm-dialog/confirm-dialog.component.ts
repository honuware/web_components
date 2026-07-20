import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  description?: string;
  buttonText?: string;
}

@Component({
  selector: 'hw-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  readonly dialogRef: MatDialogRef<ConfirmDialogComponent, boolean> = inject(
    MatDialogRef<ConfirmDialogComponent, boolean>
  );
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);

  public clickConfirm() {
    this.dialogRef.close(true);
  }
}
