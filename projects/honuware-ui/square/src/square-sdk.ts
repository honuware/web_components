/**
 * TypeScript declarations for the Square Web Payments SDK.
 * @see https://developer.squareup.com/docs/web-payments/overview
 *
 * The interfaces are exported so SquarePaymentService can import them; that
 * import also brings the `Window.Square` global augmentation below into scope
 * (an ambient `.d.ts` wouldn't be picked up by ng-packagr's per-entry build).
 */
export interface Payments {
  card(): Promise<Card>;
}

export interface Card {
  attach(selector: string): Promise<void>;
  tokenize(): Promise<TokenizeResult>;
}

export interface TokenizeResult {
  status: 'OK' | 'ERROR';
  token?: string;
  errors?: Array<{ message: string }>;
}

declare global {
  interface Window {
    Square: {
      payments(appId: string, locationId: string): Promise<Payments>;
    };
  }
}
