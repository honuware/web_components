import { TableSchema } from './TableSchema';
export interface DatabaseSchema {
  root_tables: string[]; // List of top level tables
  nested_tables: string[]; // List of nested (child) tables navigable from parents
  tables: TableSchema[]; // Metadata for all tables in the database
  display_templates: Record<string, string>; // Table name → display template for FK picker
  fk_picker_preload_threshold: number; // Row count threshold for preload vs search mode
}
