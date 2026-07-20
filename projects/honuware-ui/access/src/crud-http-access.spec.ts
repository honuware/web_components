import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CrudHttpAccess } from './crud-http-access';

describe('CrudHttpAccess', () => {
  let svc: CrudHttpAccess;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CrudHttpAccess],
    });
    svc = TestBed.inject(CrudHttpAccess);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getDbSchema GETs /api/get_db_schema with credentials', () => {
    svc.getDbSchema().subscribe();
    const req = http.expectOne('/api/get_db_schema');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ tables: [], root_tables: [], nested_tables: [], display_templates: {}, fk_picker_preload_threshold: 50 });
  });

  it('addItem POSTs /api/add_item with the body', () => {
    svc.addItem({ table_name: 'classes', value: { name: 'X' } }).subscribe();
    const req = http.expectOne('/api/add_item');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ table_name: 'classes', value: { name: 'X' } });
    req.flush(null);
  });

  it('addItemFetchPrimaryKey returns the first field of the parsed text response', () => {
    let result: string | undefined;
    svc.addItemFetchPrimaryKey({ table_name: 'classes', value: {} }).subscribe(v => (result = v));
    const req = http.expectOne('/api/add_item_fetch_primary_key');
    expect(req.request.responseType).toBe('text');
    req.flush(JSON.stringify({ id: '42' }));
    expect(result).toBe('42');
  });

  it('getFkOptions POSTs the search body', () => {
    svc.getFkOptions('people', 'ali', 20).subscribe();
    const req = http.expectOne('/api/get_fk_options');
    expect(req.request.body).toEqual({ table_name: 'people', search_text: 'ali', page_size: 20 });
    req.flush({ total_count: 0, options: [] });
  });

  it('deleteItem GETs the delete_item path', () => {
    svc.deleteItem('classes', 'id', '3').subscribe();
    const req = http.expectOne('/api/delete_item/classes/id/3');
    expect(req.request.method).toBe('GET');
    req.flush(null);
  });

  it('getRowsByColumn encodes ascending as 1/0 in the path', () => {
    svc.getRowsByColumn('classes', 'id', false, 10, 2).subscribe();
    const req = http.expectOne('/api/get_rows_by_column/classes/id/0/10/2');
    expect(req.request.method).toBe('GET');
    req.flush({ sortedColumnNames: [], dataTable: [], totalCount: 0 });
  });
});
