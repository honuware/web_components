import { Component, Input, ViewChild, ViewChildren, QueryList, OnInit, Inject } from '@angular/core';

import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { CompositeControlComponent } from '@honuware/ui/controls';
import { PhotoUploadComponent } from '@honuware/ui/photos';
import { DatabaseSchemaService } from '../database-schema.service';
import {
  CrudAccess, UpdateItemBody, AddItemBody, HONUWARE_CRUD_ACCESS,
  DatabaseSchema, TableSchema, ColumnDataInfo, ForeignKeyInfo,
  TableBinding, FilterPair, CrudFormAssist, ComputedDateRule,
} from '@honuware/ui/access';
import { CRUD_EDITOR_ROUTES, CrudEditorRoutes } from '../crud-editor-routes';
import { serializeBindingStack } from '../table-binding.utils';

/**
 * A child table reference discovered from the schema.
 * Represents a nested table that has an FK pointing back to the current table.
 */
export interface ChildTableReference {
  childTableName: string;
  childTableFriendlyName: string;
  foreignKey: ForeignKeyInfo;
}

@Component({
  selector: 'hw-composite-row-control',
  standalone: true,
  imports: [MatButtonModule, MatCheckboxModule, MatIconModule, CompositeControlComponent, PhotoUploadComponent],
  templateUrl: './composite-row-control.component.html',
  styleUrls: ['./composite-row-control.component.scss']
})
export class CompositeRowControlComponent implements OnInit {
  @Input() tableName!: string;
  @Input() columnNames!: string[];
  @Input() primaryKeyName?: string;
  @Input() primaryKeyValue?: string;
  @Input() isCreateMode!: boolean;
  @Input() returnUrl?: string;
  @Input() bindingStack: TableBinding[] = [];
  @Input() formAssist?: CrudFormAssist;

  @ViewChildren(CompositeControlComponent) controls!: QueryList<CompositeControlComponent>;
  @ViewChild(PhotoUploadComponent) photoUpload?: PhotoUploadComponent;

  columnInfos: ColumnDataInfo[] = [];
  loading: boolean = true;
  columnValues: (string | undefined)[] = []; // values for each column
  hasPhotoSupport: boolean = false;
  childTableReferences: ChildTableReference[] = [];
  /** Set of FK column names from navigation context (readonly + pre-filled in create mode). */
  private contextFkColumnNames: Set<string> = new Set();
  private databaseSchema?: DatabaseSchema;
  private tableSchema?: TableSchema;
  /** Tracks whether each computed date dest column is in auto-compute mode. */
  computedDateAutoState: Record<string, boolean> = {};

  constructor(
    private dbSchemaService: DatabaseSchemaService,
    @Inject(HONUWARE_CRUD_ACCESS) private crudAccess: CrudAccess,
    @Inject(CRUD_EDITOR_ROUTES) private editorRoutes: CrudEditorRoutes,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadColumnInfos();
  }

  private loadColumnInfos() {
    this.dbSchemaService.GetDBSchema().subscribe(schema => {
      this.databaseSchema = schema;
      const table = schema.tables.find(t => t.table_name === this.tableName);
      if (!table) {
        this.columnInfos = [];
        this.loading = false;
        return;
      }
      this.tableSchema = table;
      this.hasPhotoSupport = this.isTrueValue(table.has_photo_support);
      this.columnInfos = this.columnNames.map(colName =>
        table.columns.find(col => col.column_name === colName)!
      );

      // Compute context FK columns from binding stack
      this.contextFkColumnNames = this.computeContextFkColumns(table);

      // Compute child table references (for nested table navigation buttons)
      this.childTableReferences = this.isCreateMode ? [] : this.getChildTableReferences(schema);

      if (!this.isCreateMode && this.primaryKeyName && this.primaryKeyValue) {
        // Fetch row data using getRowByValues (unified for root and nested)
        const filterPairs: FilterPair[] = [
          { column_name: this.primaryKeyName, column_value: this.primaryKeyValue }
        ];
        this.crudAccess.getRowByValues(this.tableName, filterPairs).subscribe(result => {
          // Map each columnName to its value in the returned row
          this.columnValues = this.columnNames.map(colName => {
            const sortedIdx = result.sortedColumnNames.indexOf(colName);
            return result.dataTable.length > 0 && sortedIdx !== -1 ? result.dataTable[0][sortedIdx] : undefined;
          });
          this.loading = false;
        });
      } else {
        // Create mode: pre-fill FK columns from binding stack context, then apply formAssist defaults
        this.columnValues = this.columnNames.map(colName => {
          const fkPrefill = this.getContextFkValue(table, colName);
          if (fkPrefill) return fkPrefill;
          // Apply formAssist defaults
          if (this.formAssist?.defaults && colName in this.formAssist.defaults) {
            return this.formAssist.defaults[colName];
          }
          return undefined;
        });
        // Initialize computed date auto state
        this.initComputedDateState();
        this.loading = false;
      }
    });
  }

