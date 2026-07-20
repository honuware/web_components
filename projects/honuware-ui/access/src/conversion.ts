import { ColumnDataInfo } from './ColumnDataInfo';

export function ColumnDataInfoFromJSON(obj: unknown): ColumnDataInfo {
  const input = obj as Record<string, unknown>;

  function parseString(val: unknown): string | unknown {
    if (val === null) return undefined;
    return typeof val === 'string' ? val : undefined;
  }

  function parseBool(val: unknown): boolean | unknown {
    if (val === null) return undefined;
    if (val === 't') return true;
    if (val === 'f') return false;
    return undefined;
  }

  function parseNumber(val: unknown): number | unknown {
    if (val === null) return undefined;
    if (typeof val === 'string') {
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  }

  function parseStringArray(val: unknown): string[] | undefined {
    if (!Array.isArray(val)) return undefined;
    return val.filter((v): v is string => typeof v === 'string');
  }

  return {
    column_name: parseString(input['column_name']) as string,
    type: parseString(input['type']) as string,
    primary_key: parseBool(input['primary_key']) as boolean,
    unique: parseBool(input['unique']) as boolean,
    nullable: parseBool(input['nullable']) as boolean,

    column_friendly_name: parseString(input['column_friendly_name']) as string | undefined,
    label: parseString(input['label']) as string | undefined,
    hint: parseString(input['hint']) as string | undefined,
    place_holder: parseString(input['place_holder']) as string | undefined,
    regex: parseString(input['regex']) as string | undefined,
    html_input_type: parseString(input['html_input_type']) as string | undefined,
    required: parseBool(input['required']) as boolean | undefined,
    max_length: parseNumber(input['max_length']) as number | undefined,
    default_value: parseString(input['default_value']) as string | undefined,
    rows: parseNumber(input['rows']) as number | undefined,
    hidden: parseBool(input['hidden']) as boolean | undefined,
    readonly: parseBool(input['readonly']) as boolean | undefined,
    enum_values: parseStringArray(input['enum_values']),
  };
}

