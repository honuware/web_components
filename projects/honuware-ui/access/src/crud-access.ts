import { Observable } from 'rxjs';
import { DataResults, DataResultsWithCount } from './DataResults';
import { DatabaseSchema } from './DatabaseSchema';
import {
  FilterPair,
  FkOptionsResponse,
  FkDisplayResponse,
} from './admin.types';

// The framework-generic table CRUD + schema + FK-picker surface of the server
// (honuware_platform's generic endpoints). Components/services that only need
// generic data access inject HONUWARE_CRUD_ACCESS (see access-tokens.ts)
// instead of the full ~250-method ServerAccess. Signatures are verbatim from
// ServerAccess, which extends this interface — the compiler enforces that the
// app implementation stays a superset.

export interface AddItemBody {
  table_name: string;
  value: unknown; // Object with key value pairs to insert into database
}

export interface UpdateItemBody {
  table_name: string;
  value: unknown; // Object with key value pairs to insert into database
  column_name: string; // Name of column to update by
  column_value: string; // Name of column
}

export interface CrudAccess {
  addItem(body: AddItemBody): Observable<void>;
  addItemFetchPrimaryKey(body: AddItemBody): Observable<string>;
  getTableRows(tableName: string): Observable<DataResults>;
  getRowsByColumn(
    tableName: string,
    columnName: string,
    ascending: boolean,
    pageSize: number,
    pageNumber: number
  ): Observable<DataResultsWithCount>;
  getFilteredTableRows(
    tableName: string,
    columnName: string,
    ascending: boolean,
    pageSize: number,
    page: number,
    filterPairs: FilterPair[]
  ): Observable<DataResultsWithCount>;
  getRow(
    tableName: string,
    columnName: string,
    columnValue: string
  ): Observable<DataResults>;
  getRowByValues(
    tableName: string,
    filterPairs: FilterPair[]
  ): Observable<DataResults>;
  updateItem(body: UpdateItemBody): Observable<void>;
  deleteItem(tableName: string, columnName: string, columnValue: string): Observable<void>;
  getDbSchema(): Observable<DatabaseSchema>;
  getFkOptions(tableName: string, searchText: string, pageSize: number): Observable<FkOptionsResponse>;
  resolveFkDisplay(parentTableName: string, values: string[]): Observable<FkDisplayResponse>;
}
