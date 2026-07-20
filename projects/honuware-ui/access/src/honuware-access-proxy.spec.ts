import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { HonuwareAccessProxy } from './honuware-access-proxy';

describe('HonuwareAccessProxy', () => {
  let proxy: HonuwareAccessProxy;
  let http: HttpTestingController;

  const emptySchema = { tables: [], root_tables: [], nested_tables: [], display_templates: {}, fk_picker_preload_threshold: 50 };
  const emptyRows = { sortedColumnNames: [], dataTable: [] };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    proxy = TestBed.inject(HonuwareAccessProxy);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('serializes requests: the second HTTP call does not fire until the first completes', () => {
    proxy.getDbSchema().subscribe();
    proxy.getTableRows('classes').subscribe();

    // Only the first request is in flight; the second is queued.
    expect(http.match('/api/get_table_rows/classes').length).toBe(0);
    const first = http.expectOne('/api/get_db_schema');

    first.flush(emptySchema);

    // Completing the first releases the second.
    const second = http.expectOne('/api/get_table_rows/classes');
    second.flush(emptyRows);
  });

  it('delegates across all three interfaces (crud + auth + photo) through the one queue', () => {
    let schemaSeen = false;
    proxy.getDbSchema().subscribe(() => (schemaSeen = true));
    proxy.me().subscribe();
    proxy.hasPhoto('classes', 1).subscribe();

    http.expectOne('/api/get_db_schema').flush(emptySchema);
    expect(schemaSeen).toBeTrue();
    http.expectOne('/api/me').flush(null);
    http.expectOne('/api/has_photo/classes/1').flush({ has_photo: false });
  });
});
