import { serializeBindingStack, parseBindingStack, deriveFilterPairs } from './table-binding.utils';
import { TableBinding, TableSchema } from '@honuware/ui/access';

describe('table-binding.utils', () => {
  describe('serializeBindingStack', () => {
    it('should serialize empty stack to empty string', () => {
      expect(serializeBindingStack([])).toBe('');
    });

    it('should serialize single binding', () => {
      const stack: TableBinding[] = [
        { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' }
      ];
      expect(serializeBindingStack(stack)).toBe('people:person_id:42');
    });

    it('should serialize multiple bindings', () => {
      const stack: TableBinding[] = [
        { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' },
        { tableName: 'purchases', primaryKeyName: 'purchase_id', primaryKeyValue: '7' }
      ];
      expect(serializeBindingStack(stack)).toBe('people:person_id:42,purchases:purchase_id:7');
    });
  });

  describe('parseBindingStack', () => {
    it('should return empty array for null', () => {
      expect(parseBindingStack(null)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(parseBindingStack(undefined)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(parseBindingStack('')).toEqual([]);
    });

    it('should parse single binding', () => {
      const result = parseBindingStack('people:person_id:42');
      expect(result).toEqual([
        { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' }
      ]);
    });

    it('should parse multiple bindings', () => {
      const result = parseBindingStack('people:person_id:42,purchases:purchase_id:7');
      expect(result).toEqual([
        { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' },
        { tableName: 'purchases', primaryKeyName: 'purchase_id', primaryKeyValue: '7' }
      ]);
    });

    it('should round-trip with serializeBindingStack', () => {
      const stack: TableBinding[] = [
        { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' },
        { tableName: 'purchases', primaryKeyName: 'purchase_id', primaryKeyValue: '7' }
      ];
      expect(parseBindingStack(serializeBindingStack(stack))).toEqual(stack);
    });
  });

  describe('deriveFilterPairs', () => {
    const purchasesSchema: TableSchema = {
      table_name: 'purchases',
      table_friendly_name: 'Purchases',
      primary_key: 'purchase_id',
      description: '',
      columns: [],
      foreign_keys: [
        { column_name: 'payer_person_id', parent_table_name: 'people', parent_column_name: 'person_id' }
      ]
    };

    const roleAssignmentsSchema: TableSchema = {
      table_name: 'role_assignments',
      table_friendly_name: 'Role Assignments',
      primary_key: 'id',
      description: '',
      columns: [],
      foreign_keys: [
        { column_name: 'person_id', parent_table_name: 'people', parent_column_name: 'person_id' },
        { column_name: 'role_id', parent_table_name: 'roles', parent_column_name: 'id' }
      ]
    };

    it('should return empty array for empty binding stack', () => {
      expect(deriveFilterPairs(purchasesSchema, [])).toEqual([]);
    });

    it('should derive filter pair from single FK match', () => {
      const stack: TableBinding[] = [
        { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' }
      ];
      expect(deriveFilterPairs(purchasesSchema, stack)).toEqual([
        { column_name: 'payer_person_id', column_value: '42' }
      ]);
    });

    it('should derive only matching FK when stack has no match for some FKs', () => {
      const stack: TableBinding[] = [
        { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' }
      ];
      // role_assignments has FKs to both people and roles, but only people is in the stack
      const result = deriveFilterPairs(roleAssignmentsSchema, stack);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ column_name: 'person_id', column_value: '42' });
    });

    it('should derive multiple filter pairs when multiple FKs match', () => {
      const stack: TableBinding[] = [
        { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' },
        { tableName: 'roles', primaryKeyName: 'id', primaryKeyValue: '3' }
      ];
      const result = deriveFilterPairs(roleAssignmentsSchema, stack);
      expect(result.length).toBe(2);
      expect(result).toContain(jasmine.objectContaining({ column_name: 'person_id', column_value: '42' }));
      expect(result).toContain(jasmine.objectContaining({ column_name: 'role_id', column_value: '3' }));
    });

    it('should return empty array when no FKs match the stack', () => {
      const stack: TableBinding[] = [
        { tableName: 'unrelated_table', primaryKeyName: 'id', primaryKeyValue: '1' }
      ];
      expect(deriveFilterPairs(purchasesSchema, stack)).toEqual([]);
    });

    it('should return empty array for table with no foreign keys', () => {
      const noFkSchema: TableSchema = {
        table_name: 'classes',
        table_friendly_name: 'Classes',
        primary_key: 'id',
        description: '',
        columns: [],
        foreign_keys: []
      };
      const stack: TableBinding[] = [
        { tableName: 'people', primaryKeyName: 'person_id', primaryKeyValue: '42' }
      ];
      expect(deriveFilterPairs(noFkSchema, stack)).toEqual([]);
    });
  });
});
