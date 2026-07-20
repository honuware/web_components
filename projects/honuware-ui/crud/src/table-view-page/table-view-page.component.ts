import { Component, Inject, OnInit, OnDestroy } from '@angular/core';

import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { TableViewControlComponent } from '../table-view-control/table-view-control.component';
import { TableBinding } from '@honuware/ui/access';
import { parseBindingStack } from '../table-binding.utils';
import { CRUD_EDITOR_ROUTES, CrudEditorRoutes } from '../crud-editor-routes';

@Component({
  selector: 'hw-table-view-page',
  standalone: true,
  imports: [RouterModule, TableViewControlComponent],
  templateUrl: './table-view-page.component.html'
})
export class TableViewPageComponent implements OnInit, OnDestroy {
  tableName: string = '';
  pageSize: number = 10;
  pageOffset: number = 0;
  bindingStack: TableBinding[] = [];
  readonly adminHome: string;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    @Inject(CRUD_EDITOR_ROUTES) editorRoutes: CrudEditorRoutes,
  ) {
    this.adminHome = editorRoutes.adminHome;
  }

  ngOnInit(): void {
    combineLatest([
      this.route.params,
      this.route.queryParams
    ]).pipe(takeUntil(this.destroy$)).subscribe(([params, queryParams]) => {
      this.tableName = params['tableName'] || '';
      this.pageSize = parseInt(params['pageSize'], 10) || 10;
      this.pageOffset = parseInt(params['pageOffset'], 10) || 0;
      this.bindingStack = parseBindingStack(queryParams['ctx']);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
