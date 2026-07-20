export interface ForeignKeyInfo {
  column_name: string; // "column in this table"
  parent_column_name: string; // "column referenced in parent"
  parent_table_name: string; // "table referenced"
}
