import { Component, Input, OnInit, OnChanges, SimpleChanges, Inject } from '@angular/core';

import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { DatabaseSchemaService } from '../database-schema.service';
import {
  CrudAccess, HONUWARE_CRUD_ACCESS, PhotoUrlBuilder,
  DatabaseSchema, TableSchema, ColumnDataInfo, ForeignKeyInfo, TableBinding,
} from '@honuware/ui/access';
import { CRUD_EDITOR_ROUTES, CrudEditorRoutes } from '../crud-editor-routes';
import { from } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';
import { serializeBindingStack, deriveFilterPairs } from '../table-binding.utils';
import { ConfirmDialogComponent } from '@honuware/ui/foundation';
import { formatMicroseconds, isMicrosecondTimestamp } from '@honuware/ui/foundation';

export interface ChildTableReference {
  childTableName: string;
  childTableFriendlyName: string;
  foreignKey: ForeignKeyInfo;
}

@Component({
  selector: 'hw-table-view-control',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSelectModule,
    MatFormFieldModule
],
  templateUrl: './table-view-control.component.html',
  styleUrls: ['./table-view-control.component.scss']
})
export class TableViewControlComponent implements OnInit, OnChanges {
  @Input() tableName!: string;
  @Input() pageSize: number = 10;
  @Input() pageOffset: number = 0;
  @Input() sortColumn?: string;
  @Input() sortAscending: boolean = true;
  @Input() bindingStack: TableBinding[] = [];

  databaseSchema?: DatabaseSchema;
  tableSchema?: TableSchema;
  columns: ColumnDataInfo[] = [];
  displayedColumns: string[] = [];
  dataSource: Record<string, string>[] = [];
  totalCount: number = 0;
  loading: boolean = true;
  error?: string;
  childTableReferences: ChildTableReference[] = [];
  /** Maps column_name → pk_value → display_text for FK columns. */
  fkDisplayMap: Record<string, Record<string, string>> = {};

  pageSizeOptions: number[] = [5, 10, 20, 30, 50, 100];

