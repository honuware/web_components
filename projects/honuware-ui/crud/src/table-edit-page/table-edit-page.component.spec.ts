import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { TableEditPageComponent } from './table-edit-page.component';
import { DatabaseSchemaService } from '../database-schema.service';
import { HONUWARE_CRUD_ACCESS } from '@honuware/ui/access';

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

describe('TableEditPageComponent', () => {
  let component: TableEditPageComponent;
  let fixture: ComponentFixture<TableEditPageComponent>;

  const mockSchema = {
    tables: [{
      columns: [
        { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
        { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false }
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
      imports: [TableEditPageComponent, RouterTestingModule],
      providers: [
        { provide: HONUWARE_CRUD_ACCESS, useValue: makeCrudFake() },
        { provide: DatabaseSchemaService, useValue: dbSchemaService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ tableName: 'test', id: '1' }),
            queryParams: of({ returnUrl: '/admin/tables/test/view/10/0' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TableEditPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should extract route params and load schema', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.tableName).toBe('test');
    expect(component.primaryKeyValue).toBe('1');
    expect(component.returnUrl).toBe('/admin/tables/test/view/10/0');
    expect(component.tableFriendlyName).toBe('Test Table');
    expect(component.columnNames).toEqual(['id', 'name']);
    expect(component.loading).toBeFalse();
  }));

  it('should show error for non-existent table', fakeAsync(() => {
    TestBed.resetTestingModule();

    const dbSchemaService = jasmine.createSpyObj('DatabaseSchemaService', ['GetDBSchema']);
    dbSchemaService.GetDBSchema.and.returnValue(of(mockSchema));

    TestBed.configureTestingModule({
      imports: [TableEditPageComponent, RouterTestingModule],
      providers: [
        { provide: HONUWARE_CRUD_ACCESS, useValue: makeCrudFake() },
        { provide: DatabaseSchemaService, useValue: dbSchemaService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ tableName: 'nonexistent', id: '1' }),
            queryParams: of({})
          }
        }
      ]
    });

    fixture = TestBed.createComponent(TableEditPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();

    expect(component.error).toContain('not found');
    expect(component.loading).toBeFalse();
  }));
});
