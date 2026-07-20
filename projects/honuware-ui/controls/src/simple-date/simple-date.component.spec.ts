import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ColumnDataInfo } from '@honuware/ui/access';
import { SimpleDateComponent } from './simple-date.component';

describe('SimpleDateComponent', () => {
  let component: SimpleDateComponent;
  let fixture: ComponentFixture<SimpleDateComponent>;

  const mockDataRequired: ColumnDataInfo = {
    column_name: 'example',
    type: 'VARCHAR',
    primary_key: false,
    unique: false,
    nullable: true,
    label: 'Pick a time',
    required: true,
    max_length: 5,
    default_value: '',
    rows: 0,
  };

  const mockDataOptional: ColumnDataInfo = {
    column_name: 'example',
    type: 'VARCHAR',
    primary_key: false,
    unique: false,
    nullable: true,
    label: 'Pick a time',
    required: false,
    max_length: 5,
    default_value: '',
    rows: 0,
  };

  beforeEach(async () => {
    // The control is self-contained now (its own Material + date-adapter
    // imports) — no SharedModule, proving it stands alone for extraction.
    await TestBed.configureTestingModule({
      imports: [SimpleDateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleDateComponent);
    component = fixture.componentInstance;
  });

  it('should render the component with a Loading... message', () => {
    // Set loading to true before change detection
    fixture.detectChanges();
    component.loading = true;
    fixture.detectChanges();

    const loadingElement = fixture.debugElement.query(By.css('.loading'));
    expect(loadingElement).withContext('Loading... is shown').toBeTruthy();
  });
  it('should not show Loading... after ngOnInit completes', () => {
    component.loading = false; // Should already be false after ngOnInit
    fixture.detectChanges();
    const loadingElement = fixture.debugElement.query(By.css('.loading'));
    expect(loadingElement).withContext('Loading... is not shown').toBeNull();
  });
  describe('type = time', () => {
    beforeEach(() => {
      component.type = 'time';
    });

    it('should not show error for a blank value if the input is not dirty', () => {
      component.dataInfo = mockDataRequired;
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('mat-error'));
      expect(errorElement)
        .withContext(
          'No interaction yet, so the error message should not be shown'
        )
        .toBeNull();
    });

    it('should show an error when the input is dirty and set to empty', fakeAsync(() => {
      component.dataInfo = mockDataRequired;
      fixture.detectChanges();

      const input = fixture.debugElement.query(
        By.css('input[matInput]')
      ).nativeElement;

      input.value = '';
      input.dispatchEvent(new Event('input'));
      component.dateControl.markAsTouched();
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('mat-error'));
      expect(errorElement)
        .withContext('Verify the error is shown')
        .toBeTruthy();
      expect(errorElement?.nativeElement.textContent)
        .withContext('Verify the required message is shown')
        .toContain('This value is required.');
    }));

    it('should clear the error when a valid value is entered after showing an error', () => {
      component.dataInfo = mockDataRequired;
      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('.loading'));
      expect(loadingElement).withContext('Loading... is not shown').toBeNull();

      const input = fixture.debugElement.query(
        By.css('input[matInput]')
      ).nativeElement;

      input.value = '10:15 PM';
      input.dispatchEvent(new Event('input'));
      component.dateControl.markAsTouched();
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('mat-error'));
      expect(errorElement)
        .withContext('Verify the error is not shown')
        .toBeNull();
    });

    it('should emit the correct valueChange event when time is set, without showing error', () => {
      const emitSpy = spyOn(component.valueChange, 'emit');

      component.dataInfo = mockDataOptional;
      fixture.detectChanges();

      const input = fixture.debugElement.query(
        By.css('input[matInput]')
      ).nativeElement;
      input.value = '10:15 PM';
      input.dispatchEvent(new Event('input'));
      component.dateControl.markAsTouched();
      fixture.detectChanges();

      // The emitted value is now a string ISO date
      expect(component.valueChange.emit)
        .withContext('Verify the valueChange event is emitted')
        .toHaveBeenCalled();
      const emittedValue = emitSpy.calls.mostRecent().args[0];
      expect(typeof emittedValue).toBe('string');
      expect(emittedValue).toBeTruthy();
      if (emittedValue) {
        expect(new Date(emittedValue).toISOString()).toBe(emittedValue);
      }
    });
  });

  describe('type = date', () => {
    beforeEach(() => {
      component.type = 'date';
    });

    it('should not show error for a blank value if the input is not dirty', () => {
      component.dataInfo = mockDataRequired;
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('mat-error'));
      expect(errorElement)
        .withContext(
          'No interaction yet, so the error message should not be shown'
        )
        .toBeNull();
    });

    it('should show an error when the input is dirty and set to empty', fakeAsync(() => {
      component.dataInfo = mockDataRequired;
      fixture.detectChanges();

      const input = fixture.debugElement.query(
        By.css('input[matInput]')
      ).nativeElement;

      input.value = '';
      input.dispatchEvent(new Event('input'));
      component.dateControl.markAsTouched();
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('mat-error'));
      expect(errorElement)
        .withContext('Verify the error is shown')
        .toBeTruthy();
      expect(errorElement?.nativeElement.textContent)
        .withContext('Verify the required message is shown')
        .toContain('This value is required.');
    }));

    it('should clear the error when a valid value is entered after showing an error', () => {
      component.dataInfo = mockDataRequired;
      fixture.detectChanges();

      const input = fixture.debugElement.query(
        By.css('input[matInput]')
      ).nativeElement;

      input.value = '03/27/2025';
      input.dispatchEvent(new Event('input'));
      component.dateControl.markAsTouched();
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('mat-error'));
      expect(errorElement)
        .withContext('Verify the error is cleared')
        .toBeNull();
    });

    it('should emit the correct valueChange event when date is set, without showing error', () => {
      const emitSpy = spyOn(component.valueChange, 'emit');

      component.dataInfo = mockDataOptional;
      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('.loading'));
      expect(loadingElement).withContext('Loading... is not shown').toBeNull();

      const input = fixture.debugElement.query(
        By.css('input[matInput]')
      ).nativeElement;
      input.value = '03/27/2025';
      input.dispatchEvent(new Event('input'));
      component.dateControl.markAsTouched();
      fixture.detectChanges();

      const emittedValue = emitSpy.calls.mostRecent().args[0];
      expect(typeof emittedValue).toBe('string');
      expect(emittedValue).toBeTruthy();
      if (emittedValue) {
        expect(new Date(emittedValue).toISOString()).toBe(emittedValue);
      }

      const errorElement = fixture.debugElement.query(By.css('mat-error'));
      expect(errorElement)
        .withContext('Verify the error message is not shown')
        .toBeNull();
    });
  });

  describe('type = datetime', () => {
    beforeEach(() => {
      component.type = 'date';
    });

    it('should not show error for a blank value if the input is not dirty', () => {
      component.dataInfo = mockDataRequired;
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('mat-error'));
      expect(errorElement)
        .withContext(
          'No interaction yet, so the error message should not be shown'
        )
        .toBeNull();
    });

    it('should show an error when the input is dirty and set to empty', fakeAsync(() => {
      component.dataInfo = mockDataRequired;
      fixture.detectChanges();

      const input = fixture.debugElement.queryAll(By.css('input[matInput]'))[0]
        .nativeElement;

      input.value = '';
      input.dispatchEvent(new Event('input'));
      component.dateControl.markAsTouched();
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('mat-error'));
      expect(errorElement)
        .withContext('Verify the error is shown')
        .toBeTruthy();
      expect(errorElement?.nativeElement.textContent)
        .withContext('Verify the required message is shown')
        .toContain('This value is required.');
    }));

    it('should clear the error when a valid value is entered after showing an error', () => {
      component.dataInfo = mockDataRequired;
      fixture.detectChanges();

      const input = fixture.debugElement.queryAll(By.css('input[matInput]'))[0]
        .nativeElement;

      input.value = '03/27/2025';
      input.dispatchEvent(new Event('input'));
      component.dateControl.markAsTouched();
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('mat-error'));
      expect(errorElement)
        .withContext('Verify the error is not shown')
        .toBeNull();
    });

    it('should emit the correct valueChange event when date is set, without showing error', () => {
      const emitSpy = spyOn(component.valueChange, 'emit');

      component.dataInfo = mockDataOptional;
      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('.loading'));
      expect(loadingElement).withContext('Loading... is not shown').toBeNull();

      const input = fixture.debugElement.queryAll(By.css('input[matInput]'))[0]
        .nativeElement;
      input.value = '03/27/2025';
      input.dispatchEvent(new Event('input'));
      component.dateControl.markAsTouched();
      fixture.detectChanges();

      const emittedValue = emitSpy.calls.mostRecent().args[0];
      expect(typeof emittedValue).toBe('string');
      expect(emittedValue).toBeTruthy();
      if (emittedValue) {
        expect(new Date(emittedValue).toISOString()).toBe(emittedValue);
      }

      const errorElement = fixture.debugElement.query(By.css('mat-error'));
      expect(errorElement)
        .withContext('Verify the error message is not shown')
        .toBeNull();
    });
  });

  it('should set the value input and update the UI', () => {
    const testDate = '2025-03-27T17:15:00.000Z';
    component.value = testDate;
    component.dataInfo = { ...mockDataOptional, default_value: '2020-01-01T00:00:00.000Z' };
    component.ngOnInit();
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input[matInput]')).nativeElement;
    const inputDate = new Date(input.value);
    const expectedDate = new Date(testDate);

    expect(inputDate.getFullYear()).toBe(expectedDate.getUTCFullYear());
    expect(inputDate.getMonth()).toBe(expectedDate.getUTCMonth());
    expect(inputDate.getDate()).toBe(expectedDate.getUTCDate());
  });

  it('should emit valueChange when the UI value is changed', () => {
    const emitSpy = spyOn(component.valueChange, 'emit');
    const testDate = new Date(2025, 2, 27, 10, 15, 0, 0).toISOString();
    component.value = testDate;
    component.dataInfo = { ...mockDataOptional, default_value: '2020-01-01T00:00:00.000Z' };
    component.ngOnInit();
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input[matInput]')).nativeElement;
    // Simulate user changing the date
    input.value = '2026-04-15T10:15:00.000Z';
    input.dispatchEvent(new Event('input'));
    component.dateControl.markAsTouched();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalled();
    const emittedValue = emitSpy.calls.mostRecent().args[0];
    expect(typeof emittedValue).toBe('string');
    expect(emittedValue).toBeTruthy();
    if (emittedValue) {
      expect(new Date(emittedValue).toISOString()).toBe(emittedValue);
    }
  });

  it('should show only value if both value and default_value are set', () => {
    const testDate = '2025-03-27T17:15:00.000Z';
    component.value = testDate;
    component.dataInfo = { ...mockDataOptional, default_value: '2020-01-01T00:00:00.000Z' };
    component.ngOnInit();
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input[matInput]')).nativeElement;
    const inputDate = new Date(input.value);
    const expectedDate = new Date(testDate);

    expect(inputDate.getFullYear()).toBe(expectedDate.getUTCFullYear());
    expect(inputDate.getMonth()).toBe(expectedDate.getUTCMonth());
    expect(inputDate.getDate()).toBe(expectedDate.getUTCDate());
  });

  // --- Microsecond input tests ---

  describe('microsecond input', () => {
    it('should parse microsecond value into date picker', () => {
      // 1708358400000000 us = Feb 19, 2024 12:00:00 UTC
      component.value = '1708358400000000';
      component.type = 'date';
      component.dataInfo = mockDataOptional;
      component.ngOnInit();
      fixture.detectChanges();

      const controlValue = component.dateControl.value as Date;
      expect(controlValue).toBeTruthy();
      expect(controlValue.getUTCFullYear()).toBe(2024);
      expect(controlValue.getUTCMonth()).toBe(1); // February
      expect(controlValue.getUTCDate()).toBe(19);
    });

    it('should emit microsecond string when input was microseconds', () => {
      const emitSpy = spyOn(component.valueChange, 'emit');

      component.value = '1708358400000000';
      component.type = 'date';
      component.dataInfo = mockDataOptional;
      component.ngOnInit();
      fixture.detectChanges();

      // Set a new date programmatically
      const newDate = new Date(2024, 2, 15); // March 15, 2024
      component.dateControl.setValue(newDate);
      fixture.detectChanges();

      expect(emitSpy).toHaveBeenCalled();
      const emittedValue = emitSpy.calls.mostRecent().args[0];
      // Should be a large number string (microseconds), not ISO
      expect(emittedValue).toMatch(/^\d{11,}$/);
    });

    it('should emit ISO string when input was ISO', () => {
      const emitSpy = spyOn(component.valueChange, 'emit');

      component.value = '2025-03-27T17:15:00.000Z';
      component.type = 'date';
      component.dataInfo = mockDataOptional;
      component.ngOnInit();
      fixture.detectChanges();

      // Set a new date programmatically
      const newDate = new Date(2025, 3, 10); // April 10, 2025
      component.dateControl.setValue(newDate);
      fixture.detectChanges();

      expect(emitSpy).toHaveBeenCalled();
      const emittedValue = emitSpy.calls.mostRecent().args[0] as string;
      // Should be an ISO string
      expect(new Date(emittedValue).toISOString()).toBe(emittedValue);
    });

    it('should update date when ngOnChanges receives a microsecond value', () => {
      component.value = '1708358400000000';
      component.type = 'date';
      component.dataInfo = mockDataOptional;
      component.ngOnInit();
      fixture.detectChanges();

      // Simulate value changing to a different microsecond timestamp
      // 1710950400000000 us = Mar 20, 2024 12:00:00 UTC
      component.value = '1710950400000000';
      component.ngOnChanges({
        value: {
          previousValue: '1708358400000000',
          currentValue: '1710950400000000',
          firstChange: false,
          isFirstChange: () => false
        }
      });
      fixture.detectChanges();

      const controlValue = component.dateControl.value as Date;
      expect(controlValue).toBeTruthy();
      expect(controlValue.getUTCFullYear()).toBe(2024);
      expect(controlValue.getUTCMonth()).toBe(2); // March
      expect(controlValue.getUTCDate()).toBe(20);
    });
  });

  // --- BIGINT column always emits microseconds ---

  describe('BIGINT column type', () => {
    const bigintData: ColumnDataInfo = {
      column_name: 'start_time_us',
      type: 'BIGINT',
      primary_key: false,
      unique: false,
      nullable: false,
      label: 'Start Time',
      required: true,
      html_input_type: 'date',
    };

    it('should emit microseconds for new item with no initial value', () => {
      const emitSpy = spyOn(component.valueChange, 'emit');

      component.value = undefined;
      component.type = 'datetime';
      component.dataInfo = bigintData;
      component.ngOnInit();
      fixture.detectChanges();

      // Simulate user picking a date
      const newDate = new Date(2026, 2, 4, 19, 0, 0); // March 4, 2026 7pm
      component.dateControl.setValue(newDate);
      fixture.detectChanges();

      expect(emitSpy).toHaveBeenCalled();
      const emittedValue = emitSpy.calls.mostRecent().args[0];
      // Should be a microsecond string, not ISO
      expect(emittedValue).toMatch(/^\d{11,}$/);
    });

    it('should emit microseconds for existing item with microsecond value', () => {
      const emitSpy = spyOn(component.valueChange, 'emit');

      component.value = '1708358400000000';
      component.type = 'datetime';
      component.dataInfo = bigintData;
      component.ngOnInit();
      fixture.detectChanges();

      const newDate = new Date(2026, 2, 4, 19, 0, 0);
      component.dateControl.setValue(newDate);
      fixture.detectChanges();

      expect(emitSpy).toHaveBeenCalled();
      const emittedValue = emitSpy.calls.mostRecent().args[0];
      expect(emittedValue).toMatch(/^\d{11,}$/);
    });
  });

  // --- ReadOnly tests ---

  describe('readOnly', () => {
    it('should disable the form control when readOnly is true', () => {
      component.readOnly = true;
      component.dataInfo = mockDataOptional;
      component.ngOnInit();
      fixture.detectChanges();

      expect(component.dateControl.disabled).toBeTrue();
    });

    it('should not disable the form control when readOnly is false', () => {
      component.readOnly = false;
      component.dataInfo = mockDataOptional;
      component.ngOnInit();
      fixture.detectChanges();

      expect(component.dateControl.disabled).toBeFalse();
    });

    it('should not emit valueChange when readOnly is true', () => {
      const emitSpy = spyOn(component.valueChange, 'emit');

      component.readOnly = true;
      component.value = '2025-03-27T17:15:00.000Z';
      component.type = 'date';
      component.dataInfo = mockDataOptional;
      component.ngOnInit();
      fixture.detectChanges();

      // Disabled controls don't emit valueChanges
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  // --- Empty value in create mode ---

  it('should show empty picker when value is undefined', () => {
    component.value = undefined;
    component.type = 'date';
    component.dataInfo = { ...mockDataOptional, default_value: '' };
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.dateControl.value).toBeNull();
  });

  // --- timeIncrementMinutes (decoupled from @pages/calendar) ---

  describe('timeIncrementMinutes', () => {
    it('defaults to 20 (matches the old calendar TIME_SEGMENT_INCREMENT_MIN, no calendar import)', () => {
      expect(component.timeIncrementMinutes).toBe(20);
    });

    it('feeds the timepicker interval from the input', () => {
      // Render the picker at a given increment and read back MatTimepicker's
      // resolved interval (a signal or plain property, in whatever unit
      // Material stores — v21 uses seconds). Representation-agnostic: we only
      // assert the input drives it monotonically, not the exact unit.
      const intervalFor = (minutes: number): number => {
        const localFixture = TestBed.createComponent(SimpleDateComponent);
        const localComponent = localFixture.componentInstance;
        localComponent.type = 'time';
        localComponent.dataInfo = mockDataOptional;
        localComponent.timeIncrementMinutes = minutes;
        localFixture.detectChanges();
        const timepicker = localFixture.debugElement.query(By.css('mat-timepicker'));
        expect(timepicker).withContext('timepicker is rendered').toBeTruthy();
        const raw = (timepicker.componentInstance as { interval: unknown }).interval;
        const resolved = typeof raw === 'function' ? (raw as () => unknown)() : raw;
        return Number(resolved);
      };

      const at15 = intervalFor(15);
      const at20 = intervalFor(20);
      expect(at15).toBeGreaterThan(0);
      // A smaller increment must produce a strictly smaller interval, proving
      // the value flows from timeIncrementMinutes into the picker.
      expect(at15).toBeLessThan(at20);
    });
  });
});
