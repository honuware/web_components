import { ColumnDataInfoFromJSON } from './conversion';

describe('Conversion', () => {
  describe('ColumnDataInfoFromJSON', () => {
    it('should parse basic column data info fields', () => {
      const input = {
        column_name: 'email',
        type: 'VARCHAR',
        primary_key: 'f',
        unique: 't',
        nullable: 'f',
        label: 'Email',
        hint: 'User email',
        html_input_type: 'text',
        required: 't',
      };

      const result = ColumnDataInfoFromJSON(input);

      expect(result.column_name).toBe('email');
      expect(result.type).toBe('VARCHAR');
      expect(result.primary_key).toBeFalse();
      expect(result.unique).toBeTrue();
      expect(result.nullable).toBeFalse();
      expect(result.label).toBe('Email');
      expect(result.hint).toBe('User email');
      expect(result.html_input_type).toBe('text');
      expect(result.required).toBeTrue();
    });

    it('should parse enum_values array', () => {
      const input = {
        column_name: 'kind',
        type: 'VARCHAR',
        primary_key: 'f',
        unique: 'f',
        nullable: 'f',
        html_input_type: 'enum',
        enum_values: ['one_time', 'recurring', 'subscription'],
      };

      const result = ColumnDataInfoFromJSON(input);

      expect(result.enum_values).toEqual(['one_time', 'recurring', 'subscription']);
    });

    it('should handle missing enum_values as undefined', () => {
      const input = {
        column_name: 'name',
        type: 'VARCHAR',
        primary_key: 'f',
        unique: 'f',
        nullable: 'f',
        html_input_type: 'text',
      };

      const result = ColumnDataInfoFromJSON(input);

      expect(result.enum_values).toBeUndefined();
    });

    it('should handle null enum_values as undefined', () => {
      const input = {
        column_name: 'name',
        type: 'VARCHAR',
        primary_key: 'f',
        unique: 'f',
        nullable: 'f',
        enum_values: null,
      };

      const result = ColumnDataInfoFromJSON(input);

      expect(result.enum_values).toBeUndefined();
    });

    it('should filter non-string values from enum_values array', () => {
      const input = {
        column_name: 'kind',
        type: 'VARCHAR',
        primary_key: 'f',
        unique: 'f',
        nullable: 'f',
        enum_values: ['alpha', 42, 'beta', null, 'gamma'],
      };

      const result = ColumnDataInfoFromJSON(input);

      expect(result.enum_values).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('should parse hidden and readonly fields', () => {
      const input = {
        column_name: 'created_us',
        type: 'BIGINT',
        primary_key: 'f',
        unique: 'f',
        nullable: 'f',
        hidden: 'f',
        readonly: 't',
      };

      const result = ColumnDataInfoFromJSON(input);

      expect(result.hidden).toBeFalse();
      expect(result.readonly).toBeTrue();
    });
  });
});
