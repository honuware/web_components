import { Injectable, Inject, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, Subscription, timer, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, take, tap } from 'rxjs/operators';
import { CrudAccess, HONUWARE_CRUD_ACCESS, DatabaseSchema } from '@honuware/ui/access';
import { AuthService } from '@honuware/ui/auth';

@Injectable({
  providedIn: 'root'
})
export class DatabaseSchemaService {
  private _schema?: DatabaseSchema;
  private _schemaSubject = new BehaviorSubject<DatabaseSchema | undefined>(undefined);
  private _refreshSub?: Subscription;
  private _fetchInProgress = false;
  private _retryTimeoutMs: number = 6000; // configurable timeout
  private readonly destroyRef = inject(DestroyRef);

  public readonly schema$: Observable<DatabaseSchema | undefined> = this._schemaSubject.asObservable();

  constructor(
    @Inject(HONUWARE_CRUD_ACCESS) private crudAccess: CrudAccess,
    private authService: AuthService
  ) {
    this.startSchemaPolling();

    this.authService.authData$.pipe(
      map(authData => authData.isAuth),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.refreshSchema();
    });
  }

  private startSchemaPolling(): void {
    this.tryFetchSchema();
  }

  public refreshSchema(): void {
    this._schema = undefined;
    this._schemaSubject.next(undefined);
    this.tryFetchSchema();
  }

  private tryFetchSchema(): void {
    if (this._fetchInProgress) return;

    this._refreshSub?.unsubscribe();
    this._fetchInProgress = true;

    this._refreshSub = this.crudAccess.getDbSchema().pipe(
      tap(schema => {
        this._schema = schema;
        this._schemaSubject.next(schema);
        this._fetchInProgress = false;
        this._refreshSub?.unsubscribe(); // Stop further polling
        this._refreshSub = undefined;
      }),
      catchError(() => {
        this._fetchInProgress = false;
        // Schedule retry after timeout
        this._refreshSub = timer(this._retryTimeoutMs).subscribe(() => this.tryFetchSchema());
        return of(undefined);
      })
    ).subscribe();
  }

  /**
   * Returns the cached DatabaseSchema if present, otherwise waits for a successful fetch.
   */
  public GetDBSchema(): Observable<DatabaseSchema> {
    if (this._schema) {
      return of(this._schema);
    }
    // Wait for the schema to be available
    return this.schema$.pipe(
      filter((schema): schema is DatabaseSchema => !!schema),
      take(1)
    );
  }
}
