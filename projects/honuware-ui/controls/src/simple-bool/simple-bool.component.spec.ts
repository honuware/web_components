import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { SimpleBoolComponent } from './simple-bool.component';
import { ColumnDataInfo } from '@honuware/ui/access';

const mockColumnDataInfo: ColumnDataInfo = {
  column_name: 'testData',
  type: 'BOOL',
  primary_key: false,
  unique: false,
  nullable: true,
  label: 'Test Checkbox',
  hint: 'This is a test checkbox',
  place_holder: 'Test Placeholder',
  regex: '^.*$',
  html_input_type: 'text',
  required: true,
  max_length: 100,
  default_value: 'false',
  rows: 3,
};

describe('SimpleBoolComponent', () => {
  let component: SimpleBoolComponent;
  let fixture: ComponentFixture<SimpleBoolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, SimpleBoolComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleBoolComponent);
    component = fixture.componentInstance;

    component.dataInfo = mockColumnDataInfo;
    fixture.detectChanges();
  });

  it('should show "Loading..." before the component has finished loading', () => {
    component.isLoading = true;
    fixture.detectChanges();

    const loadingDiv = fixture.nativeElement.querySelector('div.loading');
    expect(loadingDiv).toBeTruthy();
    expect(loadingDiv.textContent).toContain('Loading...');
  });

  it('should not show "Loading..." after the component finishes loading', () => {
    component.isLoading = false;
    fixture.detectChanges();

    const loadingDiv = fixture.nativeElement.querySelector('div.loading');
    expect(loadingDiv).toBeNull();
  });

  it('should correctly set the checkbox value for a true value in ColumnDataInfo', () => {
    component.dataInfo = { ...mockColumnDataInfo, default_value: 'true' };
    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    fixture.detectChanges();

    const checkbox = component.checkboxControl.value;
    expect(checkbox).toBeTrue();
  });

  it('should emit the correct event when the checkbox value is changed', () => {
    spyOn(component.checkboxValueChange, 'emit');

    component.isLoading = false;
    fixture.detectChanges();

    component.checkboxControl.setValue(true);
    expect(component.checkboxValueChange.emit).toHaveBeenCalledWith('true');

    component.checkboxControl.setValue(false);
    expect(component.checkboxValueChange.emit).toHaveBeenCalledWith('false');
  });

  it('should not emit a new event if the input value in ColumnDataInfo is changed', () => {
    spyOn(component.checkboxValueChange, 'emit');

    component.dataInfo = { ...mockColumnDataInfo, default_value: 'true' };
    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    fixture.detectChanges();

    expect(component.checkboxValueChange.emit).not.toHaveBeenCalled();
  });

  it('should set the value input and update the UI', () => {
    component.value = 'true';
    component.dataInfo = { ...mockColumnDataInfo, default_value: 'false' };
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.checkboxControl.value).toBeTrue();
  });

  it('should emit checkboxValueChange when the UI value is changed', () => {
    const emitSpy = spyOn(component.checkboxValueChange, 'emit');
    component.value = 'false';
    component.dataInfo = { ...mockColumnDataInfo, default_value: 'true' };
    component.ngOnInit();
    fixture.detectChanges();

    component.checkboxControl.setValue(true);
    expect(emitSpy).toHaveBeenCalledWith('true');

    component.checkboxControl.setValue(false);
    expect(emitSpy).toHaveBeenCalledWith('false');
  });

  it('should show only value if both value and default_value are set', () => {
    component.value = 'true';
    component.dataInfo = { ...mockColumnDataInfo, default_value: 'false' };
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.checkboxControl.value).toBeTrue();
  });

  // --- PostgreSQL 't'/'f' value parsing ---

  it('should parse "t" as true', () => {
    component.value = 't';
    component.dataInfo = mockColumnDataInfo;
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.checkboxControl.value).toBeTrue();
  });

  it('should parse "f" as false', () => {
    component.value = 'f';
    component.dataInfo = mockColumnDataInfo;
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.checkboxControl.value).toBeFalse();
  });

  // --- ReadOnly tests ---

  it('should disable the control when readOnly is true', () => {
    component.readOnly = true;
    component.dataInfo = mockColumnDataInfo;
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.checkboxControl.disabled).toBeTrue();
  });

  it('should show "Yes" text when readOnly is true and value is true', () => {
    component.readOnly = true;
    component.value = 'true';
    component.dataInfo = mockColumnDataInfo;
    component.ngOnInit();
    fixture.detectChanges();

    const readonlySpan = fixture.nativeElement.querySelector('.readonly-bool');
    expect(readonlySpan).toBeTruthy();
    expect(readonlySpan.textContent.trim()).toBe('Yes');
  });

  it('should show "No" text when readOnly is true and value is false', () => {
    component.readOnly = true;
    component.value = 'false';
    component.dataInfo = mockColumnDataInfo;
    component.ngOnInit();
    fixture.detectChanges();

    const readonlySpan = fixture.nativeElement.querySelector('.readonly-bool');
    expect(readonlySpan).toBeTruthy();
    expect(readonlySpan.textContent.trim()).toBe('No');
  });

  it('should hide checkbox when readOnly is true', () => {
    component.readOnly = true;
    component.dataInfo = mockColumnDataInfo;
    component.ngOnInit();
    fixture.detectChanges();

    const checkbox = fixture.nativeElement.querySelector('mat-checkbox');
    expect(checkbox).toBeNull();
  });
});
