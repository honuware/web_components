import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Observable, Subject } from 'rxjs';
import { TableViewControlComponent } from './table-view-control.component';
import { ConfirmDialogComponent } from '@honuware/ui/foundation';
import { DatabaseSchemaService } from '../database-schema.service';
import { CrudAccess, HONUWARE_CRUD_ACCESS, DatabaseSchema, DataResultsWithCount, FkDisplayResponse, ColumnDataInfo } from '@honuware/ui/access';

// Build a full ColumnDataInfo from a partial — the formatCellValue/isBoolColumn
// tests only care about a couple of fields, but the type needs the required ones.
function col(overrides: Partial<ColumnDataInfo>): ColumnDataInfo {
  return { column_name: 'col', type: 'VARCHAR', primary_key: false, unique: false, nullable: true, ...overrides };
}
import { CRUD_EDITOR_ROUTES } from '../crud-editor-routes';

// A minimal CrudAccess fake — only the three methods the grid calls, with real
// (non-spy) defaults so the existing `spyOn(serverAccess, ...)` overrides keep
// working. No app ServerAccessMock, no network layer. A 2-row page over a
// totalCount of 5 keeps the pagination assertions meaningful.
function makeCrudAccessFake(): Pick<CrudAccess, 'getFilteredTableRows' | 'resolveFkDisplay' | 'deleteItem'> {
  return {
    getFilteredTableRows: (): Observable<DataResultsWithCount> =>
      of({
        sortedColumnNames: ['id', 'name', 'description'],
        dataTable: [
          ['1', 'Yoga Flow', 'A class'],
          ['2', 'Acro Basics', 'Another class'],
        ],
        totalCount: 5,
      }),
    resolveFkDisplay: (): Observable<FkDisplayResponse> => of({ resolved: {} }),
    deleteItem: (): Observable<void> => of(void 0),
  };
}

