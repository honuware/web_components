import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject, Observable, Subject, of, throwError } from 'rxjs';

import { DatabaseSchemaService } from './database-schema.service';
import { CrudAccess, HONUWARE_CRUD_ACCESS, DatabaseSchema } from '@honuware/ui/access';
import { AuthService, AuthData } from '@honuware/ui/auth';

// This spec was missing before the CRUD editor moved into the crud layer
// (Phase 1.6). It pins the three load-bearing behaviors: a cache that avoids
// refetching, retry-after-timeout polling on failure, and a refetch when the
// auth identity flips (the service keeps schema in lock-step with login state).
describe('DatabaseSchemaService', () => {
  let crudAccess: jasmine.SpyObj<CrudAccess>;
  let authData$: BehaviorSubject<AuthData>;

  const mockSchema: DatabaseSchema = {
    tables: [],
    root_tables: [],
    nested_tables: [],
    display_templates: {},
    fk_picker_preload_threshold: 50,
  };

  function authed(): AuthData {
    return {
      isAuth: true, personId: 1, firstName: 'A', lastName: 'B', email: 'a@b.c',
      createdAt: '0', isAdmin: false, roles: [], permissions: [], mustChangePassword: false,
    };
  }

  // `getDbSchema` is a callFake so a test can vary the response per call
  // (e.g. fail the first attempts, then succeed on the retry).
  function configure(getDbSchema: () => Observable<DatabaseSchema> = () => of(mockSchema)): void {
    crudAccess = jasmine.createSpyObj<CrudAccess>('CrudAccess', ['getDbSchema']);
    crudAccess.getDbSchema.and.callFake(getDbSchema);
    authData$ = new BehaviorSubject<AuthData>({ isAuth: false });
    TestBed.configureTestingModule({
      providers: [
        { provide: HONUWARE_CRUD_ACCESS, useValue: crudAccess },
        { provide: AuthService, useValue: { authData$: authData$.asObservable() } },
      ],
    });
  }

  it('caches the schema after the first successful fetch (no refetch on GetDBSchema)', () => {
    configure();
    const service = TestBed.inject(DatabaseSchemaService);
    const callsAfterInit = crudAccess.getDbSchema.calls.count();

    let result: DatabaseSchema | undefined;
    service.GetDBSchema().subscribe(s => (result = s));

    expect(result).toBe(mockSchema);
    // Served from cache — no additional getDbSchema call.
    expect(crudAccess.getDbSchema.calls.count()).toBe(callsAfterInit);
  });

  it('refetches the schema when the auth identity changes', () => {
    configure();
    TestBed.inject(DatabaseSchemaService);
    const before = crudAccess.getDbSchema.calls.count();

    authData$.next(authed()); // isAuth false → true

    expect(crudAccess.getDbSchema.calls.count()).toBe(before + 1);
  });

  it('does not refetch when the auth identity is unchanged', () => {
    configure();
    TestBed.inject(DatabaseSchemaService);
    const before = crudAccess.getDbSchema.calls.count();

    // Same isAuth value → distinctUntilChanged suppresses the refresh.
    authData$.next({ isAuth: false });

    expect(crudAccess.getDbSchema.calls.count()).toBe(before);
  });

  it('retries after the timeout when a fetch fails', fakeAsync(() => {
    let attempt = 0;
    // Both construction-time fetches (polling + auth-initial refresh) fail;
    // the timer-scheduled retry succeeds.
    configure(() => (attempt++ < 2 ? throwError(() => new Error('down')) : of(mockSchema)));
    const service = TestBed.inject(DatabaseSchemaService);

    let result: DatabaseSchema | undefined;
    service.GetDBSchema().subscribe(s => (result = s));
    expect(result).withContext('still waiting after the failed attempts').toBeUndefined();

    tick(6000); // retry timer fires
    expect(result).toBe(mockSchema);
  }));

  it('GetDBSchema waits for the schema when none is cached yet', () => {
    const pending = new Subject<DatabaseSchema>();
    configure(() => pending);
    const service = TestBed.inject(DatabaseSchemaService);

    let result: DatabaseSchema | undefined;
    service.GetDBSchema().subscribe(s => (result = s));
    expect(result).toBeUndefined();

    pending.next(mockSchema);
    expect(result).toBe(mockSchema);
  });
});
