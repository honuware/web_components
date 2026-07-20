import { sanitizeReturnUrl } from './sanitize-return-url';

// Moved out of login.component.spec.ts when sanitizeReturnUrl became a
// foundation utility (Phase 2.2). The allow-list is now a required parameter
// (foundation sits below auth), so every case passes an explicit set.
describe('sanitizeReturnUrl', () => {
  const ALLOW = ['/my', '/admin', '/manage', '/staff', '/calendar', '/shop'];

  it('rejects null/undefined/empty by returning "/"', () => {
    expect(sanitizeReturnUrl(null, ALLOW)).toBe('/');
    expect(sanitizeReturnUrl(undefined, ALLOW)).toBe('/');
    expect(sanitizeReturnUrl('', ALLOW)).toBe('/');
  });

  it('rejects absolute http/https URLs', () => {
    expect(sanitizeReturnUrl('http://evil.example/x', ALLOW)).toBe('/');
    expect(sanitizeReturnUrl('https://evil.example/x', ALLOW)).toBe('/');
    expect(sanitizeReturnUrl('HtTpS://evil.example/x', ALLOW)).toBe('/');
  });

  it('rejects protocol-relative URLs', () => {
    expect(sanitizeReturnUrl('//evil.example/x', ALLOW)).toBe('/');
    expect(sanitizeReturnUrl('//evil.example', ALLOW)).toBe('/');
  });

  it('rejects backslash-prefixed paths', () => {
    expect(sanitizeReturnUrl('/\\evil.example/x', ALLOW)).toBe('/');
  });

  it('rejects relative paths that do not start with /', () => {
    expect(sanitizeReturnUrl('evil.example/x', ALLOW)).toBe('/');
    expect(sanitizeReturnUrl('my/account', ALLOW)).toBe('/');
  });

  it('rejects javascript: and data: URIs', () => {
    expect(sanitizeReturnUrl('javascript:alert(1)', ALLOW)).toBe('/');
    expect(sanitizeReturnUrl('data:text/html,<script>...</script>', ALLOW)).toBe('/');
  });

  it('allows the root path exactly', () => {
    expect(sanitizeReturnUrl('/', ALLOW)).toBe('/');
  });

  it('allows known prefixes exactly and with sub-paths', () => {
    for (const p of ALLOW) {
      expect(sanitizeReturnUrl(p, ALLOW)).toBe(p);
      expect(sanitizeReturnUrl(p + '/sub/path', ALLOW)).toBe(p + '/sub/path');
    }
  });

  it('rejects almost-matches that share a prefix but cross a boundary', () => {
    expect(sanitizeReturnUrl('/administer-evil', ALLOW)).toBe('/');
    expect(sanitizeReturnUrl('/shopify-attack', ALLOW)).toBe('/');
    expect(sanitizeReturnUrl('/myaccount-something', ALLOW)).toBe('/');
  });

  it('rejects paths outside the allow-list even when same-origin', () => {
    expect(sanitizeReturnUrl('/login', ALLOW)).toBe('/');
    expect(sanitizeReturnUrl('/register', ALLOW)).toBe('/');
    expect(sanitizeReturnUrl('/about', ALLOW)).toBe('/');
  });

  it('honors a caller-supplied allow-list', () => {
    const custom = ['/portal', '/reports'];
    expect(sanitizeReturnUrl('/portal', custom)).toBe('/portal');
    expect(sanitizeReturnUrl('/reports/2026', custom)).toBe('/reports/2026');
    expect(sanitizeReturnUrl('/my/account', custom)).toBe('/');
  });
});
