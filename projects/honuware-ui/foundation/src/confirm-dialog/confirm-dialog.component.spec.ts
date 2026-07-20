import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

// Real spec added when the component moved into @honuware/ui/foundation
// (Phase 2.2) — the app's was a commented-out no-op.
describe('ConfirmDialogComponent', () => {
  let dialogRef: jasmine.SpyObj<MatDialogRef<ConfirmDialogComponent, boolean>>;

  function create(
    data: ConfirmDialogData = { title: 'Delete?', description: 'Are you sure?', buttonText: 'Delete' }
  ): ComponentFixture<ConfirmDialogComponent> {
    dialogRef = jasmine.createSpyObj<MatDialogRef<ConfirmDialogComponent, boolean>>('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    return TestBed.createComponent(ConfirmDialogComponent);
  }

  it('renders the injected title, description, and button text', () => {
    const fixture = create();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Delete?');
    expect(text).toContain('Are you sure?');
    expect(text).toContain('Delete');
  });

  it('defaults the confirm button label to "Confirm" when none is given', () => {
    const fixture = create({ title: 'Proceed?' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Confirm');
  });

  it('clickConfirm closes the dialog with true', () => {
    const fixture = create();
    fixture.componentInstance.clickConfirm();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});
