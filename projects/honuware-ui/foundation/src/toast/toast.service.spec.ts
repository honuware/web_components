import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ToastService } from './toast.service';

// This spec was added when ToastService moved into @honuware/ui/foundation
// (Phase 2.2) — the service had none in the app.
describe('ToastService', () => {
  let service: ToastService;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open', 'dismiss']);
    TestBed.configureTestingModule({
      providers: [
        ToastService,
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    service = TestBed.inject(ToastService);
  });

  it('opens a snackbar with the type panel class and default duration', () => {
    service.success('Saved');
    expect(snackBar.open).toHaveBeenCalledWith('Saved', 'Dismiss', jasmine.objectContaining({
      duration: 5000,
      panelClass: ['toast-success'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    }));
  });

  it('maps each helper to its toast type', () => {
    service.error('e');
    service.warning('w');
    service.info('i');
    const classes = snackBar.open.calls.allArgs().map(a => (a[2] as { panelClass: string[] }).panelClass[0]);
    expect(classes).toEqual(['toast-error', 'toast-warning', 'toast-info']);
  });

  it('honors a custom duration', () => {
    service.show('m', 'info', 1234);
    expect(snackBar.open).toHaveBeenCalledWith('m', 'Dismiss', jasmine.objectContaining({ duration: 1234 }));
  });

  it('dismiss delegates to the snackbar', () => {
    service.dismiss();
    expect(snackBar.dismiss).toHaveBeenCalled();
  });
});