  constructor(
    private dbSchemaService: DatabaseSchemaService,
    @Inject(HONUWARE_CRUD_ACCESS) private crudAccess: CrudAccess,
    private photoUrlBuilder: PhotoUrlBuilder,
    @Inject(CRUD_EDITOR_ROUTES) private editorRoutes: CrudEditorRoutes,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tableName'] || changes['pageSize'] || changes['pageOffset'] ||
        changes['sortColumn'] || changes['sortAscending'] || changes['bindingStack']) {
      if (!changes['tableName']?.firstChange) {
        this.loadData();
      }
    }
  }

  private loadData(): void {
    this.loading = true;
    this.error = undefined;

    this.dbSchemaService.GetDBSchema().subscribe({
      next: (schema) => {
        this.databaseSchema = schema;
        this.tableSchema = schema.tables.find(t => t.table_name === this.tableName);
        if (!this.tableSchema) {
          this.error = `Table "${this.tableName}" not found in schema`;
          this.loading = false;
          return;
        }

        this.columns = this.tableSchema.columns.filter(c => !this.isTrueValue(c.hidden));
        // Display actions column first, then photo column if supported, then data columns
        const photoColumn = this.hasPhotoSupport ? ['photo'] : [];
        this.displayedColumns = ['actions'].concat(photoColumn, this.columns.map(c => c.column_name));

        // Compute child table references
        this.childTableReferences = this.getChildTableReferences(schema);

        // Derive filter pairs from binding stack + FK info
        const filterPairs = deriveFilterPairs(this.tableSchema, this.bindingStack);

        // Use primary key as default sort column if not specified
        const sortCol = this.sortColumn || this.tableSchema.primary_key;

        this.crudAccess.getFilteredTableRows(
          this.tableName,
          sortCol,
          this.sortAscending,
          this.pageSize,
          this.pageOffset,
          filterPairs
        ).subscribe({
          next: (result) => {
            this.totalCount = result.totalCount;
            // Convert dataTable array to array of objects
            this.dataSource = result.dataTable.map(row => {
              const obj: Record<string, string> = {};
              result.sortedColumnNames.forEach((colName, idx) => {
                obj[colName] = row[idx];
              });
              return obj;
            });
            this.resolveFkDisplayValues();
          },
          error: (err) => {
            this.error = 'Failed to load data';
            this.loading = false;
            console.error('Error loading table data:', err);
          }
        });
      },
      error: (err) => {
        this.error = 'Failed to load schema';
        this.loading = false;
        console.error('Error loading schema:', err);
      }
    });
  }

  private getChildTableReferences(schema: DatabaseSchema): ChildTableReference[] {
    const refs: ChildTableReference[] = [];
    for (const nestedTableName of schema.nested_tables) {
      const childSchema = schema.tables.find(t => t.table_name === nestedTableName);
      if (!childSchema) continue;
      for (const fk of childSchema.foreign_keys) {
        if (fk.parent_table_name === this.tableName) {
          refs.push({
            childTableName: nestedTableName,
            childTableFriendlyName: childSchema.table_friendly_name || nestedTableName,
            foreignKey: fk,
          });
        }
      }
    }
    return refs;
  }

  private resolveFkDisplayValues(): void {
    if (!this.tableSchema || this.tableSchema.foreign_keys.length === 0) {
      this.loading = false;
      return;
    }

    const fkEntries: { colName: string; parentTable: string; values: string[] }[] = [];

    for (const fk of this.tableSchema.foreign_keys) {
      const uniqueValues = [...new Set(
        this.dataSource
          .map(row => row[fk.column_name])
          .filter(v => !!v)
      )];
      if (uniqueValues.length === 0) continue;
      fkEntries.push({
        colName: fk.column_name,
        parentTable: fk.parent_table_name,
        values: uniqueValues,
      });
    }

    if (fkEntries.length === 0) {
      this.loading = false;
      return;
    }

    // Process sequentially to avoid concurrent transaction errors on the server
    from(fkEntries).pipe(
      concatMap(entry =>
        this.crudAccess.resolveFkDisplay(entry.parentTable, entry.values).pipe(
          tap(response => {
            this.fkDisplayMap[entry.colName] = response.resolved;
          })
        )
      )
    ).subscribe({
      complete: () => {
        this.loading = false;
      },
      error: (err) => {
        console.error('FK display resolution failed:', err);
        this.loading = false;
      }
    });
  }

  onNavigateToChild(ref: ChildTableReference, row: Record<string, string>): void {
    const primaryKeyValue = this.getPrimaryKeyValue(row);
    if (!primaryKeyValue || !this.tableSchema) return;

    const newStack: TableBinding[] = [
      ...this.bindingStack,
      {
        tableName: this.tableName,
        primaryKeyName: this.tableSchema.primary_key,
        primaryKeyValue,
      }
    ];

    this.router.navigate(
      [this.editorRoutes.basePath, ref.childTableName, 'view', this.pageSize, 0],
      { queryParams: { ctx: serializeBindingStack(newStack) } }
    );
  }

  private isTrueValue(value: boolean | undefined): boolean {
    return value === true || (value as unknown) === 't';
  }

  formatCellValue(column: ColumnDataInfo, value: string): string {
    if (!value) return value;
    // Check FK display map first
    const fkResolved = this.fkDisplayMap[column.column_name];
    if (fkResolved && fkResolved[value]) {
      return fkResolved[value];
    }
    if (column.html_input_type === 'date' && isMicrosecondTimestamp(value)) {
      return formatMicroseconds(value);
    }
    return value;
  }

  isBoolColumn(column: ColumnDataInfo): boolean {
    return column.type === 'bool' ||
      column.html_input_type === 'bool' ||
      column.html_input_type === 'checkbox';
  }

  getBoolValue(value: string): boolean {
    return value === 't' || value === 'true' || value === '1';
  }

  getColumnHeader(column: ColumnDataInfo): string {
    return column.column_friendly_name || column.column_name;
  }

  get hasPhotoSupport(): boolean {
    return this.isTrueValue(this.tableSchema?.has_photo_support);
  }

  getPhotoUrl(row: Record<string, string>): string {
    const id = this.getPrimaryKeyValue(row);
    return this.photoUrlBuilder.scaledPhotoUrl(this.tableName, id, 50, 50);
  }

  getPrimaryKeyValue(row: Record<string, string>): string {
    return this.tableSchema ? row[this.tableSchema.primary_key] : '';
  }

  // Pagination helpers
  get currentPage(): number {
    return this.pageOffset;
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  get startRow(): number {
    return this.pageOffset * this.pageSize + 1;
  }

  get endRow(): number {
    return Math.min((this.pageOffset + 1) * this.pageSize, this.totalCount);
  }

  get canGoPrevious(): boolean {
    return this.pageOffset > 0;
  }

  get canGoNext(): boolean {
    return this.pageOffset < this.totalPages - 1;
  }

  // Navigation methods
  goToFirstPage(): void {
    this.navigateToPage(0);
  }

  goToPreviousPage(): void {
    if (this.canGoPrevious) {
      this.navigateToPage(this.pageOffset - 1);
    }
  }

  goToNextPage(): void {
    if (this.canGoNext) {
      this.navigateToPage(this.pageOffset + 1);
    }
  }

  goToLastPage(): void {
    this.navigateToPage(this.totalPages - 1);
  }

  /** Build query params preserving ctx for nested navigation. */
  private buildCtxQueryParams(extra?: Record<string, string>): Record<string, string> {
    const params: Record<string, string> = { ...extra };
    if (this.bindingStack.length > 0) {
      params['ctx'] = serializeBindingStack(this.bindingStack);
    }
    return params;
  }

  private navigateToPage(page: number): void {
    this.router.navigate(
      [this.editorRoutes.basePath, this.tableName, 'view', this.pageSize, page],
      { queryParams: this.buildCtxQueryParams() }
    );
  }

  onPageSizeChange(newPageSize: number): void {
    // Reset to first page when changing page size
    this.router.navigate(
      [this.editorRoutes.basePath, this.tableName, 'view', newPageSize, 0],
      { queryParams: this.buildCtxQueryParams() }
    );
  }

  // Action methods
  onNewItem(): void {
    const returnUrl = this.router.url;
    this.router.navigate([this.editorRoutes.basePath, this.tableName, 'new'], {
      queryParams: this.buildCtxQueryParams({ returnUrl })
    });
  }

  onEditRow(row: Record<string, string>): void {
    const primaryKeyValue = this.getPrimaryKeyValue(row);
    if (!primaryKeyValue) {
      console.error('Cannot edit row: no primary key value found', { row, tableSchema: this.tableSchema });
      return;
    }
    const returnUrl = this.router.url;
    this.router.navigate([this.editorRoutes.basePath, this.tableName, 'edit', primaryKeyValue], {
      queryParams: this.buildCtxQueryParams({ returnUrl })
    });
  }

  /** Navigate back to the parent table's edit page by popping the binding stack. */
  onNavigateToParent(): void {
    if (this.bindingStack.length === 0) return;

    const parentBinding = this.bindingStack[this.bindingStack.length - 1];
    const parentStack = this.bindingStack.slice(0, -1);

    const queryParams: Record<string, string> = {};
    if (parentStack.length > 0) {
      queryParams['ctx'] = serializeBindingStack(parentStack);
    }

    this.router.navigate(
      [this.editorRoutes.basePath, parentBinding.tableName, 'edit', parentBinding.primaryKeyValue],
      { queryParams }
    );
  }

  get hasParent(): boolean {
    return this.bindingStack.length > 0;
  }

  get parentFriendlyName(): string {
    if (this.bindingStack.length === 0) return '';
    const parentBinding = this.bindingStack[this.bindingStack.length - 1];
    const parentSchema = this.databaseSchema?.tables.find(t => t.table_name === parentBinding.tableName);
    return parentSchema?.table_friendly_name || parentBinding.tableName;
  }

  onDeleteRow(row: Record<string, string>): void {
    const primaryKeyValue = this.getPrimaryKeyValue(row);
    const primaryKeyName = this.tableSchema?.primary_key || 'id';

    const friendlyName = this.tableSchema?.table_friendly_name || this.tableName;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Delete',
        description: `Are you sure you want to delete this ${friendlyName} record (ID: ${primaryKeyValue})?`,
        buttonText: 'Delete',
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.crudAccess.deleteItem(this.tableName, primaryKeyName, primaryKeyValue).subscribe({
          next: () => {
            // Refresh the data after deletion
            this.loadData();
          },
          error: (err) => {
            console.error('Error deleting row:', err);
            this.error = 'Failed to delete row';
          }
        });
      }
    });
  }
}
