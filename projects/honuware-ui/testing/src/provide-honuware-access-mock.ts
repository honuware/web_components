import { Provider } from '@angular/core';
import { provideHonuwareAccess } from '@honuware/ui/access';
import { MockCrudAccess, MockCrudAccessOptions } from './mock-crud-access';
import { MockAuthAccess, MockAuthAccessOptions } from './mock-auth-access';
import { MockPhotoAccess } from './mock-photo-access';

export interface HonuwareAccessMocks {
  crud: MockCrudAccess;
  auth: MockAuthAccess;
  photo: MockPhotoAccess;
}

export interface ProvideHonuwareAccessMockOptions {
  crud?: MockCrudAccessOptions;
  auth?: MockAuthAccessOptions;
}

/**
 * Test wiring: creates the three in-memory framework mocks and provides them for
 * the `HONUWARE_*_ACCESS` tokens (mock mode of `provideHonuwareAccess`). Pass a
 * `capture` callback to grab the mock instances for seeding/assertions.
 *
 * @example
 * let mocks: HonuwareAccessMocks;
 * TestBed.configureTestingModule({
 *   providers: [provideHonuwareAccessMock({ crud: { schema } }, (m) => (mocks = m))],
 * });
 */
export function provideHonuwareAccessMock(
  options: ProvideHonuwareAccessMockOptions = {},
  capture?: (mocks: HonuwareAccessMocks) => void,
): Provider[] {
  const mocks: HonuwareAccessMocks = {
    crud: new MockCrudAccess(options.crud),
    auth: new MockAuthAccess(options.auth),
    photo: new MockPhotoAccess(),
  };
  capture?.(mocks);
  return provideHonuwareAccess({
    mode: 'mock',
    crud: mocks.crud,
    auth: mocks.auth,
    photo: mocks.photo,
  });
}
