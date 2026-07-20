import { Observable, of } from 'rxjs';
import {
  CrudAccess,
  AddItemBody,
  UpdateItemBody,
  DataResults,
  DataResultsWithCount,
  DatabaseSchema,
  TableSchema,
  FilterPair,
  FkOptionsResponse,
  FkDisplayResponse,
} from '@honuware/ui/access';

/** A stored row: a column-name → string-value map. */
export type MockRow = Record<string, string>;

export interface MockCrudAccessOptions {
  /** The schema this store honors (columns, primary keys, FK display templates). */
  schema?: DatabaseSchema;
  /** Seed rows keyed by table name. */
  seedRows?: Record<string, MockRow[]>;
}

const EMPTY_SCHEMA: DatabaseSchema = {
  root_tables: [],
  nested_tables: [],
  tables: [],
  display_templates: {},
  fk_picker_preload_threshold: 50,
};

/**
 * In-memory, schema-driven {@link CrudAccess} for library/consumer tests. Honors
 * a supplied {@link DatabaseSchema} (columns, primary keys, FK display
 * templates) and keeps rows per table. Deterministic and dependency-free — the
 * framework counterpart to the app's ServerAccessMock, but only the 12 generic
 * CRUD methods.
 */
export class MockCrudAccess implements CrudAccess {
  private readonly schema: DatabaseSchema;
  private readonly rows = new Map<string, MockRow[]>();
  private readonly pkCounters = new Map<string, number>();

  constructor(options: MockCrudAccessOptions = {}) {
    this.schema = options.schema ?? EMPTY_SCHEMA;
    for (const [table, rows] of Object.entries(options.seedRows ?? {})) {
      this.rows.set(table, rows.map((row) => ({ ...row })));
    }
  }

  getDbSchema(): Observable<DatabaseSchema> {
    return of(this.schema);
  }

  getTableRows(tableName: string): Observable<DataResults> {
    return of(this.toDataResults(tableName, this.tableRows(tableName)));
  }

  getRowsByColumn(
    tableName: string,
    columnName: string,
    ascending: boolean,
    pageSize: number,
    pageNumber: number,
  ): Observable<DataResultsWithCount> {
    const sorted = this.sorted(this.tableRows(tableName), columnName, ascending);
    return of(this.paginate(tableName, sorted, pageSize, pageNumber));
  }

  getFilteredTableRows(
    tableName: string,
    columnName: string,
    ascending: boolean,
    pageSize: number,
    page: number,
    filterPairs: FilterPair[],
  ): Observable<DataResultsWithCount> {
    const filtered = this.applyFilters(this.tableRows(tableName), filterPairs);
    return of(this.paginate(tableName, this.sorted(filtered, columnName, ascending), pageSize, page));
  }

  getRow(tableName: string, columnName: string, columnValue: string): Observable<DataResults> {
    const matches = this.tableRows(tableName).filter((row) => row[columnName] === columnValue);
    return of(this.toDataResults(tableName, matches));
  }

  getRowByValues(tableName: string, filterPairs: FilterPair[]): Observable<DataResults> {
    return of(this.toDataResults(tableName, this.applyFilters(this.tableRows(tableName), filterPairs)));
  }

  addItem(body: AddItemBody): Observable<void> {
    this.insert(body.table_name, body.value as MockRow);
    return of(void 0);
  }

  addItemFetchPrimaryKey(body: AddItemBody): Observable<string> {
    return of(this.insert(body.table_name, body.value as MockRow));
  }

  updateItem(body: UpdateItemBody): Observable<void> {
    for (const row of this.tableRows(body.table_name)) {
      if (row[body.column_name] === body.column_value) {
        Object.assign(row, body.value as MockRow);
      }
    }
    return of(void 0);
  }

  deleteItem(tableName: string, columnName: string, columnValue: string): Observable<void> {
    this.rows.set(
      tableName,
      this.tableRows(tableName).filter((row) => row[columnName] !== columnValue),
    );
    return of(void 0);
  }

