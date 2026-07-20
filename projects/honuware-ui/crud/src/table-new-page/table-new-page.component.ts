import { Component, Inject, OnInit, OnDestroy } from '@angular/core';

import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { CompositeRowControlComponent } from '../composite-row-control/composite-row-control.component';
import { DatabaseSchemaService } from '../database-schema.service';
import { TableBinding, CrudFormAssist } from '@honuware/ui/access';
import { parseBindingStack } from '../table-binding.utils';
import { CRUD_EDITOR_ROUTES, CrudEditorRoutes } from '../crud-editor-routes';

@Component({
  selector: 'hw-table-new-page',
  standalone: true,
  imports: [RouterModule, CompositeRowControlComponent],
  templateUrl: './table-new-page.component.html',
  styleUrls: ['./table-new-page.component.scss']
})
export class TableNewPageComponent implements OnInit, OnDestroy {
  tableName: string = '';
  columnNames: string[] = [];
  tableFriendlyName: string = '';
  returnUrl: string = '';
  bindingStack: TableBinding[] = [];
  formAssist?: CrudFormAssist;
  loading: boolean = true;
  error?: string;
  readonly adminHome: string;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dbSchemaService: DatabaseSchemaService,
    @Inject(CRUD_EDITOR_ROUTES) editorRoutes: CrudEditorRoutes,
  ) {
    this.adminHome = editorRoutes.adminHome;
    // Read formAssist from browser history state. Angular's router.navigate({ state })
    // stores data in the History API. getCurrentNavigation() is unreliable (returns null
    // for lazy-loaded routes), so we read directly from history.state instead.
    this.formAssist = history.state?.formAssist as CrudFormAssist | undefined;
  }

  ngOnInit(): void {
    combineLatest([
      this.route.params,
      this.route.queryParams,
      this.dbSchemaService.GetDBSchema()
    ]).pipe(takeUntil(this.destroy$)).subscribe({
      next: ([params, queryParams, schema]) => {
        this.tableName = params['tableName'] || '';
        this.returnUrl = queryParams['returnUrl'] || '';
        this.bindingStack = parseBindingStack(queryParams['ctx']);

        const tableSchema = schema.tables.find(t => t.table_name === this.tableName);
        if (!tableSchema) {
          this.error = `Table "${this.tableName}" not found`;
          this.loading = false;
          return;
        }

        this.tableFriendlyName = tableSchema.table_friendly_name || this.tableName;
        // Filter out primary key column for create mode (auto-generated)
        // Handle both boolean true and string "t" from server
        this.columnNames = tableSchema.columns
          .filter(c => c.primary_key !== true && (c.primary_key as unknown) !== 't')
          .map(c => c.column_name);
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
