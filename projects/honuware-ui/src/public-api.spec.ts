import { HONUWARE_UI_VERSION } from './public-api';

// Proves the library's Karma/Jasmine test target is wired (Phase 2.1). Real
// specs move into the entry points in Phase 2.2.
describe('@honuware/ui', () => {
  it('exposes a version', () => {
    expect(HONUWARE_UI_VERSION).toBe('0.1.0');
  });
});
