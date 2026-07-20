import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FkPickerComponent } from './fk-picker.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CommonModule } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ColumnDataInfo, ForeignKeyInfo, CrudAccess, HONUWARE_CRUD_ACCESS } from '@honuware/ui/access';

describe('FkPickerComponent', () => {
  let component: FkPickerComponent;
  let fixture: ComponentFixture<FkPickerComponent>;
  // The narrow-seam proof: the picker is satisfied by a CrudAccess stub — no
  // ServerAccess, no ServerAccessMock, no network layer.
  let mockServerAccess: jasmine.SpyObj<CrudAccess>;

  const mockDataInfo: ColumnDataInfo = {
    column_name: 'person_id',
    type: 'INTEGER',
    primary_key: false,
    unique: false,
    nullable: false,
    label: 'Person',
    hint: 'Select a person',
    html_input_type: 'text',
  };

  const mockForeignKeyInfo: ForeignKeyInfo = {
    column_name: 'person_id',
    parent_table_name: 'people',
    parent_column_name: 'id',
  };

  const mockOptions = [
    { value: '1', display: 'Alice Smith' },
    { value: '2', display: 'Bob Jones' },
    { value: '3', display: 'Charlie Brown' },
  ];

  beforeEach(async () => {
    mockServerAccess = jasmine.createSpyObj('CrudAccess', [
      'getFkOptions',
      'resolveFkDisplay',
    ]);
    mockServerAccess.getFkOptions.and.returnValue(
      of({ total_count: mockOptions.length, options: mockOptions })
    );
    mockServerAccess.resolveFkDisplay.and.returnValue(
      of({ resolved: { '1': 'Alice Smith', '2': 'Bob Jones' } })
    );

    await TestBed.configureTestingModule({
      imports: [
        FkPickerComponent,
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatAutocompleteModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: HONUWARE_CRUD_ACCESS, useValue: mockServerAccess },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FkPickerComponent);
    component = fixture.componentInstance;
    component.dataInfo = mockDataInfo;
    component.foreignKeyInfo = mockForeignKeyInfo;
  });

  it('should show Loading until ngOnInit completes', () => {
    expect(component.isLoading).toBeTrue();
    fixture.detectChanges();
    expect(component.isLoading).toBeFalse();
  });

  it('should load initial options on init', () => {
    fixture.detectChanges();
    expect(mockServerAccess.getFkOptions).toHaveBeenCalledWith('people', '', 50);
    expect(component.filteredOptions.length).toBe(3);
  });

  it('should display the correct label', () => {
    fixture.detectChanges();
    const label = fixture.debugElement.query(By.css('mat-label'));
    expect(label.nativeElement.textContent).toBe('Person');
  });

  it('should set selected value from input value and resolve display', () => {
    component.value = '1';
    fixture.detectChanges();
    // The search control should show the matched option's display text
    const controlValue = component.searchControl.value;
    expect(controlValue).toBeTruthy();
  });

  it('should emit valueChanged when an option is selected', () => {
    fixture.detectChanges();
    const spy = spyOn(component.valueChanged, 'emit');
    component.onOptionSelected({
      option: { value: { value: '2', display: 'Bob Jones' } },
    });
    expect(spy).toHaveBeenCalledWith('2');
  });

  it('should search with debounce when user types', fakeAsync(() => {
    fixture.detectChanges();
    mockServerAccess.getFkOptions.calls.reset();

    component.searchControl.setValue('ali');
    tick(300);

    expect(mockServerAccess.getFkOptions).toHaveBeenCalledWith('people', 'ali', 50);
  }));

  it('should show resolved text in readonly mode', () => {
    component.readOnly = true;
    component.value = '1';
    fixture.detectChanges();

    expect(mockServerAccess.resolveFkDisplay).toHaveBeenCalledWith('people', ['1']);
    expect(component.resolvedDisplayText).toBe('Alice Smith');

    const disabledInput = fixture.debugElement.query(By.css('input[disabled]'));
    expect(disabledInput).toBeTruthy();
    expect(disabledInput.nativeElement.value).toBe('Alice Smith');
  });

  it('should disable search control in readonly mode', () => {
    component.readOnly = true;
    component.value = '1';
    fixture.detectChanges();

    expect(component.searchControl.disabled).toBeTrue();
  });

  it('displayLabel should fall back to column_friendly_name', () => {
    component.dataInfo = { ...mockDataInfo, label: undefined, column_friendly_name: 'Friendly' };
    expect(component.displayLabel).toBe('Friendly');
  });

  it('displayLabel should fall back to column_name', () => {
    component.dataInfo = { ...mockDataInfo, label: undefined, column_friendly_name: undefined };
    expect(component.displayLabel).toBe('person_id');
  });

  it('should resolve display text when value is not in loaded options', () => {
    mockServerAccess.getFkOptions.and.returnValue(
      of({ total_count: 0, options: [] })
    );
    mockServerAccess.resolveFkDisplay.and.returnValue(
      of({ resolved: { '99': 'Unknown Person' } })
    );
    component.value = '99';
    fixture.detectChanges();

    expect(mockServerAccess.resolveFkDisplay).toHaveBeenCalledWith('people', ['99']);
  });
});
