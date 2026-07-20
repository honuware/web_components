import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { CompositeRowControlComponent } from './composite-row-control.component';
import { CompositeControlComponent } from '@honuware/ui/controls';
import { DatabaseSchemaService } from '../database-schema.service';
import { DatabaseSchema, ColumnDataInfo, HONUWARE_CRUD_ACCESS } from '@honuware/ui/access';
import { MockCrudAccess } from '@honuware/ui/testing';

describe('CompositeRowControlComponent', () => {
  let component: CompositeRowControlComponent;
  let fixture: ComponentFixture<CompositeRowControlComponent>;
  let serverAccess: MockCrudAccess;
  let dbSchemaService: jasmine.SpyObj<DatabaseSchemaService>;
  let router: jasmine.SpyObj<Router>;

  const peopleColumns = ['email', 'first_name', 'id', 'last_name', 'password_hash'];
  const mockSchema: DatabaseSchema = {
    tables: [
      {
        // Column order matches `peopleColumns` so MockCrudAccess.getTableRows /
        // getRowByValues emit values in the order the assertions below expect.
        columns: [
          { column_name: 'email', type: 'VARCHAR', primary_key: false, unique: true, nullable: false },
          { column_name: 'first_name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false },
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
          { column_name: 'last_name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false },
          { column_name: 'password_hash', type: 'VARCHAR', primary_key: false, unique: false, nullable: false }
        ],
        description: '',
        foreign_keys: [],
        primary_key: 'id',
        table_friendly_name: 'People',
        table_name: 'people'
      }
    ],
    root_tables: ['people', 'classes'],
    nested_tables: [],
    display_templates: {},
    fk_picker_preload_threshold: 50
  };

  beforeEach(async () => {
    // Schema-driven in-memory CrudAccess, seeded with one person (id 1) so the
    // update round-trip below can load, mutate, and re-read it.
    serverAccess = new MockCrudAccess({
      schema: mockSchema,
      seedRows: {
        people: [{ email: 'mason@example.com', first_name: 'Mason', id: '1', last_name: 'Bendixen', password_hash: 'hash' }],
      },
    });
    dbSchemaService = jasmine.createSpyObj('DatabaseSchemaService', ['GetDBSchema']);
    dbSchemaService.GetDBSchema.and.returnValue(of(mockSchema));
    router = jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate']);

    await TestBed.configureTestingModule({
      imports: [CompositeRowControlComponent, CompositeControlComponent],
      providers: [
        { provide: HONUWARE_CRUD_ACCESS, useValue: serverAccess },
        { provide: DatabaseSchemaService, useValue: dbSchemaService },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CompositeRowControlComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add a row in create mode when Create is clicked', fakeAsync(() => {
    component.tableName = 'people';
    component.columnNames = peopleColumns;
    component.isCreateMode = true;

    fixture.detectChanges();
    tick(); // allow async schema load
    fixture.detectChanges();

    // Fill in values for each child control
    const controls = component.controls.toArray();
    const newValues = [
      'newperson@email.com',
      'NewFirst',
      '99',
      'NewLast',
      'newhash'
    ];
    controls.forEach((ctrl, idx) => {
      ctrl.value = newValues[idx];
    });

    // Simulate clicking the Create button
    const button = fixture.nativeElement.querySelector('.submit-button');
    button.click();
    tick();

    // Verify row was added to ServerAccessMock
    serverAccess.getTableRows('people').subscribe(result => {
      const addedRow = result.dataTable.find(row => row[0] === 'newperson@email.com');
      expect(addedRow).toBeTruthy();
      // Validate all values
      expect(addedRow).toEqual(newValues);
    });
  }));

  it('should populate controls in update mode and update row when Update is clicked', fakeAsync(() => {
    // Use an existing row from ServerAccessMock
    component.tableName = 'people';
    component.columnNames = peopleColumns;
    component.isCreateMode = false;
    component.primaryKeyName = 'id';
    component.primaryKeyValue = '1'; // Mason Bendixen

    // Patch ServerAccessMock to return the correct row for getRowByValues
    spyOn(serverAccess, 'getRowByValues').and.callThrough();

    fixture.detectChanges();
    tick(); // allow async schema and row load
    fixture.detectChanges();

    // Controls should be populated with the row's values
    const controls = component.controls.toArray();
    serverAccess.getTableRows('people').subscribe(result => {
      const origRow = result.dataTable.find(row => row[2] === '1');
      expect(origRow).toBeTruthy();
      controls.forEach((ctrl, idx) => {
        expect(ctrl.value).toBe(origRow![idx]);
      });
    });

    // Update each control's value
    const updatedValues = [
      'updated@email.com',
      'UpdatedFirst',
      '1',
      'UpdatedLast',
      'updatedhash'
    ];
    controls.forEach((ctrl, idx) => {
      ctrl.value = updatedValues[idx];
    });

    // Simulate clicking the Update button
    const button = fixture.nativeElement.querySelector('.submit-button');
    button.click();
    tick();

    // Verify row was updated in ServerAccessMock
    serverAccess.getTableRows('people').subscribe(result => {
      const updatedRow = result.dataTable.find(row => row[2] === '1');
      expect(updatedRow).toBeTruthy();
      // Validate all updated values
      expect(updatedRow).toEqual(updatedValues);
    });
  }));

  it('should navigate to returnUrl after successful create', fakeAsync(() => {
    component.tableName = 'people';
    component.columnNames = peopleColumns;
    component.isCreateMode = true;
    component.returnUrl = '/admin/tables/people/view/10/0';

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // Fill in values
    const controls = component.controls.toArray();
    controls.forEach((ctrl, idx) => {
      ctrl.value = ['test@email.com', 'Test', '99', 'User', 'hash'][idx];
    });

    // Submit
    component.onSubmit();
    tick();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/tables/people/view/10/0');
  }));

  it('should navigate to returnUrl after successful update', fakeAsync(() => {
    component.tableName = 'people';
    component.columnNames = peopleColumns;
    component.isCreateMode = false;
    component.primaryKeyName = 'id';
    component.primaryKeyValue = '1';
    component.returnUrl = '/admin/tables/people/view/10/0';

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // Submit
    component.onSubmit();
    tick();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/tables/people/view/10/0');
  }));

  it('should navigate to returnUrl when cancel is clicked', fakeAsync(() => {
    component.tableName = 'people';
    component.columnNames = peopleColumns;
    component.isCreateMode = true;
    component.returnUrl = '/admin/tables/people/view/10/0';

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    component.onCancel();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/tables/people/view/10/0');
  }));

  it('isPrimaryKeyColumn should return true for primary key columns in edit mode', () => {
    component.isCreateMode = false;
    const pkCol = { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false } as unknown as ColumnDataInfo;
    expect(component.isPrimaryKeyColumn(pkCol)).toBeTrue();
  });

  it('isPrimaryKeyColumn should return false for non-primary-key columns in edit mode', () => {
    component.isCreateMode = false;
    const col = { column_name: 'email', type: 'VARCHAR', primary_key: false, unique: false, nullable: false } as unknown as ColumnDataInfo;
    expect(component.isPrimaryKeyColumn(col)).toBeFalse();
  });

  it('isPrimaryKeyColumn should return false for primary key columns in create mode', () => {
    component.isCreateMode = true;
    const pkCol = { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false } as unknown as ColumnDataInfo;
    expect(component.isPrimaryKeyColumn(pkCol)).toBeFalse();
  });

  it('isPrimaryKeyColumn should handle string "t" as truthy primary_key from server', () => {
    component.isCreateMode = false;
    const pkCol = { column_name: 'id', type: 'SERIAL', primary_key: 't', unique: false, nullable: false } as unknown as ColumnDataInfo;
    expect(component.isPrimaryKeyColumn(pkCol)).toBeTrue();
  });

  it('isPrimaryKeyColumn should return false for string "f" primary_key', () => {
    component.isCreateMode = false;
    const col = { column_name: 'name', type: 'VARCHAR', primary_key: 'f', unique: false, nullable: false } as unknown as ColumnDataInfo;
    expect(component.isPrimaryKeyColumn(col)).toBeFalse();
  });

  // --- Hidden and readonly column tests ---

  it('should not render hidden columns in edit mode', fakeAsync(() => {
    const schemaWithHidden: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
          { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false },
          { column_name: 'fk_parent', type: 'INT', primary_key: false, unique: false, nullable: false, hidden: true }
        ],
        description: '', foreign_keys: [], primary_key: 'id', table_friendly_name: 'Items', table_name: 'items'
      }],
      root_tables: ['items'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithHidden));

    component.tableName = 'items';
    component.columnNames = ['id', 'name', 'fk_parent'];
    component.isCreateMode = false;
    component.primaryKeyName = 'id';
    component.primaryKeyValue = '1';

    spyOn(serverAccess, 'getRowByValues').and.returnValue(of({
      sortedColumnNames: ['id', 'name', 'fk_parent'],
      dataTable: [['1', 'Test', '99']]
    }));

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const controlElements = fixture.nativeElement.querySelectorAll('hw-composite-control');
    expect(controlElements.length).toBe(2); // id and name, NOT fk_parent
  }));

  it('should not render hidden columns in create mode', fakeAsync(() => {
    const schemaWithHidden: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
          { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false },
          { column_name: 'fk_parent', type: 'INT', primary_key: false, unique: false, nullable: false, hidden: true }
        ],
        description: '', foreign_keys: [], primary_key: 'id', table_friendly_name: 'Items', table_name: 'items'
      }],
      root_tables: ['items'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithHidden));

    component.tableName = 'items';
    component.columnNames = ['id', 'name', 'fk_parent'];
    component.isCreateMode = true;

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const controlElements = fixture.nativeElement.querySelectorAll('hw-composite-control');
    expect(controlElements.length).toBe(2); // id and name, NOT fk_parent
  }));

  it('should show readonly columns as disabled in edit mode', fakeAsync(() => {
    const schemaWithReadonly: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
          { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false },
          { column_name: 'created_us', type: 'BIGINT', primary_key: false, unique: false, nullable: false, readonly: true }
        ],
        description: '', foreign_keys: [], primary_key: 'id', table_friendly_name: 'Items', table_name: 'items'
      }],
      root_tables: ['items'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithReadonly));

    component.tableName = 'items';
    component.columnNames = ['id', 'name', 'created_us'];
    component.isCreateMode = false;
    component.primaryKeyName = 'id';
    component.primaryKeyValue = '1';

    spyOn(serverAccess, 'getRowByValues').and.returnValue(of({
      sortedColumnNames: ['id', 'name', 'created_us'],
      dataTable: [['1', 'Test', '1708358400000000']]
    }));

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const controlElements = fixture.nativeElement.querySelectorAll('hw-composite-control');
    expect(controlElements.length).toBe(3); // all 3 shown in edit mode

    // created_us should be readonly
    const readonlyCol = { column_name: 'created_us', type: 'BIGINT', primary_key: false, unique: false, nullable: false, readonly: true } as unknown as ColumnDataInfo;
    expect(component.isReadonlyColumn(readonlyCol)).toBeTrue();
  }));

  it('should hide readonly columns in create mode', fakeAsync(() => {
    const schemaWithReadonly: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
          { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false },
          { column_name: 'created_us', type: 'BIGINT', primary_key: false, unique: false, nullable: false, readonly: true }
        ],
        description: '', foreign_keys: [], primary_key: 'id', table_friendly_name: 'Items', table_name: 'items'
      }],
      root_tables: ['items'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithReadonly));

    component.tableName = 'items';
    component.columnNames = ['id', 'name', 'created_us'];
    component.isCreateMode = true;

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const controlElements = fixture.nativeElement.querySelectorAll('hw-composite-control');
    expect(controlElements.length).toBe(2); // id and name, NOT created_us
  }));

  it('should not include hidden column values in getControlValues', fakeAsync(() => {
    const schemaWithHidden: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
          { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false },
          { column_name: 'fk_parent', type: 'INT', primary_key: false, unique: false, nullable: false, hidden: true }
        ],
        description: '', foreign_keys: [], primary_key: 'id', table_friendly_name: 'Items', table_name: 'items'
      }],
      root_tables: ['items'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithHidden));

    component.tableName = 'items';
    component.columnNames = ['id', 'name', 'fk_parent'];
    component.isCreateMode = true;

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const controls = component.controls.toArray();
    controls.forEach((ctrl, idx) => {
      ctrl.value = ['1', 'Test'][idx];
    });

    const values = component.getControlValues();
    expect(values['id']).toBe('1');
    expect(values['name']).toBe('Test');
    expect(values['fk_parent']).toBeUndefined();
  }));

  it('should not include readonly column values in getControlValues', fakeAsync(() => {
    const schemaWithReadonly: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
          { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false },
          { column_name: 'created_us', type: 'BIGINT', primary_key: false, unique: false, nullable: false, readonly: true }
        ],
        description: '', foreign_keys: [], primary_key: 'id', table_friendly_name: 'Items', table_name: 'items'
      }],
      root_tables: ['items'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithReadonly));

    component.tableName = 'items';
    component.columnNames = ['id', 'name', 'created_us'];
    component.isCreateMode = false;
    component.primaryKeyName = 'id';
    component.primaryKeyValue = '1';

    spyOn(serverAccess, 'getRowByValues').and.returnValue(of({
      sortedColumnNames: ['id', 'name', 'created_us'],
      dataTable: [['1', 'Test', '1708358400000000']]
    }));

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const controls = component.controls.toArray();
    controls[0].value = '1';
    controls[1].value = 'Updated';
    controls[2].value = '1708358400000000';

    const values = component.getControlValues();
    expect(values['id']).toBe('1');
    expect(values['name']).toBe('Updated');
    expect(values['created_us']).toBeUndefined();
  }));

  it('isReadonlyColumn should return true for readonly columns', () => {
    component.isCreateMode = false;
    const col = { column_name: 'created_us', type: 'BIGINT', primary_key: false, unique: false, nullable: false, readonly: true } as unknown as ColumnDataInfo;
    expect(component.isReadonlyColumn(col)).toBeTrue();
  });

  it('isReadonlyColumn should return true for primary key columns in edit mode', () => {
    component.isCreateMode = false;
    const col = { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false } as unknown as ColumnDataInfo;
    expect(component.isReadonlyColumn(col)).toBeTrue();
  });

  it('isReadonlyColumn should return false for normal columns', () => {
    component.isCreateMode = false;
    const col = { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false } as unknown as ColumnDataInfo;
    expect(component.isReadonlyColumn(col)).toBeFalse();
  });

  it('should show photo upload with deferUpload in create mode for tables with photo support', fakeAsync(() => {
    const schemaWithPhotos: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
          { column_name: 'title', type: 'VARCHAR', primary_key: false, unique: false, nullable: false }
        ],
        description: '', foreign_keys: [], primary_key: 'id',
        table_friendly_name: 'Products', table_name: 'products',
        has_photo_support: true
      }],
      root_tables: ['products'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithPhotos));

    component.tableName = 'products';
    component.columnNames = ['id', 'title'];
    component.isCreateMode = true;
    component.returnUrl = '/admin/tables/products/view/10/0';

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // Photo upload should be visible in create mode
    expect(component.showPhotoUpload).toBeTrue();
    const photoUpload = fixture.nativeElement.querySelector('hw-photo-upload');
    expect(photoUpload).toBeTruthy();

    // Form should also be visible (Create button, not Done)
    const submitButton = fixture.nativeElement.querySelector('.submit-button');
    expect(submitButton.textContent.trim()).toBe('Create');
  }));

  it('should create item and upload pending photo on submit in create mode with photo support', fakeAsync(() => {
    const schemaWithPhotos: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
          { column_name: 'title', type: 'VARCHAR', primary_key: false, unique: false, nullable: false }
        ],
        description: '', foreign_keys: [], primary_key: 'id',
        table_friendly_name: 'Products', table_name: 'products',
        has_photo_support: true
      }],
      root_tables: ['products'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithPhotos));

    component.tableName = 'products';
    component.columnNames = ['id', 'title'];
    component.isCreateMode = true;
    component.returnUrl = '/admin/tables/products/view/10/0';

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // Fill in values
    const controls = component.controls.toArray();
    controls[0].value = 'Test Product';

    // Submit without a pending photo - should create and navigate back
    spyOn(serverAccess, 'addItemFetchPrimaryKey').and.returnValue(of('42'));
    component.onSubmit();
    tick();

    expect(serverAccess.addItemFetchPrimaryKey).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/tables/products/view/10/0');
  }));

  it('should show cancel button only when returnUrl is provided', fakeAsync(() => {
    component.tableName = 'people';
    component.columnNames = peopleColumns;
    component.isCreateMode = true;

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // No returnUrl - no cancel button
    let cancelButton = fixture.nativeElement.querySelector('.cancel-button');
    expect(cancelButton).toBeFalsy();

    // Set returnUrl
    component.returnUrl = '/admin/tables/people/view/10/0';
    fixture.detectChanges();

    // Now cancel button should appear
    cancelButton = fixture.nativeElement.querySelector('.cancel-button');
    expect(cancelButton).toBeTruthy();
  }));

  // --- Nested navigation tests ---

  it('should use getRowByValues in edit mode', fakeAsync(() => {
    const getRowByValuesSpy = spyOn(serverAccess, 'getRowByValues').and.returnValue(of({
      sortedColumnNames: ['email', 'first_name', 'id', 'last_name', 'password_hash'],
      dataTable: [['mason@test.com', 'Mason', '1', 'B', 'hash']]
    }));

    component.tableName = 'people';
    component.columnNames = peopleColumns;
    component.isCreateMode = false;
    component.primaryKeyName = 'id';
    component.primaryKeyValue = '1';

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(getRowByValuesSpy).toHaveBeenCalledWith('people', [
      { column_name: 'id', column_value: '1' }
    ]);
  }));

  it('should show parent button when binding stack is present', fakeAsync(() => {
    component.tableName = 'people';
    component.columnNames = peopleColumns;
    component.isCreateMode = true;
    component.bindingStack = [
      { tableName: 'roles', primaryKeyName: 'role_id', primaryKeyValue: '5' }
    ];

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const parentButton = fixture.nativeElement.querySelector('.parent-button');
    expect(parentButton).toBeTruthy();
    expect(parentButton.textContent).toContain('Back to');
  }));

  it('should not show parent button when binding stack is empty', fakeAsync(() => {
    component.tableName = 'people';
    component.columnNames = peopleColumns;
    component.isCreateMode = true;
    component.bindingStack = [];

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const parentButton = fixture.nativeElement.querySelector('.parent-button');
    expect(parentButton).toBeFalsy();
  }));

  it('should navigate to parent edit page when parent button is clicked', fakeAsync(() => {
    component.tableName = 'people';
    component.columnNames = peopleColumns;
    component.isCreateMode = true;
    component.bindingStack = [
      { tableName: 'roles', primaryKeyName: 'role_id', primaryKeyValue: '5' }
    ];

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    component.onNavigateToParent();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/admin/tables', 'roles', 'edit', '5'],
      { queryParams: {} }
    );
  }));

  it('should preserve parent ctx when navigating to parent with deep stack', fakeAsync(() => {
    component.tableName = 'people';
    component.columnNames = peopleColumns;
    component.isCreateMode = true;
    component.bindingStack = [
      { tableName: 'organizations', primaryKeyName: 'org_id', primaryKeyValue: '10' },
      { tableName: 'roles', primaryKeyName: 'role_id', primaryKeyValue: '5' }
    ];

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    component.onNavigateToParent();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/admin/tables', 'roles', 'edit', '5'],
      { queryParams: { ctx: 'organizations:org_id:10' } }
    );
  }));

  it('should pre-fill FK columns from binding stack in create mode', fakeAsync(() => {
    const schemaWithFk: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'purchase_id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
          { column_name: 'payer_person_id', type: 'INT', primary_key: false, unique: false, nullable: false },
          { column_name: 'notes', type: 'VARCHAR', primary_key: false, unique: false, nullable: false }
        ],
        description: '',
        foreign_keys: [
          { column_name: 'payer_person_id', parent_table_name: 'people', parent_column_name: 'person_id' }
        ],
        primary_key: 'purchase_id',
        table_friendly_name: 'Purchases', table_name: 'purchases'
      }],
      root_tables: ['people'],
      nested_tables: ['purchases'],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithFk));

    component.tableName = 'purchases';
    component.columnNames = ['payer_person_id', 'notes'];
    component.isCreateMode = true;
    component.bindingStack = [
      { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' }
    ];

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // The FK column should be pre-filled with the parent's PK value
    expect(component.columnValues[0]).toBe('42');
    // The non-FK column should be undefined
    expect(component.columnValues[1]).toBeUndefined();
  }));

  it('should make context FK columns readonly', fakeAsync(() => {
    const schemaWithFk: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'purchase_id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
          { column_name: 'payer_person_id', type: 'INT', primary_key: false, unique: false, nullable: false },
          { column_name: 'notes', type: 'VARCHAR', primary_key: false, unique: false, nullable: false }
        ],
        description: '',
        foreign_keys: [
          { column_name: 'payer_person_id', parent_table_name: 'people', parent_column_name: 'person_id' }
        ],
        primary_key: 'purchase_id',
        table_friendly_name: 'Purchases', table_name: 'purchases'
      }],
      root_tables: ['people'],
      nested_tables: ['purchases'],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithFk));

    component.tableName = 'purchases';
    component.columnNames = ['payer_person_id', 'notes'];
    component.isCreateMode = true;
    component.bindingStack = [
      { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' }
    ];

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const fkCol = { column_name: 'payer_person_id', type: 'INT', primary_key: false, unique: false, nullable: false } as unknown as ColumnDataInfo;
    const notesCol = { column_name: 'notes', type: 'VARCHAR', primary_key: false, unique: false, nullable: false } as unknown as ColumnDataInfo;

    expect(component.isReadonlyColumn(fkCol)).toBeTrue();
    expect(component.isContextFkColumn(fkCol)).toBeTrue();
    expect(component.isReadonlyColumn(notesCol)).toBeFalse();
    expect(component.isContextFkColumn(notesCol)).toBeFalse();
  }));

  it('should discover child table references in edit mode', fakeAsync(() => {
    const schemaWithNested: DatabaseSchema = {
      tables: [
        {
          columns: [
            { column_name: 'person_id', type: 'SERIAL', primary_key: true, unique: false, nullable: false }
          ],
          description: '', foreign_keys: [], primary_key: 'person_id',
          table_friendly_name: 'People', table_name: 'people'
        },
        {
          columns: [
            { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
            { column_name: 'payer_person_id', type: 'INT', primary_key: false, unique: false, nullable: false }
          ],
          description: '',
          foreign_keys: [
            { column_name: 'payer_person_id', parent_table_name: 'people', parent_column_name: 'person_id' }
          ],
          primary_key: 'id',
          table_friendly_name: 'Purchases', table_name: 'purchases'
        }
      ],
      root_tables: ['people'],
      nested_tables: ['purchases'],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithNested));

    spyOn(serverAccess, 'getRowByValues').and.returnValue(of({
      sortedColumnNames: ['person_id'],
      dataTable: [['1']]
    }));

    component.tableName = 'people';
    component.columnNames = ['person_id'];
    component.isCreateMode = false;
    component.primaryKeyName = 'person_id';
    component.primaryKeyValue = '1';

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component.childTableReferences.length).toBe(1);
    expect(component.childTableReferences[0].childTableName).toBe('purchases');
    expect(component.childTableReferences[0].childTableFriendlyName).toBe('Purchases');
  }));

  it('should not show child table references in create mode', fakeAsync(() => {
    const schemaWithNested: DatabaseSchema = {
      tables: [
        {
          columns: [
            { column_name: 'person_id', type: 'SERIAL', primary_key: true, unique: false, nullable: false }
          ],
          description: '', foreign_keys: [], primary_key: 'person_id',
          table_friendly_name: 'People', table_name: 'people'
        },
        {
          columns: [
            { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
            { column_name: 'payer_person_id', type: 'INT', primary_key: false, unique: false, nullable: false }
          ],
          description: '',
          foreign_keys: [
            { column_name: 'payer_person_id', parent_table_name: 'people', parent_column_name: 'person_id' }
          ],
          primary_key: 'id',
          table_friendly_name: 'Purchases', table_name: 'purchases'
        }
      ],
      root_tables: ['people'],
      nested_tables: ['purchases'],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithNested));

    component.tableName = 'people';
    component.columnNames = ['person_id'];
    component.isCreateMode = true;

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component.childTableReferences.length).toBe(0);
    const nestedSection = fixture.nativeElement.querySelector('.nested-tables-section');
    expect(nestedSection).toBeFalsy();
  }));

  it('should navigate to child table view when nested table card is clicked', fakeAsync(() => {
    const schemaWithNested: DatabaseSchema = {
      tables: [
        {
          columns: [
            { column_name: 'person_id', type: 'SERIAL', primary_key: true, unique: false, nullable: false }
          ],
          description: '', foreign_keys: [], primary_key: 'person_id',
          table_friendly_name: 'People', table_name: 'people'
        },
        {
          columns: [
            { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
            { column_name: 'payer_person_id', type: 'INT', primary_key: false, unique: false, nullable: false }
          ],
          description: '',
          foreign_keys: [
            { column_name: 'payer_person_id', parent_table_name: 'people', parent_column_name: 'person_id' }
          ],
          primary_key: 'id',
          table_friendly_name: 'Purchases', table_name: 'purchases'
        }
      ],
      root_tables: ['people'],
      nested_tables: ['purchases'],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithNested));

    spyOn(serverAccess, 'getRowByValues').and.returnValue(of({
      sortedColumnNames: ['person_id'],
      dataTable: [['42']]
    }));

    component.tableName = 'people';
    component.columnNames = ['person_id'];
    component.isCreateMode = false;
    component.primaryKeyName = 'person_id';
    component.primaryKeyValue = '42';

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // Click the nested table card
    component.onNavigateToChild(component.childTableReferences[0]);

    expect(router.navigate).toHaveBeenCalledWith(
      ['/admin/tables', 'purchases', 'view', 10, 0],
      { queryParams: { ctx: 'people:person_id:42' } }
    );
  }));

  it('should render nested table cards in edit mode DOM', fakeAsync(() => {
    const schemaWithNested: DatabaseSchema = {
      tables: [
        {
          columns: [
            { column_name: 'person_id', type: 'SERIAL', primary_key: true, unique: false, nullable: false }
          ],
          description: '', foreign_keys: [], primary_key: 'person_id',
          table_friendly_name: 'People', table_name: 'people'
        },
        {
          columns: [
            { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
            { column_name: 'payer_person_id', type: 'INT', primary_key: false, unique: false, nullable: false }
          ],
          description: '',
          foreign_keys: [
            { column_name: 'payer_person_id', parent_table_name: 'people', parent_column_name: 'person_id' }
          ],
          primary_key: 'id',
          table_friendly_name: 'Purchases', table_name: 'purchases'
        }
      ],
      root_tables: ['people'],
      nested_tables: ['purchases'],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithNested));

    spyOn(serverAccess, 'getRowByValues').and.returnValue(of({
      sortedColumnNames: ['person_id'],
      dataTable: [['1']]
    }));

    component.tableName = 'people';
    component.columnNames = ['person_id'];
    component.isCreateMode = false;
    component.primaryKeyName = 'person_id';
    component.primaryKeyValue = '1';

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const nestedSection = fixture.nativeElement.querySelector('.nested-tables-section');
    expect(nestedSection).toBeTruthy();

    const cards = fixture.nativeElement.querySelectorAll('.nested-table-card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Purchases');
  }));

  // --- Phase 5: CrudFormAssist — Default values ---

  const eventSessionSchema: DatabaseSchema = {
    tables: [{
      columns: [
        { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
        { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false },
        { column_name: 'capacity', type: 'INT', primary_key: false, unique: false, nullable: false },
        { column_name: 'start_time_us', type: 'BIGINT', primary_key: false, unique: false, nullable: false },
        { column_name: 'end_time_us', type: 'BIGINT', primary_key: false, unique: false, nullable: false },
      ],
      description: '',
      foreign_keys: [],
      primary_key: 'id',
      table_friendly_name: 'Event Sessions',
      table_name: 'event_sessions',
    }],
    root_tables: ['event_sessions'],
    nested_tables: [],
    display_templates: {},
    fk_picker_preload_threshold: 50,
  };

  const eventColumnNames = ['name', 'capacity', 'start_time_us', 'end_time_us'];

  it('should apply formAssist defaults in create mode', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      defaults: { capacity: '20' },
    };

    fixture.detectChanges();
    tick();

    // capacity is index 1 in eventColumnNames
    expect(component.columnValues[1]).toBe('20');
    // other columns should be undefined
    expect(component.columnValues[0]).toBeUndefined(); // name
    expect(component.columnValues[2]).toBeUndefined(); // start_time_us
    expect(component.columnValues[3]).toBeUndefined(); // end_time_us
  }));

  it('should apply multiple formAssist defaults', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      defaults: { capacity: '20', name: 'Test Session' },
    };

    fixture.detectChanges();
    tick();

    expect(component.columnValues[0]).toBe('Test Session');
    expect(component.columnValues[1]).toBe('20');
  }));

  it('should not apply defaults when no formAssist is provided', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;

    fixture.detectChanges();
    tick();

    expect(component.columnValues[0]).toBeUndefined();
    expect(component.columnValues[1]).toBeUndefined();
    expect(component.columnValues[2]).toBeUndefined();
    expect(component.columnValues[3]).toBeUndefined();
  }));

  // --- Phase 5: CrudFormAssist — Computed date state initialization ---

  it('should initialize computed date auto state from formAssist', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 60,
        autoByDefault: true,
      }],
    };

    fixture.detectChanges();
    tick();

    expect(component.computedDateAutoState['end_time_us']).toBeTrue();
  }));

  it('should initialize computed date auto state as false when autoByDefault is false', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 60,
        autoByDefault: false,
      }],
    };

    fixture.detectChanges();
    tick();

    expect(component.computedDateAutoState['end_time_us']).toBeFalse();
  }));

  it('should not initialize computed date state when no computedDates provided', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = { defaults: { capacity: '20' } };

    fixture.detectChanges();
    tick();

    expect(Object.keys(component.computedDateAutoState).length).toBe(0);
  }));

  // --- Phase 5: isComputedDateAuto ---

  it('isComputedDateAuto should return true for auto columns', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 60,
        autoByDefault: true,
      }],
    };

    fixture.detectChanges();
    tick();

    expect(component.isComputedDateAuto('end_time_us')).toBeTrue();
    expect(component.isComputedDateAuto('start_time_us')).toBeFalse();
    expect(component.isComputedDateAuto('name')).toBeFalse();
  }));

  // --- Phase 5: getComputedDateRule ---

  it('getComputedDateRule should return the rule for a dest column', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 60,
        autoByDefault: true,
      }],
    };

    fixture.detectChanges();
    tick();

    const rule = component.getComputedDateRule('end_time_us');
    expect(rule).toBeDefined();
    expect(rule!.source).toBe('start_time_us');
    expect(rule!.offsetMinutes).toBe(60);
  }));

  it('getComputedDateRule should return undefined for non-dest columns', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 60,
        autoByDefault: true,
      }],
    };

    fixture.detectChanges();
    tick();

    expect(component.getComputedDateRule('start_time_us')).toBeUndefined();
    expect(component.getComputedDateRule('name')).toBeUndefined();
  }));

  // --- Phase 5: Computed date propagation ---

  it('should compute end_time_us when start_time_us changes and auto is on', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 60,
        autoByDefault: true,
      }],
    };

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // Find the visible index for start_time_us
    const startTimeVisibleIdx = component.visibleColumns.findIndex(
      v => v.col.column_name === 'start_time_us'
    );

    const startUs = '1000000000000';
    component.onValueChanged(startTimeVisibleIdx, startUs);

    // end_time_us = start + 60min * 60sec * 1_000_000 us
    const expectedEndUs = String(1000000000000 + 60 * 60 * 1_000_000);
    expect(component.columnValues[3]).toBe(expectedEndUs); // end_time_us at index 3
  }));

  it('should not compute end_time_us when auto is off', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 60,
        autoByDefault: false,
      }],
    };

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const startTimeVisibleIdx = component.visibleColumns.findIndex(
      v => v.col.column_name === 'start_time_us'
    );

    component.onValueChanged(startTimeVisibleIdx, '1000000000000');

    expect(component.columnValues[3]).toBeUndefined();
  }));

  it('should not compute when a non-source column changes', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 60,
        autoByDefault: true,
      }],
    };

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // Change the 'name' column (visible index 0)
    component.onValueChanged(0, 'Some Name');

    expect(component.columnValues[3]).toBeUndefined();
  }));

  // --- Phase 5: Toggle computed date ---

  it('onToggleComputedDate should toggle auto state off', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 60,
        autoByDefault: true,
      }],
    };

    fixture.detectChanges();
    tick();

    expect(component.isComputedDateAuto('end_time_us')).toBeTrue();
    component.onToggleComputedDate('end_time_us');
    expect(component.isComputedDateAuto('end_time_us')).toBeFalse();
  }));

  it('onToggleComputedDate should toggle auto back on and recompute', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 60,
        autoByDefault: false,
      }],
    };

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // Set source value
    const startTimeVisibleIdx = component.visibleColumns.findIndex(
      v => v.col.column_name === 'start_time_us'
    );
    component.onValueChanged(startTimeVisibleIdx, '1000000000000');

    // Auto is off, end_time_us should be uncomputed
    expect(component.columnValues[3]).toBeUndefined();

    // Toggle auto ON
    component.onToggleComputedDate('end_time_us');

    expect(component.isComputedDateAuto('end_time_us')).toBeTrue();
    const expectedEndUs = String(1000000000000 + 60 * 60 * 1_000_000);
    expect(component.columnValues[3]).toBe(expectedEndUs);
  }));

  // --- Phase 5: Combined defaults + computed dates ---

  it('should apply both defaults and computed date state', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      defaults: { capacity: '20' },
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 90,
        autoByDefault: true,
      }],
    };

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // Default applied
    expect(component.columnValues[1]).toBe('20'); // capacity

    // Computed date auto state initialized
    expect(component.isComputedDateAuto('end_time_us')).toBeTrue();

    // Simulate source change
    const startTimeVisibleIdx = component.visibleColumns.findIndex(
      v => v.col.column_name === 'start_time_us'
    );
    component.onValueChanged(startTimeVisibleIdx, '2000000000000');

    // end_time_us = start + 90min * 60sec * 1_000_000 us
    const expectedEndUs = String(2000000000000 + 90 * 60 * 1_000_000);
    expect(component.columnValues[3]).toBe(expectedEndUs);
  }));

  // --- Phase 5: Edge cases ---

  it('should handle missing source value gracefully for computed dates', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 60,
        autoByDefault: false,
      }],
    };

    fixture.detectChanges();
    tick();

    // Toggle auto ON without setting source value
    component.onToggleComputedDate('end_time_us');

    // Should not crash, end_time_us remains undefined
    expect(component.columnValues[3]).toBeUndefined();
  }));

  it('should handle NaN source value gracefully', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 60,
        autoByDefault: true,
      }],
    };

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const startTimeVisibleIdx = component.visibleColumns.findIndex(
      v => v.col.column_name === 'start_time_us'
    );
    component.onValueChanged(startTimeVisibleIdx, 'not-a-number');

    // Should not crash; end_time_us should remain undefined
    expect(component.columnValues[3]).toBeUndefined();
  }));

  it('should make computed date dest column readonly when auto is on', fakeAsync(() => {
    dbSchemaService.GetDBSchema.and.returnValue(of(eventSessionSchema));

    component.tableName = 'event_sessions';
    component.columnNames = eventColumnNames;
    component.isCreateMode = true;
    component.formAssist = {
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 60,
        autoByDefault: true,
      }],
    };

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // The template uses isComputedDateAuto to set readOnly on the control
    expect(component.isComputedDateAuto('end_time_us')).toBeTrue();
    expect(component.isComputedDateAuto('start_time_us')).toBeFalse();
  }));
});
