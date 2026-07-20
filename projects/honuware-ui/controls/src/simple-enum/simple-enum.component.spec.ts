import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SimpleEnumComponent } from './simple-enum.component';
import { ColumnDataInfo } from '@honuware/ui/access';

const mockColumnDataInfo: ColumnDataInfo = {
  column_name: 'kind',
  type: 'VARCHAR',
  primary_key: false,
  unique: false,
  nullable: false,
  label: 'Kind',
  hint: 'Product kind',
  html_input_type: 'enum',
  required: true,
  enum_values: ['one_time', 'recurring'],
};

describe('SimpleEnumComponent', () => {
  let component: SimpleEnumComponent;
  let fixture: ComponentFixture<SimpleEnumComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, NoopAnimationsModule, SimpleEnumComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleEnumComponent);
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

  it('should render mat-select with enum values', () => {
    component.isLoading = false;
    fixture.detectChanges();

    const matSelect = fixture.nativeElement.querySelector('mat-select');
    expect(matSelect).toBeTruthy();
  });

  it('should set initial value from value input', () => {
    component.value = 'recurring';
    component.dataInfo = mockColumnDataInfo;
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.selectControl.value).toBe('recurring');
  });

  it('should use default_value when value is not provided', () => {
    component.value = undefined;
    component.dataInfo = { ...mockColumnDataInfo, default_value: 'one_time' };
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.selectControl.value).toBe('one_time');
  });

  it('should prefer value over default_value', () => {
    component.value = 'recurring';
    component.dataInfo = { ...mockColumnDataInfo, default_value: 'one_time' };
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.selectControl.value).toBe('recurring');
  });

  it('should emit enumValueChange when the select value changes', () => {
    const emitSpy = spyOn(component.enumValueChange, 'emit');
    component.isLoading = false;
    fixture.detectChanges();

    component.selectControl.setValue('recurring');
    expect(emitSpy).toHaveBeenCalledWith('recurring');
  });

  it('should not emit when value is set programmatically via ngOnChanges', () => {
    const emitSpy = spyOn(component.enumValueChange, 'emit');

    component.dataInfo = { ...mockColumnDataInfo };
    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    fixture.detectChanges();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should show plain text when readOnly is true', () => {
    component.readOnly = true;
    component.value = 'one_time';
    component.dataInfo = mockColumnDataInfo;
    component.ngOnInit();
    fixture.detectChanges();

    const readonlySpan = fixture.nativeElement.querySelector('.readonly-enum');
    expect(readonlySpan).toBeTruthy();
    expect(readonlySpan.textContent.trim()).toBe('one_time');
  });

  it('should hide mat-select when readOnly is true', () => {
    component.readOnly = true;
    component.dataInfo = mockColumnDataInfo;
    component.ngOnInit();
    fixture.detectChanges();

    const matSelect = fixture.nativeElement.querySelector('mat-select');
    expect(matSelect).toBeNull();
  });

  it('should disable control when readOnly is true', () => {
    component.readOnly = true;
    component.dataInfo = mockColumnDataInfo;
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.selectControl.disabled).toBeTrue();
  });

  it('should handle empty enum_values gracefully', () => {
    component.dataInfo = { ...mockColumnDataInfo, enum_values: [] };
    component.ngOnInit();
    fixture.detectChanges();

    const matSelect = fixture.nativeElement.querySelector('mat-select');
    expect(matSelect).toBeTruthy();
  });

  it('should handle undefined enum_values gracefully', () => {
    component.dataInfo = { ...mockColumnDataInfo, enum_values: undefined };
    component.ngOnInit();
    fixture.detectChanges();

    const matSelect = fixture.nativeElement.querySelector('mat-select');
    expect(matSelect).toBeTruthy();
  });

  it('should update select when value input changes', () => {
    component.value = 'one_time';
    component.ngOnChanges({
      value: {
        currentValue: 'one_time',
        previousValue: 'recurring',
        firstChange: false,
        isFirstChange: () => false
      }
    });
    fixture.detectChanges();

    expect(component.selectControl.value).toBe('one_time');
  });
});