describe('TableViewControlComponent', () => {
  let component: TableViewControlComponent;
  let fixture: ComponentFixture<TableViewControlComponent>;
  let serverAccess: ReturnType<typeof makeCrudAccessFake>;
  let dbSchemaService: jasmine.SpyObj<DatabaseSchemaService>;
  let router: jasmine.SpyObj<Router>;
  let dialog: MatDialog;
  let schemaSubject: Subject<DatabaseSchema>;

  const mockSchema: DatabaseSchema = {
    tables: [
      {
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false, column_friendly_name: 'ID' },
          { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false, column_friendly_name: 'Class Name' },
          { column_name: 'description', type: 'TEXT', primary_key: false, unique: false, nullable: true, column_friendly_name: 'Description' }
        ],
        description: 'Yoga classes',
        foreign_keys: [],
        primary_key: 'id',
        table_friendly_name: 'Classes',
        table_name: 'classes'
      }
    ],
    root_tables: ['classes'],
    nested_tables: [],
    display_templates: {},
    fk_picker_preload_threshold: 50
  };

  beforeEach(async () => {
    serverAccess = makeCrudAccessFake();
    dbSchemaService = jasmine.createSpyObj('DatabaseSchemaService', ['GetDBSchema']);
    schemaSubject = new Subject<DatabaseSchema>();
    dbSchemaService.GetDBSchema.and.returnValue(schemaSubject.asObservable());
    router = jasmine.createSpyObj('Router', ['navigate'], { url: '/admin/tables/classes/view/10/0' });

    await TestBed.configureTestingModule({
      imports: [TableViewControlComponent, NoopAnimationsModule, MatDialogModule],
      providers: [
        { provide: HONUWARE_CRUD_ACCESS, useValue: serverAccess },
        { provide: DatabaseSchemaService, useValue: dbSchemaService },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TableViewControlComponent);
    component = fixture.componentInstance;
    // Access the component's injected dialog for spying
    dialog = (component as unknown as { dialog: MatDialog }).dialog;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display loading state initially', () => {
    component.tableName = 'classes';
    fixture.detectChanges(); // Triggers ngOnInit but schema hasn't emitted yet

    expect(component.loading).toBeTrue();
    const loadingEl = fixture.nativeElement.querySelector('.loading-container');
    expect(loadingEl).toBeTruthy();
  });

  it('should load and display table data', fakeAsync(() => {
    component.tableName = 'classes';
    component.pageSize = 10;
    component.pageOffset = 0;

    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    expect(component.loading).toBeFalse();
    expect(component.dataSource.length).toBeGreaterThan(0);
    expect(component.totalCount).toBeGreaterThan(0);

    // Table should be rendered
    const table = fixture.nativeElement.querySelector('table');
    expect(table).toBeTruthy();
  }));

  it('should display column headers from schema', fakeAsync(() => {
    component.tableName = 'classes';
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    const headers = fixture.nativeElement.querySelectorAll('th');
    // Should have columns + actions column
    expect(headers.length).toBe(4); // id, name, description, actions
  }));

  it('should navigate to new item page when New Item is clicked', fakeAsync(() => {
    component.tableName = 'classes';
    component.pageSize = 10;
    component.pageOffset = 0;
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    component.onNewItem();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/admin/tables', 'classes', 'new'],
      { queryParams: { returnUrl: '/admin/tables/classes/view/10/0' } }
    );
  }));

  // The editor's route base is token-driven (CRUD_EDITOR_ROUTES.basePath), so a
  // consumer that mounts the editor elsewhere gets its own navigation targets.
  it('navigates using a custom CRUD_EDITOR_ROUTES basePath', fakeAsync(() => {
    TestBed.resetTestingModule();
    const customRouter = jasmine.createSpyObj('Router', ['navigate'], { url: '/data/tables/classes/view/10/0' });
    const customDbSchema = jasmine.createSpyObj('DatabaseSchemaService', ['GetDBSchema']);
    customDbSchema.GetDBSchema.and.returnValue(of(mockSchema));

    TestBed.configureTestingModule({
      imports: [TableViewControlComponent, NoopAnimationsModule, MatDialogModule],
      providers: [
        { provide: HONUWARE_CRUD_ACCESS, useValue: makeCrudAccessFake() },
        { provide: DatabaseSchemaService, useValue: customDbSchema },
        { provide: Router, useValue: customRouter },
        { provide: CRUD_EDITOR_ROUTES, useValue: { basePath: '/data/tables', adminHome: '/data' } },
      ],
    });

    const f = TestBed.createComponent(TableViewControlComponent);
    f.componentInstance.tableName = 'classes';
    f.detectChanges();
    tick();

    f.componentInstance.onNewItem();

    expect(customRouter.navigate).toHaveBeenCalledWith(
      ['/data/tables', 'classes', 'new'],
      { queryParams: { returnUrl: '/data/tables/classes/view/10/0' } }
    );
  }));

  it('builds the 50x50 photo thumbnail URL through PhotoUrlBuilder', fakeAsync(() => {
    component.tableName = 'classes';
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();

    expect(component.getPhotoUrl({ id: '7' })).toBe('/api/get_scaled_photo/classes/7/50/50');
  }));

  it('should navigate to edit page when Edit is clicked', fakeAsync(() => {
    component.tableName = 'classes';
    component.pageSize = 10;
    component.pageOffset = 0;
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    const row = component.dataSource[0];
    component.onEditRow(row);

    const expectedId = row['id'];
    expect(router.navigate).toHaveBeenCalledWith(
      ['/admin/tables', 'classes', 'edit', expectedId],
      { queryParams: { returnUrl: '/admin/tables/classes/view/10/0' } }
    );
  }));

  it('should open confirm dialog when Delete is clicked', fakeAsync(() => {
    const mockDialogRef = jasmine.createSpyObj<MatDialogRef<ConfirmDialogComponent>>(['afterClosed']);
    mockDialogRef.afterClosed.and.returnValue(of(false)); // User cancels
    const dialogSpy = spyOn(dialog, 'open').and.returnValue(mockDialogRef);

    component.tableName = 'classes';
    component.pageSize = 10;
    component.pageOffset = 0;
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    // Verify data was loaded
    expect(component.dataSource.length).toBeGreaterThan(0);

    const row = component.dataSource[0];
    component.onDeleteRow(row);

    expect(dialogSpy).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      jasmine.objectContaining({
        width: '400px',
        data: jasmine.objectContaining({
          title: 'Confirm Delete',
          description: `Are you sure you want to delete this Classes record (ID: ${row['id']})?`,
          buttonText: 'Delete'
        })
      })
    );
  }));

  it('should delete row when confirmed', fakeAsync(() => {
    const mockDialogRef = jasmine.createSpyObj<MatDialogRef<ConfirmDialogComponent>>(['afterClosed']);
    mockDialogRef.afterClosed.and.returnValue(of(true)); // User confirms
    spyOn(dialog, 'open').and.returnValue(mockDialogRef);
    spyOn(serverAccess, 'deleteItem').and.callThrough();

    component.tableName = 'classes';
    component.pageSize = 10;
    component.pageOffset = 0;
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    // Verify data was loaded
    expect(component.dataSource.length).toBeGreaterThan(0);

    const row = component.dataSource[0];
    const rowId = row['id'];

    component.onDeleteRow(row);
    tick();
    fixture.detectChanges();

    expect(serverAccess.deleteItem).toHaveBeenCalledWith('classes', 'id', rowId);
  }));

  it('should calculate pagination info correctly', fakeAsync(() => {
    component.tableName = 'classes';
    component.pageSize = 2;
    component.pageOffset = 0;
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    expect(component.startRow).toBe(1);
    expect(component.endRow).toBeLessThanOrEqual(2);
    expect(component.currentPage).toBe(0);
    expect(component.totalPages).toBeGreaterThan(0);
  }));

  it('should navigate to next page', fakeAsync(() => {
    component.tableName = 'classes';
    component.pageSize = 2;
    component.pageOffset = 0;
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    if (component.canGoNext) {
      component.goToNextPage();
      expect(router.navigate).toHaveBeenCalledWith(
        ['/admin/tables', 'classes', 'view', 2, 1],
        { queryParams: {} }
      );
    }
  }));

  it('should navigate to previous page', fakeAsync(() => {
    component.tableName = 'classes';
    component.pageSize = 2;
    component.pageOffset = 1;
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    component.goToPreviousPage();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/admin/tables', 'classes', 'view', 2, 0],
      { queryParams: {} }
    );
  }));

  it('should navigate to first page', fakeAsync(() => {
    component.tableName = 'classes';
    component.pageSize = 2;
    component.pageOffset = 2;
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    component.goToFirstPage();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/admin/tables', 'classes', 'view', 2, 0],
      { queryParams: {} }
    );
  }));

  it('should place actions column first in displayedColumns', fakeAsync(() => {
    component.tableName = 'classes';
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    expect(component.displayedColumns[0]).toBe('actions');
    expect(component.displayedColumns.slice(1)).toEqual(['id', 'name', 'description']);
  }));

  it('should have pageSizeOptions defined', () => {
    expect(component.pageSizeOptions).toEqual([5, 10, 20, 30, 50, 100]);
  });

  it('should navigate to first page with new page size on onPageSizeChange', fakeAsync(() => {
    component.tableName = 'classes';
    component.pageSize = 10;
    component.pageOffset = 2;
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    component.onPageSizeChange(20);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/admin/tables', 'classes', 'view', 20, 0],
      { queryParams: {} }
    );
  }));

  it('should not navigate when onEditRow is called with a row missing the primary key', fakeAsync(() => {
    component.tableName = 'classes';
    component.pageSize = 10;
    component.pageOffset = 0;
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    const rowWithoutPk: Record<string, string> = { name: 'Test', description: 'Desc' };
    spyOn(console, 'error');
    component.onEditRow(rowWithoutPk);

    expect(router.navigate).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  }));

  it('should show error state when table not found', fakeAsync(() => {
    component.tableName = 'nonexistent_table';
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    expect(component.error).toContain('not found');
    const errorEl = fixture.nativeElement.querySelector('.error-container');
    expect(errorEl).toBeTruthy();
  }));

  // --- Hidden column tests ---

  it('should exclude hidden columns from table headers', fakeAsync(() => {
    const schemaWithHidden: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false, column_friendly_name: 'ID' },
          { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false, column_friendly_name: 'Name' },
          { column_name: 'fk_parent', type: 'INT', primary_key: false, unique: false, nullable: false, column_friendly_name: 'Parent', hidden: true }
        ],
        description: '', foreign_keys: [], primary_key: 'id',
        table_friendly_name: 'Items', table_name: 'items'
      }],
      root_tables: ['items'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };

    spyOn(serverAccess, 'getFilteredTableRows').and.returnValue(of({
      sortedColumnNames: ['id', 'name', 'fk_parent'],
      dataTable: [['1', 'Test', '99']],
      totalCount: 1
    }));

    component.tableName = 'items';
    fixture.detectChanges();
    schemaSubject.next(schemaWithHidden);
    tick();
    fixture.detectChanges();

    expect(component.columns.length).toBe(2);
    expect(component.columns.map(c => c.column_name)).toEqual(['id', 'name']);
    expect(component.displayedColumns).toEqual(['actions', 'id', 'name']);
  }));

  it('should display non-hidden columns normally', fakeAsync(() => {
    const schemaWithHidden: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false, column_friendly_name: 'ID' },
          { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false, column_friendly_name: 'Name' },
          { column_name: 'visible_col', type: 'VARCHAR', primary_key: false, unique: false, nullable: false, column_friendly_name: 'Visible' },
          { column_name: 'fk_parent', type: 'INT', primary_key: false, unique: false, nullable: false, column_friendly_name: 'Parent', hidden: true }
        ],
        description: '', foreign_keys: [], primary_key: 'id',
        table_friendly_name: 'Items', table_name: 'items'
      }],
      root_tables: ['items'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };

    spyOn(serverAccess, 'getFilteredTableRows').and.returnValue(of({
      sortedColumnNames: ['id', 'name', 'visible_col', 'fk_parent'],
      dataTable: [['1', 'Test', 'val', '99']],
      totalCount: 1
    }));

    component.tableName = 'items';
    fixture.detectChanges();
    schemaSubject.next(schemaWithHidden);
    tick();
    fixture.detectChanges();

    expect(component.columns.length).toBe(3);
    expect(component.columns.map(c => c.column_name)).toEqual(['id', 'name', 'visible_col']);

    const headers = fixture.nativeElement.querySelectorAll('th');
    // actions + 3 visible columns = 4
    expect(headers.length).toBe(4);
  }));

  // --- Date formatting tests ---

  it('should format date columns with microsecond values in table', fakeAsync(() => {
    const schemaWithDate: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false, column_friendly_name: 'ID' },
          { column_name: 'created_us', type: 'BIGINT', primary_key: false, unique: false, nullable: false, column_friendly_name: 'Created', html_input_type: 'date' }
        ],
        description: '', foreign_keys: [], primary_key: 'id',
        table_friendly_name: 'Items', table_name: 'items'
      }],
      root_tables: ['items'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };

    // Use a timestamp: Jan 15, 2024 12:00:00 UTC (midday to avoid timezone boundary issues)
    spyOn(serverAccess, 'getFilteredTableRows').and.returnValue(of({
      sortedColumnNames: ['id', 'created_us'],
      dataTable: [['1', '1705320000000000']],
      totalCount: 1
    }));

    component.tableName = 'items';
    fixture.detectChanges();
    schemaSubject.next(schemaWithDate);
    tick();
    fixture.detectChanges();

    const cells = fixture.nativeElement.querySelectorAll('td');
    // The raw number should NOT appear; a formatted date should
    const hasRawNumber = Array.from<Element>(cells).some((cell) =>
      (cell.textContent ?? '').includes('1705320000000000')
    );
    expect(hasRawNumber).toBeFalse();

    // Should contain a formatted date with "Jan" and "2024"
    const createdCell = Array.from<Element>(cells).find((cell) =>
      (cell.textContent ?? '').includes('Jan') && (cell.textContent ?? '').includes('2024')
    );
    expect(createdCell).toBeTruthy();
  }));

  it('should not format non-date columns', fakeAsync(() => {
    const schemaWithDate: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false, column_friendly_name: 'ID' },
          { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false, column_friendly_name: 'Name' }
        ],
        description: '', foreign_keys: [], primary_key: 'id',
        table_friendly_name: 'Items', table_name: 'items'
      }],
      root_tables: ['items'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };

    spyOn(serverAccess, 'getFilteredTableRows').and.returnValue(of({
      sortedColumnNames: ['id', 'name'],
      dataTable: [['1', 'TestValue']],
      totalCount: 1
    }));

    component.tableName = 'items';
    fixture.detectChanges();
    schemaSubject.next(schemaWithDate);
    tick();
    fixture.detectChanges();

    const cells = fixture.nativeElement.querySelectorAll('td');
    const nameCell = Array.from<Element>(cells).find((cell) =>
      (cell.textContent ?? '').trim() === 'TestValue'
    );
    expect(nameCell).toBeTruthy();
  }));

  it('should return raw value from formatCellValue for non-date column', () => {
    const nonDateColumn = col({ column_name: 'name', html_input_type: 'text' });
    expect(component.formatCellValue(nonDateColumn, '12345')).toBe('12345');
  });

  it('should return formatted date from formatCellValue for date column', () => {
    const dateColumn = col({ column_name: 'created_us', html_input_type: 'date' });
    // Jan 15, 2024 12:00:00 UTC — midday to avoid timezone boundary issues
    const result = component.formatCellValue(dateColumn, '1705320000000000');
    // Should contain "Jan" and "2024" (absolute date format)
    expect(result).toContain('Jan');
    expect(result).toContain('2024');
  });

  it('should return raw value from formatCellValue for empty value', () => {
    const dateColumn = col({ column_name: 'created_us', html_input_type: 'date' });
    expect(component.formatCellValue(dateColumn, '')).toBe('');
  });

  // --- Bool column tests ---

  it('should show check_circle icon for true bool value in table', fakeAsync(() => {
    const schemaWithBool: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false, column_friendly_name: 'ID' },
          { column_name: 'is_active', type: 'bool', primary_key: false, unique: false, nullable: false, column_friendly_name: 'Active', html_input_type: 'bool' }
        ],
        description: '', foreign_keys: [], primary_key: 'id',
        table_friendly_name: 'Items', table_name: 'items'
      }],
      root_tables: ['items'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };

    spyOn(serverAccess, 'getFilteredTableRows').and.returnValue(of({
      sortedColumnNames: ['id', 'is_active'],
      dataTable: [['1', 't']],
      totalCount: 1
    }));

    component.tableName = 'items';
    fixture.detectChanges();
    schemaSubject.next(schemaWithBool);
    tick();
    fixture.detectChanges();

    const icons = fixture.nativeElement.querySelectorAll('mat-icon.bool-true');
    expect(icons.length).toBe(1);
    expect(icons[0].textContent.trim()).toBe('check_circle');
  }));

  it('should show cancel icon for false bool value in table', fakeAsync(() => {
    const schemaWithBool: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false, column_friendly_name: 'ID' },
          { column_name: 'is_active', type: 'bool', primary_key: false, unique: false, nullable: false, column_friendly_name: 'Active', html_input_type: 'bool' }
        ],
        description: '', foreign_keys: [], primary_key: 'id',
        table_friendly_name: 'Items', table_name: 'items'
      }],
      root_tables: ['items'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };

    spyOn(serverAccess, 'getFilteredTableRows').and.returnValue(of({
      sortedColumnNames: ['id', 'is_active'],
      dataTable: [['1', 'f']],
      totalCount: 1
    }));

    component.tableName = 'items';
    fixture.detectChanges();
    schemaSubject.next(schemaWithBool);
    tick();
    fixture.detectChanges();

    const icons = fixture.nativeElement.querySelectorAll('mat-icon.bool-false');
    expect(icons.length).toBe(1);
    expect(icons[0].textContent.trim()).toBe('cancel');
  }));

  it('should return true from isBoolColumn for bool type', () => {
    expect(component.isBoolColumn(col({ type: 'bool' }))).toBeTrue();
  });

  it('should return true from isBoolColumn for bool html_input_type', () => {
    expect(component.isBoolColumn(col({ type: 'VARCHAR', html_input_type: 'bool' }))).toBeTrue();
  });

  it('should return false from isBoolColumn for non-bool type', () => {
    expect(component.isBoolColumn(col({ type: 'VARCHAR', html_input_type: 'text' }))).toBeFalse();
  });

  it('should return true from getBoolValue for "t" and "true"', () => {
    expect(component.getBoolValue('t')).toBeTrue();
    expect(component.getBoolValue('true')).toBeTrue();
  });

  it('should return false from getBoolValue for "f" and "false"', () => {
    expect(component.getBoolValue('f')).toBeFalse();
    expect(component.getBoolValue('false')).toBeFalse();
  });

  // --- Nested table navigation tests ---

  it('should show parent button when binding stack is present', fakeAsync(() => {
    component.tableName = 'classes';
    component.bindingStack = [
      { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' }
    ];
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    const parentButton = fixture.nativeElement.querySelector('.parent-button');
    expect(parentButton).toBeTruthy();
    expect(parentButton.textContent).toContain('Back to');
  }));

  it('should not show parent button when binding stack is empty', fakeAsync(() => {
    component.tableName = 'classes';
    component.bindingStack = [];
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    const parentButton = fixture.nativeElement.querySelector('.parent-button');
    expect(parentButton).toBeFalsy();
  }));

  it('should navigate to parent edit page when parent button is clicked', fakeAsync(() => {
    component.tableName = 'classes';
    component.bindingStack = [
      { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' }
    ];
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    component.onNavigateToParent();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/admin/tables', 'people', 'edit', '42'],
      { queryParams: {} }
    );
  }));

  it('should preserve parent ctx when navigating to parent with deep stack', fakeAsync(() => {
    component.tableName = 'classes';
    component.bindingStack = [
      { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' },
      { tableName: 'purchases', primaryKeyName: 'purchase_id', primaryKeyValue: '7' }
    ];
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    component.onNavigateToParent();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/admin/tables', 'purchases', 'edit', '7'],
      { queryParams: { ctx: 'people:person_id:42' } }
    );
  }));

  it('should include ctx in edit and new navigation URLs', fakeAsync(() => {
    component.tableName = 'classes';
    component.pageSize = 10;
    component.pageOffset = 0;
    component.bindingStack = [
      { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' }
    ];
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    // Test edit navigation
    const row = component.dataSource[0];
    component.onEditRow(row);
    const expectedId = row['id'];
    expect(router.navigate).toHaveBeenCalledWith(
      ['/admin/tables', 'classes', 'edit', expectedId],
      { queryParams: { returnUrl: '/admin/tables/classes/view/10/0', ctx: 'people:person_id:42' } }
    );

    router.navigate.calls.reset();

    // Test new item navigation
    component.onNewItem();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/admin/tables', 'classes', 'new'],
      { queryParams: { returnUrl: '/admin/tables/classes/view/10/0', ctx: 'people:person_id:42' } }
    );
  }));

  it('should include ctx in pagination navigation', fakeAsync(() => {
    component.tableName = 'classes';
    component.pageSize = 2;
    component.pageOffset = 0;
    component.bindingStack = [
      { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' }
    ];
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    if (component.canGoNext) {
      component.goToNextPage();
      expect(router.navigate).toHaveBeenCalledWith(
        ['/admin/tables', 'classes', 'view', 2, 1],
        { queryParams: { ctx: 'people:person_id:42' } }
      );
    }
  }));

  // --- FK display resolution tests ---

  it('should resolve FK display values for FK columns', fakeAsync(() => {
    const schemaWithFk: DatabaseSchema = {
      tables: [
        {
          columns: [
            { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false, column_friendly_name: 'ID' },
            { column_name: 'person_id', type: 'INTEGER', primary_key: false, unique: false, nullable: false, column_friendly_name: 'Person' }
          ],
          description: '', foreign_keys: [
            { column_name: 'person_id', parent_table_name: 'people', parent_column_name: 'id' }
          ], primary_key: 'id',
          table_friendly_name: 'Registrations', table_name: 'registrations'
        },
        {
          columns: [
            { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false, column_friendly_name: 'ID' },
            { column_name: 'first_name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false, column_friendly_name: 'First Name' }
          ],
          description: '', foreign_keys: [], primary_key: 'id',
          table_friendly_name: 'People', table_name: 'people'
        }
      ],
      root_tables: ['registrations'],
      nested_tables: [],
      display_templates: { people: '{first_name}' },
      fk_picker_preload_threshold: 50
    };

    spyOn(serverAccess, 'getFilteredTableRows').and.returnValue(of({
      sortedColumnNames: ['id', 'person_id'],
      dataTable: [['1', '42'], ['2', '43']],
      totalCount: 2
    }));
    spyOn(serverAccess, 'resolveFkDisplay').and.returnValue(of({
      resolved: { '42': 'Alice', '43': 'Bob' }
    }));

    component.tableName = 'registrations';
    fixture.detectChanges();
    schemaSubject.next(schemaWithFk);
    tick();
    fixture.detectChanges();

    expect(serverAccess.resolveFkDisplay).toHaveBeenCalledWith('people', ['42', '43']);
    expect(component.fkDisplayMap['person_id']).toEqual({ '42': 'Alice', '43': 'Bob' });
  }));

  it('should display resolved FK text in table cells', fakeAsync(() => {
    const schemaWithFk: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false, column_friendly_name: 'ID' },
          { column_name: 'person_id', type: 'INTEGER', primary_key: false, unique: false, nullable: false, column_friendly_name: 'Person' }
        ],
        description: '', foreign_keys: [
          { column_name: 'person_id', parent_table_name: 'people', parent_column_name: 'id' }
        ], primary_key: 'id',
        table_friendly_name: 'Registrations', table_name: 'registrations'
      }],
      root_tables: ['registrations'],
      nested_tables: [],
      display_templates: { people: '{first_name}' },
      fk_picker_preload_threshold: 50
    };

    spyOn(serverAccess, 'getFilteredTableRows').and.returnValue(of({
      sortedColumnNames: ['id', 'person_id'],
      dataTable: [['1', '42']],
      totalCount: 1
    }));
    spyOn(serverAccess, 'resolveFkDisplay').and.returnValue(of({
      resolved: { '42': 'Alice Smith' }
    }));

    component.tableName = 'registrations';
    fixture.detectChanges();
    schemaSubject.next(schemaWithFk);
    tick();
    fixture.detectChanges();

    const cells = fixture.nativeElement.querySelectorAll('td');
    const aliceCell = Array.from<Element>(cells).find((cell) =>
      (cell.textContent ?? '').trim() === 'Alice Smith'
    );
    expect(aliceCell).toBeTruthy();

    // Raw value should NOT appear
    const rawCell = Array.from<Element>(cells).find((cell) =>
      (cell.textContent ?? '').trim() === '42'
    );
    expect(rawCell).toBeFalsy();
  }));

  it('should use formatCellValue to resolve FK display text', () => {
    component.fkDisplayMap = {
      person_id: { '42': 'Alice', '43': 'Bob' }
    };
    const fkColumn = col({ column_name: 'person_id', html_input_type: 'text' });
    expect(component.formatCellValue(fkColumn, '42')).toBe('Alice');
    expect(component.formatCellValue(fkColumn, '43')).toBe('Bob');
  });

  it('should return raw value from formatCellValue when FK value is not resolved', () => {
    component.fkDisplayMap = {
      person_id: { '42': 'Alice' }
    };
    const fkColumn = col({ column_name: 'person_id', html_input_type: 'text' });
    expect(component.formatCellValue(fkColumn, '99')).toBe('99');
  });

  it('should not call resolveFkDisplay when table has no foreign keys', fakeAsync(() => {
    spyOn(serverAccess, 'resolveFkDisplay');

    component.tableName = 'classes';
    fixture.detectChanges();
    schemaSubject.next(mockSchema);
    tick();
    fixture.detectChanges();

    expect(serverAccess.resolveFkDisplay).not.toHaveBeenCalled();
  }));

  it('should show empty state when no data', fakeAsync(() => {
    // Create a schema with an empty table
    const emptySchema: DatabaseSchema = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false }
        ],
        description: '',
        foreign_keys: [],
        primary_key: 'id',
        table_friendly_name: 'Empty Table',
        table_name: 'empty_table'
      }],
      root_tables: ['empty_table'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };

    spyOn(serverAccess, 'getFilteredTableRows').and.returnValue(of({
      sortedColumnNames: ['id'],
      dataTable: [],
      totalCount: 0
    }));

    component.tableName = 'empty_table';
    fixture.detectChanges();
    schemaSubject.next(emptySchema);
    tick();
    fixture.detectChanges();

    expect(component.dataSource.length).toBe(0);
    const emptyEl = fixture.nativeElement.querySelector('.empty-container');
    expect(emptyEl).toBeTruthy();
  }));
});
