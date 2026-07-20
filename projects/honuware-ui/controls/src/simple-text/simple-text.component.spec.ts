import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleTextComponent } from './simple-text.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { ColumnDataInfo } from '@honuware/ui/access';
import { By } from '@angular/platform-browser';

describe('SimpleTextComponent', () => {
  let component: SimpleTextComponent;
  let fixture: ComponentFixture<SimpleTextComponent>;

  const mockDataInfo: ColumnDataInfo = {
    column_name: 'test_input',
    type: 'VARCHAR',
    primary_key: false,
    unique: false,
    nullable: true,
    label: 'Test Label',
    hint: 'Enter text here',
    place_holder: 'Type something...',
    regex: '^[a-zA-Z]+$',
    html_input_type: 'text',
    required: true,
    max_length: 10,
    default_value: 'ValidInput',
    rows: 5,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SimpleTextComponent,
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SimpleTextComponent);
    component = fixture.componentInstance;
    component.dataInfo = mockDataInfo;
    fixture.detectChanges();
  });

  it('"Loading..." is shown until ngOnInit completes', () => {
    component.isLoading = true;
    fixture.detectChanges();
    const loadingElement = fixture.debugElement.query(By.css('.loading')).nativeElement;
    expect(loadingElement.textContent).toContain('Loading...');
  });

  it('"Loading..." is not shown after ngOnInit completes', () => {
    component.isLoading = true;
    fixture.detectChanges();
    component.ngOnInit();
    fixture.detectChanges();
    const loadingElement = fixture.debugElement.query(By.css('.loading'));
    expect(loadingElement).toBeNull();
  });

  it('It should show the correct label and input data when a value is supplied', () => {
    fixture.detectChanges();
    const labelElement = fixture.debugElement.query(By.css('mat-label')).nativeElement;
    const inputElement = fixture.debugElement.query(By.css('input')).nativeElement;

    expect(labelElement.textContent).toBe(mockDataInfo.label);
    expect(inputElement.value).toBe(mockDataInfo.default_value);
  });

  it('When the control sets input to a ColumnDataInfo, the value of the input control is updated but an event is not emitted', () => {
    const spy = spyOn(component.valueChanged, 'emit');

    component.dataInfo = { ...mockDataInfo, default_value: 'Updated Value' };
    component.ngOnChanges({ 'dataInfo': { currentValue: component.dataInfo, previousValue: mockDataInfo, firstChange: false, isFirstChange: () => false } });
    fixture.detectChanges();

    expect(component.textInput.value).toBe('Updated Value');
    expect(spy).not.toHaveBeenCalled();
  });

  it('When the value of the input control is changed, an output event is generated', () => {
    const spy = spyOn(component.valueChanged, 'emit');

    component.textInput.setValue('New Value');
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('New Value');
  });

  it('Verify that errors are not displayed for correct input', () => {
    component.textInput.setValue('ValidInput');
    component.textInput.markAsTouched();
    fixture.detectChanges();

    const errorElements = fixture.debugElement.queryAll(By.css('mat-error'));
    expect(errorElements.length).toBe(0);
  });

  it('Errors are not displayed if error conditions are met but the control is not touched', () => {
    component.textInput.setValue('InvalidInput');
    component.textInput.markAsPristine();
    fixture.detectChanges();

    const errorElements = fixture.debugElement.queryAll(By.css('mat-error'));
    expect(errorElements.length).toBe(0);
  });

  it('Errors are displayed for required error condition and correct text is shown', () => {
    component.textInput.setValue('');
    component.textInput.markAsTouched();
    fixture.detectChanges();

    const requiredError = fixture.debugElement.query(By.css('mat-error')).nativeElement;
    expect(requiredError.textContent).toContain('This field is required.');
  });

  it('Errors are displayed for maxlength error condition and correct text is shown', () => {
    component.textInput.setValue('12345678901');
    component.textInput.markAsTouched();
    fixture.detectChanges();

    const maxLengthError = fixture.debugElement.query(By.css('mat-error')).nativeElement;
    expect(maxLengthError.textContent).toContain('Max 10 characters allowed.');
  });

  it('Errors are displayed for pattern error condition and correct text is shown', () => {
    component.textInput.setValue('12345');
    component.textInput.markAsTouched();
    fixture.detectChanges();

    const patternError = fixture.debugElement.query(By.css('mat-error')).nativeElement;
    expect(patternError.textContent).toContain('Invalid format.');
  });

  it('should set the value input and update the UI', () => {
    component.value = 'External Value';
    component.dataInfo = { ...mockDataInfo, default_value: 'Default Value' };
    component.ngOnInit();
    fixture.detectChanges();

    const inputElement = fixture.debugElement.query(By.css('input')).nativeElement;
    expect(inputElement.value).toBe('External Value');
  });

  it('should emit valueChanged when the UI value is changed', () => {
    const emitSpy = spyOn(component.valueChanged, 'emit');
    component.value = 'Initial Value';
    component.dataInfo = { ...mockDataInfo, default_value: 'Default Value' };
    component.ngOnInit();
    fixture.detectChanges();

    const inputElement = fixture.debugElement.query(By.css('input')).nativeElement;
    inputElement.value = 'Changed Value';
    inputElement.dispatchEvent(new Event('input'));
    component.textInput.markAsTouched();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith('Changed Value');
  });

  it('should show only value if both value and default_value are set', () => {
    component.value = 'Priority Value';
    component.dataInfo = { ...mockDataInfo, default_value: 'Default Value' };
    component.ngOnInit();
    fixture.detectChanges();

    const inputElement = fixture.debugElement.query(By.css('input')).nativeElement;
    expect(inputElement.value).toBe('Priority Value');
  });

  it('should disable the input when readOnly is true', () => {
    component.readOnly = true;
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.textInput.disabled).toBeTrue();
  });

  it('should not disable the input when readOnly is false', () => {
    component.readOnly = false;
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.textInput.disabled).toBeFalse();
  });

  it('should render the input element as disabled when readOnly is true', () => {
    component.readOnly = true;
    component.ngOnInit();
    fixture.detectChanges();

    const inputElement = fixture.debugElement.query(By.css('input')).nativeElement;
    expect(inputElement.disabled).toBeTrue();
  });

  it('displayLabel should return label when available', () => {
    component.dataInfo = { ...mockDataInfo, label: 'My Label', column_friendly_name: 'Friendly', column_name: 'col' };
    expect(component.displayLabel).toBe('My Label');
  });

  it('displayLabel should fall back to column_friendly_name when label is not set', () => {
    component.dataInfo = { ...mockDataInfo, label: undefined, column_friendly_name: 'Friendly Name', column_name: 'col' };
    expect(component.displayLabel).toBe('Friendly Name');
  });

  it('displayLabel should fall back to column_name when label and column_friendly_name are not set', () => {
    component.dataInfo = { ...mockDataInfo, label: undefined, column_friendly_name: undefined, column_name: 'raw_col' };
    expect(component.displayLabel).toBe('raw_col');
  });

  it('displayLabel should return empty string when dataInfo is undefined', () => {
    component.dataInfo = undefined;
    expect(component.displayLabel).toBe('');
  });
});
