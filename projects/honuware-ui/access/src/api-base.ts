import { InjectionToken } from '@angular/core';

// Base path for the honuware server API. Relative '/api' matches every
// current deployment shape (Angular dev proxy, same-origin Nginx/CloudFront);
// a consumer hosting the API elsewhere overrides this token.
export const HONUWARE_API_BASE = new InjectionToken<string>(
  'HONUWARE_API_BASE',
  {
    providedIn: 'root',
    factory: () => '/api',
  }
);
