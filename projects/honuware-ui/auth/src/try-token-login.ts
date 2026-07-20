import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

// Phase 10.1 of the security review: try silent re-auth at bootstrap so
// the SPA hydrates `authData$` BEFORE the first route activates. Without
// this an authenticated user lands on a public-looking shell, sees the
// guarded route bounce them to /login, and only then gets logged in by
// the device-token flow.
//
// Returns a thunk (factory) so Angular invokes it AFTER DI sets up the
// AuthService graph. We resolve regardless of outcome — a network blip
// or invalid cookie should not block app bootstrap. A consumer wires this
// into an APP_INITIALIZER with `deps: [AuthService]`.
export function tryTokenLoginInitializer(authService: AuthService): () => Promise<void> {
  return () =>
    firstValueFrom(authService.tryTokenLogin())
      .then(() => void 0)
      .catch(() => void 0);
}
