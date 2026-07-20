import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LongTextComponent } from './long-text.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { By } from '@angular/platform-browser';
import { ColumnDataInfo } from '@honuware/ui/access';

describe('LongTextComponent', () => {
  let component: LongTextComponent;
  let fixture: ComponentFixture<LongTextComponent>;

  const defaultDataInfo: ColumnDataInfo = {
    column_name: 'default-textarea',
    type: 'VARCHAR',
    primary_key: false,
    unique: false,
    nullable: true,
    column_friendly_name: 'Default Column',
    label: 'Default Label',
    hint: 'Default Hint',
    place_holder: 'Enter text...',
    regex: '^[a-zA-Z]+$',
    html_input_type: 'text',
    required: true,
    max_length: 50,
    default_value: '',
    rows: 5,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, LongTextComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LongTextComponent);
    component = fixture.componentInstance;
    component.dataInfo = { ...defaultDataInfo };
    fixture.detectChanges();
  });

  it('"Loading..." is shown until the ngOnInit completes', () => {
    component.isLoading = true; // Set isLoading to true manually
    fixture.detectChanges(); // Trigger change detection

    const loadingDiv = fixture.debugElement.query(By.css('#loading')).nativeElement;
    expect(loadingDiv.textContent.trim()).toBe('Loading...');
  });

  it('"Loading..." is not shown after ngOnInit completes', () => {
    component.isLoading = false; // Should already be false after ngOnInit
    fixture.detectChanges();

    const loadingDiv = fixture.debugElement.query(By.css('#loading'));
    expect(loadingDiv).toBeNull();
  });

  it('should show the correct label, value, and hint when a value is supplied', () => {
    component.dataInfo = {
      ...defaultDataInfo,
      label: 'Test Label',
      hint: 'Test Hint',
      default_value: 'Test Value',
    };

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: defaultDataInfo,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    fixture.detectChanges();

    const label = fixture.debugElement.query(By.css('mat-label')).nativeElement;
    const textarea = fixture.debugElement.query(By.css('textarea')).nativeElement;
    const hint = fixture.debugElement.query(By.css('mat-hint')).nativeElement;

    expect(label.textContent.trim()).toBe('Test Label');
    expect(textarea.value.trim()).toBe('Test Value');
    expect(hint.textContent.trim()).toBe('Test Hint');
  });

  it('When the control sets input to a ColumnDataInfo, the value of the input control is updated but an event is not emitted', () => {
    spyOn(component.valueChanged, 'emit');
    component.dataInfo = {
      ...defaultDataInfo,
      default_value: 'Updated Value',
    };

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: defaultDataInfo,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    fixture.detectChanges();

    expect(component.textInput.value.trim()).toBe('Updated Value');
    expect(component.valueChanged.emit).not.toHaveBeenCalled();
  });

  it('When the value of the input control is changed, an output event is generated', () => {
    spyOn(component.valueChanged, 'emit');
    component.dataInfo = {
      ...defaultDataInfo,
      default_value: 'Initial Value',
    };

    fixture.detectChanges();

    const textarea = fixture.debugElement.query(By.css('textarea')).nativeElement;
    textarea.value = 'New Value';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.valueChanged.emit).toHaveBeenCalledWith('New Value');
  });

  it('Verify that errors are not displayed for correct input', () => {
    component.dataInfo = {
      ...defaultDataInfo,
      default_value: 'CorrectValue',
    };

    fixture.detectChanges();

    const errorDivs = fixture.debugElement.queryAll(By.css('mat-error'));
    expect(errorDivs.length).toBe(0);
  });

  it('Errors are not displayed if error conditions are met but the control is not dirty', () => {
    component.textInput.setValue(''); // Set invalid value
    fixture.detectChanges();

    const errorDivs = fixture.debugElement.queryAll(By.css('mat-error'));
    expect(errorDivs.length).toBe(0); // No errors because control is not dirty
  });

  it('Errors are displayed for required error condition and correct text is shown', () => {
    component.textInput.markAsTouched();
    component.textInput.setValue(''); // Empty value triggers "required" error
    fixture.detectChanges();

    const errorDiv = fixture.debugElement.query(By.css('mat-error')).nativeElement;
    expect(errorDiv.textContent.trim()).toBe('This field is required.');
  });

  it('Errors are displayed for maxlength error condition and correct text is shown', () => {
    // Update dataInfo to include a specific maxlength
    component.dataInfo = {
      ...defaultDataInfo,
      max_length: 5,
    };

    // Trigger ngOnChanges manually
    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: defaultDataInfo,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    fixture.detectChanges();

    component.textInput.markAsTouched();
    component.textInput.setValue('TooLongValue'); // Value exceeds maxlength
    fixture.detectChanges();

    const errorDiv = fixture.debugElement.query(By.css('mat-error')).nativeElement;
    expect(errorDiv.textContent.trim()).toBe('Max 5 characters allowed.');
  });

  it('Errors are displayed for pattern error condition and correct text is shown', () => {
    component.dataInfo = {
      ...defaultDataInfo,
      regex: '^[a-z]+$', // Only lowercase letters allowed
    };

    fixture.detectChanges();

    component.textInput.markAsTouched();
    component.textInput.setValue('123');
    fixture.detectChanges();

    const errorDiv = fixture.debugElement.query(By.css('mat-error')).nativeElement;
    expect(errorDiv.textContent.trim()).toBe('Invalid format.');
  });

  it('should set the value input and update the UI', () => {
    component.value = 'External Value';
    component.dataInfo = { ...defaultDataInfo, default_value: 'Default Value' };
    component.ngOnInit();
    fixture.detectChanges();

    const textarea = fixture.debugElement.query(By.css('textarea')).nativeElement;
    expect(textarea.value).toBe('External Value');
  });

  it('should emit valueChanged when the value in the UI is changed', () => {
    const emitSpy = spyOn(component.valueChanged, 'emit');
    component.value = 'Initial Value';
    component.dataInfo = { ...defaultDataInfo, default_value: 'Default Value' };
    component.ngOnInit();
    fixture.detectChanges();

    const textarea = fixture.debugElement.query(By.css('textarea')).nativeElement;
    textarea.value = 'Changed Value';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith('Changed Value');
  });

  it('should show only value if both value and default_value are set', () => {
    component.value = 'Priority Value';
    component.dataInfo = { ...defaultDataInfo, default_value: 'Default Value' };
    component.ngOnInit();
    fixture.detectChanges();

    const textarea = fixture.debugElement.query(By.css('textarea')).nativeElement;
    expect(textarea.value).toBe('Priority Value');
  });

  it('should disable the textarea when readOnly is true', () => {
    component.readOnly = true;
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.textInput.disabled).toBeTrue();
  });

  it('should not disable the textarea when readOnly is false', () => {
    component.readOnly = false;
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.textInput.disabled).toBeFalse();
  });

  it('should render the textarea element as disabled when readOnly is true', () => {
    component.readOnly = true;
    component.ngOnInit();
    fixture.detectChanges();

    const textarea = fixture.debugElement.query(By.css('textarea')).nativeElement;
    expect(textarea.disabled).toBeTrue();
  });

  it('displayLabel should return label when available', () => {
    component.dataInfo = { ...defaultDataInfo, label: 'My Label', column_friendly_name: 'Friendly', column_name: 'col' };
    expect(component.displayLabel).toBe('My Label');
  });

  it('displayLabel should fall back to column_friendly_name when label is not set', () => {
    component.dataInfo = { ...defaultDataInfo, label: undefined, column_friendly_name: 'Friendly Name', column_name: 'col' };
    expect(component.displayLabel).toBe('Friendly Name');
  });

  it('displayLabel should fall back to column_name when label and column_friendly_name are not set', () => {
    component.dataInfo = { ...defaultDataInfo, label: undefined, column_friendly_name: undefined, column_name: 'raw_col' };
    expect(component.displayLabel).toBe('raw_col');
  });

  it('displayLabel should return empty string when dataInfo is undefined', () => {
    component.dataInfo = undefined;
    expect(component.displayLabel).toBe('');
  });
});
