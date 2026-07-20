import { InjectionToken } from '@angular/core';

// Client-side Square Web Payments SDK configuration. These are public
// identifiers (safe to expose in the bundle). Injected so the payment service
// no longer imports a consumer's `environment` file — the app wires the real
// values in `app.config.ts` from `environment.square`, and a honuware consumer
// (or a test) provides its own. The default below is a benign sandbox
// placeholder that will not tokenize a real card.
export interface SquareConfig {
  applicationId: string;
  locationId: string;
  scriptUrl: string;
}

export const SQUARE_CONFIG = new InjectionToken<SquareConfig>('SQUARE_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    applicationId: 'sandbox-sq0idp-placeholder',
    locationId: 'placeholder',
    scriptUrl: 'https://sandbox.web.squarecdn.com/v1/square.js',
  }),
});