  getFkOptions(tableName: string, searchText: string, pageSize: number): Observable<FkOptionsResponse> {
    const primaryKey = this.tableSchema(tableName)?.primary_key ?? 'id';
    const template = this.schema.display_templates[tableName];
    const options = this.tableRows(tableName).map((row) => ({
      value: row[primaryKey] ?? '',
      display: this.renderTemplate(template, row) || (row[primaryKey] ?? ''),
    }));
    const search = searchText.toLowerCase();
    const matching = search ? options.filter((o) => o.display.toLowerCase().includes(search)) : options;
    return of({ total_count: matching.length, options: matching.slice(0, pageSize) });
  }

  resolveFkDisplay(parentTableName: string, values: string[]): Observable<FkDisplayResponse> {
    const primaryKey = this.tableSchema(parentTableName)?.primary_key ?? 'id';
    const template = this.schema.display_templates[parentTableName];
    const resolved: Record<string, string> = {};
    for (const value of values) {
      const row = this.tableRows(parentTableName).find((r) => r[primaryKey] === value);
      resolved[value] = row ? this.renderTemplate(template, row) || value : value;
    }
    return of({ resolved });
  }

  // --- internals ---

  private tableSchema(tableName: string): TableSchema | undefined {
    return this.schema.tables.find((t) => t.table_name === tableName);
  }

  private columnNames(tableName: string): string[] {
    const table = this.tableSchema(tableName);
    if (table) return table.columns.map((c) => c.column_name);
    const rows = this.rows.get(tableName) ?? [];
    return rows.length ? Object.keys(rows[0]) : [];
  }

  private tableRows(tableName: string): MockRow[] {
    let rows = this.rows.get(tableName);
    if (!rows) {
      rows = [];
      this.rows.set(tableName, rows);
    }
    return rows;
  }

  private toDataResults(tableName: string, rows: MockRow[]): DataResults {
    const columns = this.columnNames(tableName);
    return {
      sortedColumnNames: columns,
      dataTable: rows.map((row) => columns.map((c) => row[c] ?? '')),
    };
  }

  private insert(tableName: string, value: MockRow): string {
    const rows = this.tableRows(tableName);
    const primaryKey = this.tableSchema(tableName)?.primary_key ?? 'id';
    const row: MockRow = { ...value };
    if (!row[primaryKey]) row[primaryKey] = this.nextPrimaryKey(tableName, rows, primaryKey);
    rows.push(row);
    return row[primaryKey];
  }

  private nextPrimaryKey(tableName: string, rows: MockRow[], primaryKey: string): string {
    let counter = this.pkCounters.get(tableName);
    if (counter === undefined) {
      counter = rows.reduce((max, row) => Math.max(max, Number(row[primaryKey]) || 0), 0);
    }
    counter += 1;
    this.pkCounters.set(tableName, counter);
    return String(counter);
  }

  private applyFilters(rows: MockRow[], filterPairs: FilterPair[]): MockRow[] {
    if (!filterPairs.length) return rows;
    return rows.filter((row) => filterPairs.every((f) => row[f.column_name] === f.column_value));
  }

  private sorted(rows: MockRow[], columnName: string, ascending: boolean): MockRow[] {
    if (!columnName) return rows;
    const sorted = [...rows].sort((a, b) => (a[columnName] ?? '').localeCompare(b[columnName] ?? ''));
    return ascending ? sorted : sorted.reverse();
  }

  private paginate(tableName: string, rows: MockRow[], pageSize: number, page: number): DataResultsWithCount {
    const pageRows = pageSize > 0 ? rows.slice(page * pageSize, page * pageSize + pageSize) : rows;
    return { ...this.toDataResults(tableName, pageRows), totalCount: rows.length };
  }

  private renderTemplate(template: string | undefined, row: MockRow): string {
    if (!template) return '';
    let result = template;
    for (const [key, value] of Object.entries(row)) {
      result = result.split(`{${key}}`).join(value);
    }
    return result;
  }
}
