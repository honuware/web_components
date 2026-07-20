import { Component, Inject, OnInit, OnDestroy } from '@angular/core';

import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { CompositeRowControlComponent } from '../composite-row-control/composite-row-control.component';
import { DatabaseSchemaService } from '../database-schema.service';
import { TableBinding } from '@honuware/ui/access';
import { parseBindingStack } from '../table-binding.utils';
import { CRUD_EDITOR_ROUTES, CrudEditorRoutes } from '../crud-editor-routes';

@Component({
  selector: 'hw-table-edit-page',
  standalone: true,
  imports: [
    RouterModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    CompositeRowControlComponent
],
  templateUrl: './table-edit-page.component.html',
  styleUrls: ['./table-edit-page.component.scss']
})
export class TableEditPageComponent implements OnInit, OnDestroy {
  tableName: string = '';
  primaryKeyName: string = 'id';
  primaryKeyValue: string = '';
  columnNames: string[] = [];
  tableFriendlyName: string = '';
  returnUrl: string = '';
  bindingStack: TableBinding[] = [];
  loading: boolean = true;
  error?: string;
  readonly adminHome: string;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private dbSchemaService: DatabaseSchemaService,
    @Inject(CRUD_EDITOR_ROUTES) editorRoutes: CrudEditorRoutes,
  ) {
    this.adminHome = editorRoutes.adminHome;
  }

  ngOnInit(): void {
    combineLatest([
      this.route.params,
      this.route.queryParams,
      this.dbSchemaService.GetDBSchema()
    ]).pipe(takeUntil(this.destroy$)).subscribe({
      next: ([params, queryParams, schema]) => {
        this.tableName = params['tableName'] || '';
        this.primaryKeyValue = params['id'] || '';
        this.returnUrl = queryParams['returnUrl'] || '';
        this.bindingStack = parseBindingStack(queryParams['ctx']);

        const tableSchema = schema.tables.find(t => t.table_name === this.tableName);
        if (!tableSchema) {
          this.error = `Table "${this.tableName}" not found`;
          this.loading = false;
          return;
        }

        this.tableFriendlyName = tableSchema.table_friendly_name || this.tableName;
        this.primaryKeyName = tableSchema.primary_key;
        this.columnNames = tableSchema.columns.map(c => c.column_name);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load schema';
        this.loading = false;
        console.error('Error loading schema:', err);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
