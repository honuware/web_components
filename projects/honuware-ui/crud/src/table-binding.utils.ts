import { TableBinding, FilterPair, TableSchema } from '@honuware/ui/access';

/**
 * Serialize a binding stack to a ctx query param string.
 * Format: "table:pkColumn:pkValue,table:pkColumn:pkValue"
 */
export function serializeBindingStack(stack: TableBinding[]): string {
  return stack.map(b => `${b.tableName}:${b.primaryKeyName}:${b.primaryKeyValue}`).join(',');
}

/**
 * Deserialize a ctx query param string into a TableBinding array.
 * Returns empty array for null/empty input.
 */
export function parseBindingStack(ctx: string | null | undefined): TableBinding[] {
  if (!ctx) return [];
  return ctx.split(',').map(triple => {
    const [tableName, primaryKeyName, primaryKeyValue] = triple.split(':');
    return { tableName, primaryKeyName, primaryKeyValue };
  });
}

/**
 * Derive filter pairs from the binding stack for the current table.
 * Looks at the current table's foreign keys and matches them against
 * the binding stack to build WHERE clause filters.
 *
 * For example, if viewing purchases with ctx=people:person_id:42,
 * and purchases has FK column payer_person_id -> people.person_id,
 * this returns [{ column_name: 'payer_person_id', column_value: '42' }].
 */
export function deriveFilterPairs(
  currentTableSchema: TableSchema,
  bindingStack: TableBinding[]
): FilterPair[] {
  if (bindingStack.length === 0) return [];

  const filterPairs: FilterPair[] = [];
  for (const fk of currentTableSchema.foreign_keys) {
    const binding = bindingStack.find(
      b => b.tableName === fk.parent_table_name && b.primaryKeyName === fk.parent_column_name
    );
    if (binding) {
      filterPairs.push({
        column_name: fk.column_name,
        column_value: binding.primaryKeyValue,
      });
    }
  }
  return filterPairs;
}
