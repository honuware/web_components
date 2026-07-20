import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CrudAccess, AddItemBody, UpdateItemBody } from './crud-access';
import { DataResults, DataResultsWithCount } from './DataResults';
import { DatabaseSchema } from './DatabaseSchema';
import { FilterPair, FkOptionsResponse, FkDisplayResponse } from './admin.types';
import { HONUWARE_API_BASE } from './api-base';

// Default HttpClient implementation of the framework CRUD surface against the
// standard honuware endpoints. New consumers get this via
// provideHonuwareAccess() (wrapped in the serializing proxy); knottyyoga keeps
// its own ServerAccessNetwork. Endpoints mirror the app's network layer.
@Injectable({ providedIn: 'root' })
export class CrudHttpAccess implements CrudAccess {
  constructor(
    private http: HttpClient,
    @Inject(HONUWARE_API_BASE) private base: string,
  ) {}

  addItem(body: AddItemBody): Observable<void> {
    return this.http.post(`${this.base}/add_item`, body, { withCredentials: true }).pipe(map(() => void 0));
  }

  addItemFetchPrimaryKey(body: AddItemBody): Observable<string> {
    return this.http.post(`${this.base}/add_item_fetch_primary_key`, body, { withCredentials: true, responseType: 'text' }).pipe(
      map((response) => {
        const obj = JSON.parse(response);
        return obj[Object.keys(obj)[0]];
      })
    );
  }

  getTableRows(tableName: string): Observable<DataResults> {
    return this.http.get<DataResults>(`${this.base}/get_table_rows/${tableName}`, { withCredentials: true });
  }

  getRowsByColumn(
    tableName: string,
    columnName: string,
    ascending: boolean,
    pageSize: number,
    pageNumber: number
  ): Observable<DataResultsWithCount> {
    const asc = ascending ? 1 : 0;
    return this.http.get<DataResultsWithCount>(
      `${this.base}/get_rows_by_column/${tableName}/${columnName}/${asc}/${pageSize}/${pageNumber}`,
      { withCredentials: true }
    );
  }

  getFilteredTableRows(
    tableName: string,
    columnName: string,
    ascending: boolean,
    pageSize: number,
    page: number,
    filterPairs: FilterPair[]
  ): Observable<DataResultsWithCount> {
    return this.http.post<DataResultsWithCount>(`${this.base}/get_filtered_table_rows`, {
      table_name: tableName,
      column_name: columnName,
      asc: ascending,
      page_size: pageSize,
      page,
      filter_pairs: filterPairs,
    }, { withCredentials: true });
  }

  getRow(tableName: string, columnName: string, columnValue: string): Observable<DataResults> {
    return this.http.get<DataResults>(`${this.base}/get_row/${tableName}/${columnName}/${columnValue}`, { withCredentials: true });
  }

  getRowByValues(tableName: string, filterPairs: FilterPair[]): Observable<DataResults> {
    return this.http.post<DataResults>(`${this.base}/get_row_by_values`, {
      table_name: tableName,
      filter_pairs: filterPairs,
    }, { withCredentials: true });
  }

  updateItem(body: UpdateItemBody): Observable<void> {
    return this.http.post(`${this.base}/update_item`, body, { withCredentials: true }).pipe(map(() => void 0));
  }

  deleteItem(tableName: string, columnName: string, columnValue: string): Observable<void> {
    return this.http.get(`${this.base}/delete_item/${tableName}/${columnName}/${columnValue}`, { withCredentials: true })
      .pipe(map(() => void 0));
  }

  getDbSchema(): Observable<DatabaseSchema> {
    return this.http.get<DatabaseSchema>(`${this.base}/get_db_schema`, { withCredentials: true });
  }

  getFkOptions(tableName: string, searchText: string, pageSize: number): Observable<FkOptionsResponse> {
    return this.http.post<FkOptionsResponse>(`${this.base}/get_fk_options`, {
      table_name: tableName,
      search_text: searchText,
      page_size: pageSize,
    }, { withCredentials: true });
  }

  resolveFkDisplay(parentTableName: string, values: string[]): Observable<FkDisplayResponse> {
    return this.http.post<FkDisplayResponse>(`${this.base}/resolve_fk_display`, {
      parent_table_name: parentTableName,
      values,
    }, { withCredentials: true });
  }
}
