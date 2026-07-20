import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CompositeControlComponent } from './composite-control.component';
import { SimpleTextComponent } from '../simple-text/simple-text.component';
import { SimpleBoolComponent } from '../simple-bool/simple-bool.component';
import { LongTextComponent } from '../long-text/long-text.component';
import { SimpleDateComponent } from '../simple-date/simple-date.component';
import { SimpleEnumComponent } from '../simple-enum/simple-enum.component';
import { FkPickerComponent } from '../fk-picker/fk-picker.component';
import { ColumnDataInfo, ForeignKeyInfo, CrudAccess, HONUWARE_CRUD_ACCESS } from '@honuware/ui/access';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';

describe('CompositeControlComponent', () => {
  let component: CompositeControlComponent;
  let fixture: ComponentFixture<CompositeControlComponent>;

  let mockServerAccess: jasmine.SpyObj<CrudAccess>;

  beforeEach(async () => {
    mockServerAccess = jasmine.createSpyObj('CrudAccess', [
      'getFkOptions',
      'resolveFkDisplay',
    ]);
    mockServerAccess.getFkOptions.and.returnValue(
      of({ total_count: 0, options: [] })
    );
    mockServerAccess.resolveFkDisplay.and.returnValue(
      of({ resolved: {} })
    );

    await TestBed.configureTestingModule({
      imports: [CompositeControlComponent, NoopAnimationsModule],
      providers: [
        { provide: HONUWARE_CRUD_ACCESS, useValue: mockServerAccess },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompositeControlComponent);
    component = fixture.componentInstance;
  });

  // Helper to build a valid ColumnDataInfo with all required fields
  function makeDataInfo(overrides: Partial<ColumnDataInfo> = {}): ColumnDataInfo {
    const base: ColumnDataInfo = {
      column_name: 'col',
      type: 'VARCHAR',
      primary_key: false,
      unique: false,
      nullable: true,
      column_friendly_name: 'Column',
      label: 'Label',
      hint: undefined,
      place_holder: undefined,
      regex: undefined,
      html_input_type: undefined,
      required: undefined,
      max_length: undefined,
      default_value: undefined,
      rows: undefined,
    };
    return { ...base, ...overrides };
  }

  it('should display only "Loading..." when isLoading is true', () => {
    component.isLoading = true;
    fixture.detectChanges();

    const loadingElement = fixture.nativeElement.querySelector('div');
    expect(loadingElement.textContent).toContain('Loading...');
    expect(fixture.debugElement.query(By.directive(SimpleTextComponent))).toBeNull();
    expect(fixture.debugElement.query(By.directive(SimpleBoolComponent))).toBeNull();
    expect(fixture.debugElement.query(By.directive(LongTextComponent))).toBeNull();
  });

  it('should display SimpleTextComponent and ensure other components are not visible when html_input_type is "text"', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'manual_text',
      html_input_type: 'text',
      default_value: 'Manual Test Text',
      label: 'Manual Label',
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const simpleTextComponent = fixture.debugElement.query(By.directive(SimpleTextComponent));
    const simpleBoolComponent = fixture.debugElement.query(By.directive(SimpleBoolComponent));
    const longTextComponent = fixture.debugElement.query(By.directive(LongTextComponent));

    expect(simpleTextComponent).toBeTruthy();
    expect(simpleTextComponent.componentInstance.dataInfo.default_value).toBe('Manual Test Text');
    expect(simpleBoolComponent).toBeNull();
    expect(longTextComponent).toBeNull();
  });

  it('should display SimpleBoolComponent and ensure other components are not visible when html_input_type is "bool"', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'manual_bool',
      html_input_type: 'bool',
      default_value: 'true',
      label: 'Checkbox Label',
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const simpleBoolComponent = fixture.debugElement.query(By.directive(SimpleBoolComponent));
    const simpleTextComponent = fixture.debugElement.query(By.directive(SimpleTextComponent));
    const longTextComponent = fixture.debugElement.query(By.directive(LongTextComponent));

    expect(simpleBoolComponent).toBeTruthy();
    expect(simpleBoolComponent.componentInstance.dataInfo.default_value).toBe('true');
    expect(simpleTextComponent).toBeNull();
    expect(longTextComponent).toBeNull();
  });

  it('should display LongTextComponent and ensure other components are not visible when html_input_type is "long-text"', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'manual_long_text',
      html_input_type: 'long-text',
      default_value: 'Long Text Test',
      label: 'Long Text Label',
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const longTextComponent = fixture.debugElement.query(By.directive(LongTextComponent));
    const simpleTextComponent = fixture.debugElement.query(By.directive(SimpleTextComponent));
    const simpleBoolComponent = fixture.debugElement.query(By.directive(SimpleBoolComponent));

    expect(longTextComponent).toBeTruthy();
    expect(longTextComponent.componentInstance.dataInfo.default_value).toBe('Long Text Test');
    expect(simpleTextComponent).toBeNull();
    expect(simpleBoolComponent).toBeNull();
  });

  it('should emit valueChanged when SimpleTextComponent value is updated', () => {
    spyOn(component.valueChanged, 'emit');
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'emit_text',
      html_input_type: 'text',
      default_value: 'Initial Long Text',
      label: 'Text Label',
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const simpleTextComponent = fixture.debugElement.query(By.directive(SimpleTextComponent));
    simpleTextComponent.componentInstance.textInput.setValue('Updated Text');

    expect(component.valueChanged.emit).toHaveBeenCalledWith('Updated Text');
  });

  it('should emit valueChanged when SimpleBoolComponent value is updated', () => {
    spyOn(component.valueChanged, 'emit');
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'emit_bool',
      html_input_type: 'bool',
      default_value: 'false',
      label: 'Checkbox Label',
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const simpleBoolComponent = fixture.debugElement.query(By.directive(SimpleBoolComponent));
    simpleBoolComponent.componentInstance.checkboxControl.setValue(true);

    expect(component.valueChanged.emit).toHaveBeenCalledWith('true');
  });

  it('should emit valueChanged when LongTextComponent value is updated', () => {
    spyOn(component.valueChanged, 'emit');
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'emit_long_text',
      html_input_type: 'long-text',
      default_value: 'Initial Long Text',
      label: 'Long Text Label',
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const longTextComponent = fixture.debugElement.query(By.directive(LongTextComponent));
    longTextComponent.componentInstance.textInput.setValue('Updated Long Text');

    expect(component.valueChanged.emit).toHaveBeenCalledWith('Updated Long Text');
  });

  // --- SimpleTextComponent tests ---
  it('should route value to SimpleTextComponent and display value, not default_value', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      html_input_type: 'text',
      default_value: 'DefaultText',
      label: 'TextLabel',
    });
    component.value = 'ValueText';

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
      value: {
        currentValue: component.value,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      }
    });

    fixture.detectChanges();

    const simpleTextComponent = fixture.debugElement.query(By.directive(SimpleTextComponent));
    expect(simpleTextComponent).toBeTruthy();
    expect(simpleTextComponent.componentInstance.value).toBe('ValueText');
    expect(simpleTextComponent.componentInstance.dataInfo.default_value).toBe('DefaultText');
    const inputElement = simpleTextComponent.nativeElement.querySelector('input');
    expect(inputElement.value).toBe('ValueText');
  });

  it('should show default_value in SimpleTextComponent when value is not provided', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      html_input_type: 'text',
      default_value: 'DefaultText',
      label: 'TextLabel',
    });
    component.value = undefined;

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      }
    });

    fixture.detectChanges();

    const simpleTextComponent = fixture.debugElement.query(By.directive(SimpleTextComponent));
    expect(simpleTextComponent).toBeTruthy();
    expect(simpleTextComponent.componentInstance.value).toBeUndefined();
    expect(simpleTextComponent.componentInstance.dataInfo.default_value).toBe('DefaultText');
    const inputElement = simpleTextComponent.nativeElement.querySelector('input');
    expect(inputElement.value).toBe('DefaultText');
  });

  // --- LongTextComponent tests ---
  it('should route value to LongTextComponent and display value, not default_value', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      html_input_type: 'long-text',
      default_value: 'DefaultLongText',
      label: 'LongTextLabel',
    });
    component.value = 'ValueLongText';

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
      value: {
        currentValue: component.value,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      }
    });

    fixture.detectChanges();

    const longTextComponent = fixture.debugElement.query(By.directive(LongTextComponent));
    expect(longTextComponent).toBeTruthy();
    expect(longTextComponent.componentInstance.value).toBe('ValueLongText');
    expect(longTextComponent.componentInstance.dataInfo.default_value).toBe('DefaultLongText');
    const textareaElement = longTextComponent.nativeElement.querySelector('textarea');
    expect(textareaElement.value).toBe('ValueLongText');
  });

  it('should show default_value in LongTextComponent when value is not provided', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      html_input_type: 'long-text',
      default_value: 'DefaultLongText',
      label: 'LongTextLabel',
    });
    component.value = undefined;

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      }
    });

    fixture.detectChanges();

    const longTextComponent = fixture.debugElement.query(By.directive(LongTextComponent));
    expect(longTextComponent).toBeTruthy();
    expect(longTextComponent.componentInstance.value).toBeUndefined();
    expect(longTextComponent.componentInstance.dataInfo.default_value).toBe('DefaultLongText');
    const textareaElement = longTextComponent.nativeElement.querySelector('textarea');
    expect(textareaElement.value).toBe('DefaultLongText');
  });

  // --- SimpleBoolComponent tests ---
  it('should route value to SimpleBoolComponent and display value, not default_value', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      html_input_type: 'bool',
      default_value: 'false',
      label: 'BoolLabel',
    });
    component.value = 'true';

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
      value: {
        currentValue: component.value,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      }
    });

    fixture.detectChanges();

    const boolComponent = fixture.debugElement.query(By.directive(SimpleBoolComponent));
    expect(boolComponent).toBeTruthy();
    expect(boolComponent.componentInstance.value).toBe('true');
    expect(boolComponent.componentInstance.dataInfo.default_value).toBe('false');
    // Checkbox value should be true
    expect(boolComponent.componentInstance.checkboxControl.value).toBeTrue();
  });

  it('should show default_value in SimpleBoolComponent when value is not provided', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      html_input_type: 'bool',
      default_value: 'true',
      label: 'BoolLabel',
    });
    component.value = undefined;

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      }
    });

    fixture.detectChanges();

    const boolComponent = fixture.debugElement.query(By.directive(SimpleBoolComponent));
    expect(boolComponent).toBeTruthy();
    expect(boolComponent.componentInstance.value).toBeUndefined();
    expect(boolComponent.componentInstance.dataInfo.default_value).toBe('true');
    // Checkbox value should be true
    expect(boolComponent.componentInstance.checkboxControl.value).toBeTrue();
  });

  // --- SimpleDateComponent tests ---
  it('should route value to SimpleDateComponent and display value, not default_value', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      html_input_type: 'date',
      default_value: '2020-01-01T00:00:00.000Z',
      label: 'DateLabel',
    });
    component.value = '2025-03-27T17:15:00.000Z';

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
      value: {
        currentValue: component.value,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      }
    });

    fixture.detectChanges();

    const dateComponent = fixture.debugElement.query(By.directive(SimpleDateComponent));
    expect(dateComponent).toBeTruthy();
    expect(dateComponent.componentInstance.value).toBe('2025-03-27T17:15:00.000Z');
    expect(dateComponent.componentInstance.dataInfo.default_value).toBe('2020-01-01T00:00:00.000Z');
    // The input value should match the routed value (compare date parts)
    const inputElement = dateComponent.nativeElement.querySelector('input');
    const inputDate = new Date(inputElement.value);
    const expectedDate = new Date('2025-03-27T17:15:00.000Z');
    expect(inputDate.getUTCFullYear()).toBe(expectedDate.getUTCFullYear());
    expect(inputDate.getUTCMonth()).toBe(expectedDate.getUTCMonth());
    expect(inputDate.getUTCDate()).toBe(expectedDate.getUTCDate());
  });

  it('should default to SimpleTextComponent when html_input_type is undefined', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'unknown_col',
      html_input_type: undefined,
      default_value: 'Fallback Text',
      label: 'Unknown Type',
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const simpleTextComponent = fixture.debugElement.query(By.directive(SimpleTextComponent));
    const simpleBoolComponent = fixture.debugElement.query(By.directive(SimpleBoolComponent));
    const longTextComponent = fixture.debugElement.query(By.directive(LongTextComponent));

    expect(simpleTextComponent).toBeTruthy();
    expect(simpleBoolComponent).toBeNull();
    expect(longTextComponent).toBeNull();
  });

  it('should auto-detect bool column without html_input_type', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'auto_bool',
      type: 'bool',
      html_input_type: undefined,
      default_value: 'true',
      label: 'Auto Bool',
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const simpleBoolComponent = fixture.debugElement.query(By.directive(SimpleBoolComponent));
    const simpleTextComponent = fixture.debugElement.query(By.directive(SimpleTextComponent));

    expect(simpleBoolComponent).toBeTruthy();
    expect(simpleTextComponent).toBeNull();
  });

  it('should route "checkbox" html_input_type to bool component', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'checkbox_col',
      html_input_type: 'checkbox',
      default_value: 'true',
      label: 'Checkbox Label',
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const simpleBoolComponent = fixture.debugElement.query(By.directive(SimpleBoolComponent));
    const simpleTextComponent = fixture.debugElement.query(By.directive(SimpleTextComponent));

    expect(simpleBoolComponent).toBeTruthy();
    expect(simpleTextComponent).toBeNull();
  });

  it('should default to SimpleTextComponent when html_input_type is an unknown value', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'weird_col',
      html_input_type: 'something_unknown',
      default_value: 'Some Value',
      label: 'Weird Type',
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(SimpleTextComponent))).toBeTruthy();
    expect(fixture.debugElement.query(By.directive(SimpleBoolComponent))).toBeNull();
    expect(fixture.debugElement.query(By.directive(LongTextComponent))).toBeNull();
  });

  it('should pass readOnly=true to SimpleTextComponent', () => {
    component.isLoading = false;
    component.readOnly = true;
    component.dataInfo = makeDataInfo({
      html_input_type: 'text',
      default_value: 'Test',
      label: 'Label',
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const simpleTextComponent = fixture.debugElement.query(By.directive(SimpleTextComponent));
    expect(simpleTextComponent).toBeTruthy();
    expect(simpleTextComponent.componentInstance.readOnly).toBeTrue();
  });

  it('should pass readOnly=true to LongTextComponent', () => {
    component.isLoading = false;
    component.readOnly = true;
    component.dataInfo = makeDataInfo({
      html_input_type: 'long-text',
      default_value: 'Test',
      label: 'Label',
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const longTextComponent = fixture.debugElement.query(By.directive(LongTextComponent));
    expect(longTextComponent).toBeTruthy();
    expect(longTextComponent.componentInstance.readOnly).toBeTrue();
  });

  it('should pass readOnly=false by default', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      html_input_type: 'text',
      default_value: 'Test',
      label: 'Label',
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const simpleTextComponent = fixture.debugElement.query(By.directive(SimpleTextComponent));
    expect(simpleTextComponent).toBeTruthy();
    expect(simpleTextComponent.componentInstance.readOnly).toBeFalse();
  });

  it('should show default_value in SimpleDateComponent when value is not provided', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      html_input_type: 'date',
      default_value: '2020-01-01T00:00:00.000Z',
      label: 'DateLabel',
    });
    component.value = undefined;

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      }
    });

    fixture.detectChanges();

    const dateComponent = fixture.debugElement.query(By.directive(SimpleDateComponent));
    expect(dateComponent).toBeTruthy();
    expect(dateComponent.componentInstance.value).toBeUndefined();
    expect(dateComponent.componentInstance.dataInfo.default_value).toBe('2020-01-01T00:00:00.000Z');
    // The input value should match the default_value (compare date parts)
    const inputElement = dateComponent.nativeElement.querySelector('input');
    const inputDate = new Date(inputElement.value);
    const expectedDate = new Date('2020-01-01T00:00:00.000Z');
    expect(inputDate.getFullYear()).toBe(expectedDate.getFullYear());
    expect(inputDate.getMonth()).toBe(expectedDate.getMonth());
    expect(inputDate.getDate()).toBe(expectedDate.getDate());
  });

  // --- SimpleEnumComponent tests ---
  it('should route "enum" html_input_type to enum component', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'kind',
      html_input_type: 'enum',
      default_value: 'one_time',
      label: 'Kind',
      enum_values: ['one_time', 'recurring'],
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const enumComponent = fixture.debugElement.query(By.directive(SimpleEnumComponent));
    const simpleTextComponent = fixture.debugElement.query(By.directive(SimpleTextComponent));
    const simpleBoolComponent = fixture.debugElement.query(By.directive(SimpleBoolComponent));

    expect(enumComponent).toBeTruthy();
    expect(simpleTextComponent).toBeNull();
    expect(simpleBoolComponent).toBeNull();
  });

  it('should emit valueChanged when SimpleEnumComponent value is updated', () => {
    spyOn(component.valueChanged, 'emit');
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'kind',
      html_input_type: 'enum',
      default_value: 'one_time',
      label: 'Kind',
      enum_values: ['one_time', 'recurring'],
    });

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const enumComponent = fixture.debugElement.query(By.directive(SimpleEnumComponent));
    enumComponent.componentInstance.selectControl.setValue('recurring');

    expect(component.valueChanged.emit).toHaveBeenCalledWith('recurring');
  });

  // --- FkPickerComponent tests ---

  it('should display FkPickerComponent when foreignKeyInfo is provided', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'person_id',
      html_input_type: 'text',
      label: 'Person',
    });
    const fkInfo: ForeignKeyInfo = {
      column_name: 'person_id',
      parent_table_name: 'people',
      parent_column_name: 'id',
    };
    component.foreignKeyInfo = fkInfo;

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
      foreignKeyInfo: {
        currentValue: fkInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const fkPicker = fixture.debugElement.query(By.directive(FkPickerComponent));
    const simpleText = fixture.debugElement.query(By.directive(SimpleTextComponent));

    expect(fkPicker).toBeTruthy();
    expect(simpleText).toBeNull();
    expect(component.activeComponent).toBe('fk');
  });

  it('should not display FkPickerComponent when foreignKeyInfo is not provided', () => {
    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'person_id',
      html_input_type: 'text',
      label: 'Person',
    });
    component.foreignKeyInfo = undefined;

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const fkPicker = fixture.debugElement.query(By.directive(FkPickerComponent));
    const simpleText = fixture.debugElement.query(By.directive(SimpleTextComponent));

    expect(fkPicker).toBeNull();
    expect(simpleText).toBeTruthy();
    expect(component.activeComponent).toBe('text');
  });

  it('should pass foreignKeyInfo and value to FkPickerComponent', () => {
    mockServerAccess.getFkOptions.and.returnValue(
      of({ total_count: 1, options: [{ value: '5', display: 'Alice' }] })
    );

    component.isLoading = false;
    component.dataInfo = makeDataInfo({
      column_name: 'person_id',
      html_input_type: 'text',
      label: 'Person',
    });
    const fkInfo: ForeignKeyInfo = {
      column_name: 'person_id',
      parent_table_name: 'people',
      parent_column_name: 'id',
    };
    component.foreignKeyInfo = fkInfo;
    component.value = '5';

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
      foreignKeyInfo: {
        currentValue: fkInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const fkPicker = fixture.debugElement.query(By.directive(FkPickerComponent));
    expect(fkPicker).toBeTruthy();
    expect(fkPicker.componentInstance.foreignKeyInfo).toEqual(fkInfo);
    expect(fkPicker.componentInstance.value).toBe('5');
  });

  it('should pass readOnly to FkPickerComponent', () => {
    component.isLoading = false;
    component.readOnly = true;
    component.dataInfo = makeDataInfo({
      column_name: 'person_id',
      html_input_type: 'text',
      label: 'Person',
    });
    const fkInfo: ForeignKeyInfo = {
      column_name: 'person_id',
      parent_table_name: 'people',
      parent_column_name: 'id',
    };
    component.foreignKeyInfo = fkInfo;
    component.value = '1';

    component.ngOnChanges({
      dataInfo: {
        currentValue: component.dataInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
      foreignKeyInfo: {
        currentValue: fkInfo,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();

    const fkPicker = fixture.debugElement.query(By.directive(FkPickerComponent));
    expect(fkPicker).toBeTruthy();
    expect(fkPicker.componentInstance.readOnly).toBeTrue();
  });
});
