import { TestBed } from '@angular/core/testing';
import {
  HONUWARE_CRUD_ACCESS,
  HONUWARE_AUTH_ACCESS,
  HONUWARE_PHOTO_ACCESS,
  DatabaseSchema,
} from '@honuware/ui/access';
import { provideHonuwareAccessMock, HonuwareAccessMocks } from './provide-honuware-access-mock';
import { MockCrudAccess } from './mock-crud-access';
import { MockAuthAccess } from './mock-auth-access';
import { MockPhotoAccess } from './mock-photo-access';

const schema: DatabaseSchema = {
  root_tables: [],
  nested_tables: [],
  tables: [],
  display_templates: {},
  fk_picker_preload_threshold: 50,
};

describe('provideHonuwareAccessMock', () => {
  it('wires the three HONUWARE_*_ACCESS tokens to the in-memory mocks', () => {
    TestBed.configureTestingModule({ providers: [provideHonuwareAccessMock()] });

    expect(TestBed.inject(HONUWARE_CRUD_ACCESS)).toBeInstanceOf(MockCrudAccess);
    expect(TestBed.inject(HONUWARE_AUTH_ACCESS)).toBeInstanceOf(MockAuthAccess);
    expect(TestBed.inject(HONUWARE_PHOTO_ACCESS)).toBeInstanceOf(MockPhotoAccess);
  });

  it('capture callback exposes the same instances the tokens resolve to', () => {
    let captured: HonuwareAccessMocks | undefined;
    TestBed.configureTestingModule({
      providers: [provideHonuwareAccessMock({}, (m) => (captured = m))],
    });

    if (!captured) {
      fail('capture callback did not run');
      return;
    }
    expect(TestBed.inject(HONUWARE_CRUD_ACCESS)).toBe(captured.crud);
    expect(TestBed.inject(HONUWARE_AUTH_ACCESS)).toBe(captured.auth);
    expect(TestBed.inject(HONUWARE_PHOTO_ACCESS)).toBe(captured.photo);
  });

  it('passes crud options through to the MockCrudAccess', () => {
    let captured: HonuwareAccessMocks | undefined;
    TestBed.configureTestingModule({
      providers: [provideHonuwareAccessMock({ crud: { schema } }, (m) => (captured = m))],
    });

    let result: DatabaseSchema | undefined;
    captured?.crud.getDbSchema().subscribe((s) => (result = s));
    expect(result).toBe(schema);
  });
});
