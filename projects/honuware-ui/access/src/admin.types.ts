export interface FilterPair {
  column_name: string;
  column_value: string;
}

export interface TableBinding {
  tableName: string;
  primaryKeyName: string;
  primaryKeyValue: string;
}

export interface FkOption {
  value: string;
  display: string;
}

export interface FkOptionsResponse {
  total_count: number;
  options: FkOption[];
}

export interface FkDisplayResponse {
  resolved: Record<string, string>;
}

export interface ComputedDateRule {
  source: string;
  dest: string;
  offsetMinutes: number;
  autoByDefault: boolean;
}

export interface CrudFormAssist {
  defaults?: Record<string, string>;
  computedDates?: ComputedDateRule[];
}
