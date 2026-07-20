/*
 * @honuware/ui/testing — fresh, minimal in-memory framework mocks for
 * library/consumer tests: a schema-driven CrudAccess store, an AuthAccess
 * session simulator, a PhotoAccess simulator, and provideHonuwareAccessMock()
 * wiring for mock mode. Depends on @honuware/ui/access only.
 */
export { MockCrudAccess } from './mock-crud-access';
export type { MockRow, MockCrudAccessOptions } from './mock-crud-access';

export { MockAuthAccess } from './mock-auth-access';
export type { MockAuthAccessOptions, StoredUser } from './mock-auth-access';

export { MockPhotoAccess } from './mock-photo-access';

export { provideHonuwareAccessMock } from './provide-honuware-access-mock';
export type { HonuwareAccessMocks, ProvideHonuwareAccessMockOptions } from './provide-honuware-access-mock';
