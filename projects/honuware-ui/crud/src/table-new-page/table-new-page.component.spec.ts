import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { TableNewPageComponent } from './table-new-page.component';
import { DatabaseSchemaService } from '../database-schema.service';
import { HONUWARE_CRUD_ACCESS, CrudFormAssist } from '@honuware/ui/access';

// Minimal CrudAccess fake for the embedded composite-row-control — benign empty
// results, since these page specs assert route/schema plumbing, not row data.
function makeCrudFake() {
  const empty = { sortedColumnNames: [], dataTable: [], totalCount: 0 };
  return {
    getFilteredTableRows: () => of(empty),
    getRowByValues: () => of(empty),
    resolveFkDisplay: () => of({ resolved: {} }),
    getFkOptions: () => of({ total_count: 0, options: [] }),
    deleteItem: () => of(void 0),
  };
}

describe('TableNewPageComponent', () => {
  let component: TableNewPageComponent;
  let fixture: ComponentFixture<TableNewPageComponent>;

  const mockSchema = {
    tables: [{
      columns: [
        { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
        { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false },
        { column_name: 'description', type: 'TEXT', primary_key: false, unique: false, nullable: true }
      ],
      description: '',
      foreign_keys: [],
      primary_key: 'id',
      table_friendly_name: 'Test Table',
      table_name: 'test'
    }],
    root_tables: ['test'],
    nested_tables: [],
    display_templates: {},
    fk_picker_preload_threshold: 50
  };

  beforeEach(async () => {
    const dbSchemaService = jasmine.createSpyObj('DatabaseSchemaService', ['GetDBSchema']);
    dbSchemaService.GetDBSchema.and.returnValue(of(mockSchema));

    await TestBed.configureTestingModule({
      imports: [TableNewPageComponent, RouterTestingModule],
      providers: [
        { provide: HONUWARE_CRUD_ACCESS, useValue: makeCrudFake() },
        { provide: DatabaseSchemaService, useValue: dbSchemaService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ tableName: 'test' }),
            queryParams: of({ returnUrl: '/admin/tables/test/view/10/0' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TableNewPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should extract route params and load schema', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.tableName).toBe('test');
    expect(component.returnUrl).toBe('/admin/tables/test/view/10/0');
    expect(component.tableFriendlyName).toBe('Test Table');
    expect(component.loading).toBeFalse();
  }));

  it('should exclude primary key column from columnNames', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    // Primary key 'id' should be excluded
    expect(component.columnNames).toEqual(['name', 'description']);
    expect(component.columnNames).not.toContain('id');
  }));

  it('should exclude primary key column when primary_key is string "t" from server', fakeAsync(() => {
    TestBed.resetTestingModule();

    const schemaWithStringPk = {
      tables: [{
        columns: [
          { column_name: 'id', type: 'SERIAL', primary_key: 't' as unknown as boolean, unique: false, nullable: false },
          { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false },
          { column_name: 'description', type: 'TEXT', primary_key: false, unique: false, nullable: true }
        ],
        description: '',
        foreign_keys: [],
        primary_key: 'id',
        table_friendly_name: 'String PK Table',
        table_name: 'string_pk'
      }],
      root_tables: ['string_pk'],
      nested_tables: [],
      display_templates: {},
      fk_picker_preload_threshold: 50
    };

    const dbSchemaService = jasmine.createSpyObj('DatabaseSchemaService', ['GetDBSchema']);
    dbSchemaService.GetDBSchema.and.returnValue(of(schemaWithStringPk));

    TestBed.configureTestingModule({
      imports: [TableNewPageComponent, RouterTestingModule],
      providers: [
        { provide: HONUWARE_CRUD_ACCESS, useValue: makeCrudFake() },
        { provide: DatabaseSchemaService, useValue: dbSchemaService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ tableName: 'string_pk' }),
            queryParams: of({ returnUrl: '/admin/tables/string_pk/view/10/0' })
          }
        }
      ]
    });

    fixture = TestBed.createComponent(TableNewPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();

    expect(component.columnNames).toEqual(['name', 'description']);
    expect(component.columnNames).not.toContain('id');
  }));

  it('should show error for non-existent table', fakeAsync(() => {
    TestBed.resetTestingModule();

    const dbSchemaService = jasmine.createSpyObj('DatabaseSchemaService', ['GetDBSchema']);
    dbSchemaService.GetDBSchema.and.returnValue(of(mockSchema));

    TestBed.configureTestingModule({
      imports: [TableNewPageComponent, RouterTestingModule],
      providers: [
        { provide: HONUWARE_CRUD_ACCESS, useValue: makeCrudFake() },
        { provide: DatabaseSchemaService, useValue: dbSchemaService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ tableName: 'nonexistent' }),
            queryParams: of({})
          }
        }
      ]
    });

    fixture = TestBed.createComponent(TableNewPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();

    expect(component.error).toContain('not found');
    expect(component.loading).toBeFalse();
  }));

  it('should read formAssist from history.state', fakeAsync(() => {
    const formAssist: CrudFormAssist = {
      defaults: { capacity: '20' },
      computedDates: [{
        source: 'start_time_us',
        dest: 'end_time_us',
        offsetMinutes: 60,
        autoByDefault: true,
      }],
    };

    // Simulate Angular's route state by pushing to history
    history.pushState({ formAssist }, '');

    TestBed.resetTestingModule();

    const dbSchemaService = jasmine.createSpyObj('DatabaseSchemaService', ['GetDBSchema']);
    dbSchemaService.GetDBSchema.and.returnValue(of(mockSchema));

    TestBed.configureTestingModule({
      imports: [TableNewPageComponent, RouterTestingModule],
      providers: [
        { provide: HONUWARE_CRUD_ACCESS, useValue: makeCrudFake() },
        { provide: DatabaseSchemaService, useValue: dbSchemaService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ tableName: 'test' }),
            queryParams: of({ returnUrl: '/test' })
          }
        }
      ]
    });

    fixture = TestBed.createComponent(TableNewPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();

    expect(component.formAssist).toBeDefined();
    expect(component.formAssist!.defaults).toEqual({ capacity: '20' });
    expect(component.formAssist!.computedDates!.length).toBe(1);
    expect(component.formAssist!.computedDates![0].offsetMinutes).toBe(60);

    // Clean up history state
    history.pushState({}, '');
  }));
});
