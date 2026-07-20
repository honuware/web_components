import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { TableViewPageComponent } from './table-view-page.component';
import { DatabaseSchemaService } from '../database-schema.service';
import { HONUWARE_CRUD_ACCESS } from '@honuware/ui/access';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';

// Minimal CrudAccess fake for the embedded table-view-control — benign empty
// results, since these page specs assert route/schema plumbing, not grid data.
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

describe('TableViewPageComponent', () => {
  let component: TableViewPageComponent;
  let fixture: ComponentFixture<TableViewPageComponent>;

  const mockSchema = {
    tables: [{
      columns: [
        { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false }
      ],
      description: '',
      foreign_keys: [],
      primary_key: 'id',
      table_friendly_name: 'Test',
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
      imports: [TableViewPageComponent, NoopAnimationsModule, MatDialogModule, RouterTestingModule],
      providers: [
        { provide: HONUWARE_CRUD_ACCESS, useValue: makeCrudFake() },
        { provide: DatabaseSchemaService, useValue: dbSchemaService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ tableName: 'test', pageSize: '10', pageOffset: '0' }),
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TableViewPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should extract route params', () => {
    fixture.detectChanges();
    expect(component.tableName).toBe('test');
    expect(component.pageSize).toBe(10);
    expect(component.pageOffset).toBe(0);
    expect(component.bindingStack).toEqual([]);
  });

  it('should parse ctx query param into bindingStack', async () => {
    const dbSchemaService = jasmine.createSpyObj('DatabaseSchemaService', ['GetDBSchema']);
    dbSchemaService.GetDBSchema.and.returnValue(of(mockSchema));

    await TestBed.resetTestingModule().configureTestingModule({
      imports: [TableViewPageComponent, NoopAnimationsModule, MatDialogModule, RouterTestingModule],
      providers: [
        { provide: HONUWARE_CRUD_ACCESS, useValue: makeCrudFake() },
        { provide: DatabaseSchemaService, useValue: dbSchemaService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ tableName: 'test', pageSize: '10', pageOffset: '0' }),
            queryParams: of({ ctx: 'people:person_id:42' })
          }
        }
      ]
    }).compileComponents();

    const f = TestBed.createComponent(TableViewPageComponent);
    f.detectChanges();

    expect(f.componentInstance.bindingStack).toEqual([
      { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' }
    ]);
  });
});
