import { DatabaseSchema } from '@honuware/ui/access';
import { MockCrudAccess, MockRow } from './mock-crud-access';

const schema: DatabaseSchema = {
  root_tables: ['people'],
  nested_tables: [],
  tables: [
    {
      table_name: 'people',
      table_friendly_name: 'People',
      description: '',
      primary_key: 'id',
      foreign_keys: [],
      columns: [
        { column_name: 'id', type: 'SERIAL', primary_key: true, unique: false, nullable: false },
        { column_name: 'name', type: 'VARCHAR', primary_key: false, unique: false, nullable: false },
      ],
    },
  ],
  display_templates: { people: '{name}' },
  fk_picker_preload_threshold: 50,
};

function make(seedRows?: Record<string, MockRow[]>): MockCrudAccess {
  return new MockCrudAccess({ schema, seedRows });
}

describe('MockCrudAccess', () => {
  it('getDbSchema returns the supplied schema', () => {
    let result: DatabaseSchema | undefined;
    make().getDbSchema().subscribe((s) => (result = s));
    expect(result).toBe(schema);
  });

  it('addItemFetchPrimaryKey generates a primary key and stores the row', () => {
    const crud = make();

    let pk: string | undefined;
    crud.addItemFetchPrimaryKey({ table_name: 'people', value: { name: 'Alice' } }).subscribe((k) => (pk = k));
    expect(pk).toBe('1');

    let rows: string[][] | undefined;
    crud.getTableRows('people').subscribe((r) => (rows = r.dataTable));
    expect(rows).toEqual([['1', 'Alice']]);
  });

  it('honors an explicit primary key and continues the counter past it', () => {
    const crud = make();
    crud.addItemFetchPrimaryKey({ table_name: 'people', value: { id: '5', name: 'Seeded' } }).subscribe();

    let pk: string | undefined;
    crud.addItemFetchPrimaryKey({ table_name: 'people', value: { name: 'Next' } }).subscribe((k) => (pk = k));
    expect(pk).toBe('6');
  });

  it('getRowByValues matches every filter pair', () => {
    const crud = make({ people: [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }] });

    let rows: string[][] | undefined;
    crud.getRowByValues('people', [{ column_name: 'id', column_value: '2' }]).subscribe((r) => (rows = r.dataTable));
    expect(rows).toEqual([['2', 'Bob']]);
  });

  it('updateItem mutates the matching row', () => {
    const crud = make({ people: [{ id: '1', name: 'Alice' }] });
    crud.updateItem({ table_name: 'people', value: { name: 'Alicia' }, column_name: 'id', column_value: '1' }).subscribe();

    let rows: string[][] | undefined;
    crud.getRow('people', 'id', '1').subscribe((r) => (rows = r.dataTable));
    expect(rows).toEqual([['1', 'Alicia']]);
  });

  it('deleteItem removes the matching row', () => {
    const crud = make({ people: [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }] });
    crud.deleteItem('people', 'id', '1').subscribe();

    let rows: string[][] | undefined;
    crud.getTableRows('people').subscribe((r) => (rows = r.dataTable));
    expect(rows).toEqual([['2', 'Bob']]);
  });

  it('getFilteredTableRows filters, paginates, and reports the total count', () => {
    const seed: MockRow[] = [
      { id: '1', name: 'Aa' }, { id: '2', name: 'Bb' }, { id: '3', name: 'Cc' },
      { id: '4', name: 'Dd' }, { id: '5', name: 'Ee' },
    ];
    const crud = make({ people: seed });

    let result: { dataTable: string[][]; totalCount: number } | undefined;
    crud.getFilteredTableRows('people', 'name', true, 2, 1, []).subscribe((r) => (result = r));
    expect(result?.totalCount).toBe(5);
    expect(result?.dataTable).toEqual([['3', 'Cc'], ['4', 'Dd']]); // page index 1, size 2
  });

  it('getFkOptions renders the display template and honors the search text', () => {
    const crud = make({ people: [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }] });

    let all: { total_count: number; options: { value: string; display: string }[] } | undefined;
    crud.getFkOptions('people', '', 50).subscribe((r) => (all = r));
    expect(all?.total_count).toBe(2);
    expect(all?.options).toEqual([{ value: '1', display: 'Alice' }, { value: '2', display: 'Bob' }]);

    let searched: { options: { value: string; display: string }[] } | undefined;
    crud.getFkOptions('people', 'bob', 50).subscribe((r) => (searched = r));
    expect(searched?.options).toEqual([{ value: '2', display: 'Bob' }]);
  });

  it('resolveFkDisplay maps primary-key values through the display template', () => {
    const crud = make({ people: [{ id: '1', name: 'Alice' }] });

    let resolved: Record<string, string> | undefined;
    crud.resolveFkDisplay('people', ['1', '99']).subscribe((r) => (resolved = r.resolved));
    // Known id resolves via {name}; an unknown id falls back to the raw value.
    expect(resolved).toEqual({ '1': 'Alice', '99': '99' });
  });
});