  /**
   * Compute the set of FK column names that come from navigation context.
   * These should be readonly in both edit and create mode.
   */
  private computeContextFkColumns(table: TableSchema): Set<string> {
    const fkColumns = new Set<string>();
    for (const fk of table.foreign_keys) {
      const binding = this.bindingStack.find(
        b => b.tableName === fk.parent_table_name && b.primaryKeyName === fk.parent_column_name
      );
      if (binding) {
        fkColumns.add(fk.column_name);
      }
    }
    return fkColumns;
  }

  /**
   * Get the pre-fill value for an FK column from the binding stack.
   * Returns null if the column is not an FK from context.
   */
  private getContextFkValue(table: TableSchema, columnName: string): string | null {
    for (const fk of table.foreign_keys) {
      if (fk.column_name !== columnName) continue;
      const binding = this.bindingStack.find(
        b => b.tableName === fk.parent_table_name && b.primaryKeyName === fk.parent_column_name
      );
      if (binding) {
        return binding.primaryKeyValue;
      }
    }
    return null;
  }

  /**
   * Find nested tables that have FK references to the current table.
   * Only includes tables listed in schema.nested_tables.
   */
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

  get visibleColumns(): { col: ColumnDataInfo; index: number }[] {
    return this.columnInfos
      .map((col, index) => ({ col, index }))
      .filter(({ col }) => {
        if (this.isTrueValue(col.hidden)) return false;
        if (this.isTrueValue(col.readonly) && this.isCreateMode) return false;
        return true;
      });
  }

  /** Check if a column should be readonly. Includes context FK columns. */
  isReadonlyColumn(col: ColumnDataInfo): boolean {
    return this.isPrimaryKeyColumn(col) || this.isTrueValue(col.readonly)
      || this.contextFkColumnNames.has(col.column_name);
  }

  /** Whether the column is an FK from navigation context. */
  isContextFkColumn(col: ColumnDataInfo): boolean {
    return this.contextFkColumnNames.has(col.column_name);
  }

  onValueChanged(index: number, value: string): void {
    const visible = this.visibleColumns;
    const entry = visible[index];
    if (!entry) return;
    const control = this.controls.get(index);
    if (control) {
      control.value = value;
    }
    // Update the backing columnValues so computed dates can read it
    this.columnValues[entry.index] = value;
    // Propagate to computed date destinations
    this.applyComputedDates(entry.col.column_name);
  }

  getControlValues(): Record<string, string | undefined> {
    const values: Record<string, string | undefined> = {};
    const visible = this.visibleColumns;
    this.controls.forEach((control, idx) => {
      const entry = visible[idx];
      if (!entry) return;
      const col = entry.col;
      if (this.isTrueValue(col.readonly)) return;
      // Skip empty strings for non-text columns — PostgreSQL can't cast ""
      // to numeric/date/bool types, and empty means "no change" for those.
      if (control.value === '' && !this.isTextColumnType(col.type)) return;
      values[this.columnNames[entry.index]] = control.value;
    });
    return values;
  }

  private isTextColumnType(type: string): boolean {
    const upper = type.toUpperCase();
    return upper === 'VARCHAR' || upper === 'TEXT' || upper === 'CHAR';
  }

  onSubmit() {
    const values = this.getControlValues();
    if (this.isCreateMode) {
      const body: AddItemBody = {
        table_name: this.tableName,
        value: values
      };
      if (this.hasPhotoSupport) {
        this.crudAccess.addItemFetchPrimaryKey(body).subscribe({
          next: (primaryKey) => {
            if (this.photoUpload?.hasPendingFile) {
              this.photoUpload.uploadPendingPhoto(this.tableName, Number(primaryKey)).subscribe({
                next: () => this.navigateBack(),
                error: (err) => {
                  console.error('Error uploading photo:', err);
                  this.navigateBack();
                }
              });
            } else {
              this.navigateBack();
            }
          },
          error: (err) => console.error('Error creating item:', err)
        });
      } else {
        this.crudAccess.addItem(body).subscribe({
          next: () => this.navigateBack(),
          error: (err) => console.error('Error creating item:', err)
        });
      }
    } else {
      if (!this.primaryKeyName || !this.primaryKeyValue) return;
      const body: UpdateItemBody = {
        table_name: this.tableName,
        value: values,
        column_name: this.primaryKeyName,
        column_value: this.primaryKeyValue
      };
      this.crudAccess.updateItem(body).subscribe({
        next: () => this.navigateBack(),
        error: (err) => console.error('Error updating item:', err)
      });
    }
  }

