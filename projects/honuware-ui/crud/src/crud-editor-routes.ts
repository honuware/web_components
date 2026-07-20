import { InjectionToken } from '@angular/core';

// Route literals the generic CRUD editor (the table-view / composite-row
// containers and the table pages) would otherwise hardcode. Injected so a
// honuware consumer can mount the editor under a different path without
// forking the components.
export interface CrudEditorRoutes {
  /**
   * Base path for the generic table editor routes. Navigation is built as
   * `[basePath, tableName, 'view'|'edit'|'new', ...]`, so this must be the
   * absolute prefix the editor routes are mounted at.
   */
  basePath: string;
  /** The admin portal home the "back" links point at. */
  adminHome: string;
}

export const DEFAULT_CRUD_EDITOR_ROUTES: CrudEditorRoutes = {
  basePath: '/admin/tables',
  adminHome: '/admin',
};

// Root-provided with the knottyyoga defaults, so nothing needs wiring today.
export const CRUD_EDITOR_ROUTES = new InjectionToken<CrudEditorRoutes>(
  'CRUD_EDITOR_ROUTES',
  {
    providedIn: 'root',
    factory: () => DEFAULT_CRUD_EDITOR_ROUTES,
  }
);
