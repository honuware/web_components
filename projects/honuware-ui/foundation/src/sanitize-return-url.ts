// Open-redirect defense for a post-login `returnUrl` query parameter. An
// unvalidated returnUrl lets an attacker craft a phishing flow like
// `/login?returnUrl=https://evil.example/` — the user logs in legitimately and
// then gets bounced to an attacker-controlled origin.
//
// Restricts returnUrl to same-origin paths under a known feature area. The
// allow-list is a REQUIRED parameter (foundation sits below auth, so it can't
// default to the auth-routes allow-list) — callers pass their own set of
// permitted path prefixes. Returns `/` for any input that's missing,
// non-string, or fails the same-origin + allow-list checks; the default-deny
// stance degrades safely to a home-page redirect.
export function sanitizeReturnUrl(
  raw: string | null | undefined,
  allowlist: ReadonlyArray<string>,
): string {
  if (typeof raw !== 'string' || raw.length === 0) return '/';
  // Reject anything that escapes same-origin:
  //   - Protocol-relative URLs (`//evil.com/...`)
  //   - Backslash-prefixed variants (`/\evil.com` — some browsers
  //     normalize backslashes to forward slashes during navigation)
  //   - Anything that doesn't start with a single `/`
  if (!raw.startsWith('/')) return '/';
  if (raw.startsWith('//')) return '/';
  if (raw.startsWith('/\\')) return '/';
  // Allow the exact root path.
  if (raw === '/') return '/';
  // Otherwise require a known prefix followed by either end-of-string
  // or another `/` (so `/admin` matches `/admin` and `/admin/users`,
  // but NOT a hypothetical `/administer-evil` route).
  for (const prefix of allowlist) {
    if (raw === prefix || raw.startsWith(prefix + '/')) {
      return raw;
    }
  }
  return '/';
}