  onCancel() {
    this.navigateBack();
  }

  private isTrueValue(value: boolean | undefined): boolean {
    return value === true || (value as unknown) === 't';
  }

  get showPhotoUpload(): boolean {
    if (!this.hasPhotoSupport) return false;
    if (this.isCreateMode) return true;
    return !!this.primaryKeyValue;
  }

  get photoItemId(): number {
    if (this.isCreateMode) return 0;
    return Number(this.primaryKeyValue);
  }

  getForeignKeyInfo(col: ColumnDataInfo): ForeignKeyInfo | undefined {
    return this.tableSchema?.foreign_keys.find(fk => fk.column_name === col.column_name);
  }

  isPrimaryKeyColumn(col: ColumnDataInfo): boolean {
    if (this.isCreateMode) return false;
    // Handle both boolean true and string "t" from server
    return col.primary_key === true || (col.primary_key as unknown) === 't';
  }

  // --- Nested navigation ---

  get hasParent(): boolean {
    return this.bindingStack.length > 0;
  }

  get parentFriendlyName(): string {
    if (this.bindingStack.length === 0) return '';
    const parentBinding = this.bindingStack[this.bindingStack.length - 1];
    const parentSchema = this.databaseSchema?.tables.find(t => t.table_name === parentBinding.tableName);
    return parentSchema?.table_friendly_name || parentBinding.tableName;
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

  /** Navigate to a child (nested) table filtered by the current row. */
  onNavigateToChild(ref: ChildTableReference): void {
    if (!this.primaryKeyValue || !this.tableSchema) return;

    // Push current table onto the binding stack
    const newStack: TableBinding[] = [
      ...this.bindingStack,
      {
        tableName: this.tableName,
        primaryKeyName: this.tableSchema.primary_key,
        primaryKeyValue: this.primaryKeyValue,
      }
    ];

    const queryParams: Record<string, string> = {
      ctx: serializeBindingStack(newStack),
    };

    this.router.navigate(
      [this.editorRoutes.basePath, ref.childTableName, 'view', 10, 0],
      { queryParams }
    );
  }

  // --- Computed date support ---

  private initComputedDateState(): void {
    if (!this.formAssist?.computedDates) return;
    for (const rule of this.formAssist.computedDates) {
      this.computedDateAutoState[rule.dest] = rule.autoByDefault;
    }
  }

  /** When a source field changes, update any auto-computed dest fields. */
  private applyComputedDates(changedColumn: string): void {
    if (!this.formAssist?.computedDates) return;
    for (const rule of this.formAssist.computedDates) {
      if (rule.source !== changedColumn) continue;
      if (!this.computedDateAutoState[rule.dest]) continue;
      this.computeAndSetDate(rule);
    }
  }

  private computeAndSetDate(rule: ComputedDateRule): void {
    const sourceIndex = this.columnNames.indexOf(rule.source);
    const destIndex = this.columnNames.indexOf(rule.dest);
    if (sourceIndex === -1 || destIndex === -1) return;

    const sourceValue = this.columnValues[sourceIndex];
    if (!sourceValue) return;

    const sourceUs = parseInt(sourceValue, 10);
    if (isNaN(sourceUs)) return;

    const destUs = sourceUs + (rule.offsetMinutes * 60 * 1_000_000);
    const destValue = String(destUs);
    this.columnValues[destIndex] = destValue;

    // Update the visible control if it exists
    const visible = this.visibleColumns;
    const visibleIdx = visible.findIndex(v => v.index === destIndex);
    if (visibleIdx !== -1) {
      const control = this.controls?.get(visibleIdx);
      if (control) {
        control.value = destValue;
      }
    }
  }

  /** Toggle auto-compute for a computed date dest column. */
  onToggleComputedDate(destColumn: string): void {
    this.computedDateAutoState[destColumn] = !this.computedDateAutoState[destColumn];
    if (this.computedDateAutoState[destColumn]) {
      // Re-compute from source
      const rule = this.formAssist?.computedDates?.find(r => r.dest === destColumn);
      if (rule) {
        this.computeAndSetDate(rule);
      }
    }
  }

  /** Check if a column is a computed date dest in auto mode. */
  isComputedDateAuto(columnName: string): boolean {
    return this.computedDateAutoState[columnName] === true;
  }

  /** Get the computed date rule for a column, if any. */
  getComputedDateRule(columnName: string): ComputedDateRule | undefined {
    return this.formAssist?.computedDates?.find(r => r.dest === columnName);
  }

  private navigateBack() {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }
}
