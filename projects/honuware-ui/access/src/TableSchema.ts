import { ColumnDataInfo } from './ColumnDataInfo';
import { ForeignKeyInfo } from './ForeignKeyInfo';
export interface TableSchema {
  columns: ColumnDataInfo[];
  description: string; // Friendly description of the table
  foreign_keys: ForeignKeyInfo[];
  has_photo_support?: boolean; // Whether this table supports photo uploads
  primary_key: string; // Column name of the primary key
  table_friendly_name: string; // Friendly name of the table, e.g., "People
  table_name: string; // Table name in the database, e.g., "people"
}
