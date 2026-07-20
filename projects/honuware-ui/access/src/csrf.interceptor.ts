import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';

const CSRF_COOKIE_NAME = 'csrft';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

const STATE_CHANGING_METHODS = new Set<string>([
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

/**
 * Phase 4.3 of the security review: companion to the server-side
 * CsrfGuard middleware.
 *
 * On every state-changing request, read the `csrft` cookie that the
 * backend set at login time (Phase 4.1), and copy its value into the
 * `X-CSRF-Token` header. The double-submit pattern: an attacker on
 * a different origin cannot read the cookie value across origins, so
 * they can't forge a matching header.
 *
 * GETs / HEADs / OPTIONS pass through untouched. Requests that fire
 * before the user has logged in (no cookie present) pass through
 * unmodified — the server-side guard exempts the bootstrap endpoints
 * (login / register / remember / verify) explicitly, so these still
 * succeed.
 */
@Injectable()
export class CsrfInterceptor implements HttpInterceptor {
  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (!STATE_CHANGING_METHODS.has(request.method.toUpperCase())) {
      return next.handle(request);
    }

    const token = this.readCsrfCookie();
    if (!token) {
      return next.handle(request);
    }

    const cloned = request.clone({
      setHeaders: { [CSRF_HEADER_NAME]: token },
    });
    return next.handle(cloned);
  }

  private readCsrfCookie(): string | null {
    if (typeof document === 'undefined' || !document.cookie) return null;
    const pairs = document.cookie.split(';');
    for (const pair of pairs) {
      const eq = pair.indexOf('=');
      if (eq < 0) continue;
      const key = pair.slice(0, eq).trim();
      if (key === CSRF_COOKIE_NAME) {
        return pair.slice(eq + 1).trim();
      }
    }
    return null;
  }
}
