/*
 * @honuware/ui/crud — the generic table editor: DatabaseSchemaService, the
 * table-binding utils, the table-view / composite-row containers, the
 * TableView/Edit/New pages, and the CRUD_EDITOR_ROUTES config token. Sits on
 * top of foundation + access + auth + controls + photos. Selectors use `hw-`.
 */
export { DatabaseSchemaService } from './database-schema.service';

export { serializeBindingStack, parseBindingStack, deriveFilterPairs } from './table-binding.utils';

export { CRUD_EDITOR_ROUTES, DEFAULT_CRUD_EDITOR_ROUTES } from './crud-editor-routes';
export type { CrudEditorRoutes } from './crud-editor-routes';

export { TableViewControlComponent } from './table-view-control/table-view-control.component';
export { CompositeRowControlComponent } from './composite-row-control/composite-row-control.component';
export type { ChildTableReference } from './composite-row-control/composite-row-control.component';

export { TableViewPageComponent } from './table-view-page/table-view-page.component';
export { TableEditPageComponent } from './table-edit-page/table-edit-page.component';
export { TableNewPageComponent } from './table-new-page/table-new-page.component';
