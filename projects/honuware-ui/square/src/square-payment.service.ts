import { Inject, Injectable } from '@angular/core';
import { Payments, Card } from './square-sdk';
import { SQUARE_CONFIG, SquareConfig } from './square-config';

/**
 * Service for handling Square Web Payments SDK integration.
 * Dynamically loads the Square SDK script based on the injected SQUARE_CONFIG.
 *
 * @example
 * ```typescript
 * // In a component
 * async ngAfterViewInit() {
 *   await this.squarePayment.attachCard('#card-container');
 * }
 *
 * async onSubmit() {
 *   const token = await this.squarePayment.tokenizeCard();
 *   // Send token to server
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class SquarePaymentService {
  private payments: Payments | null = null;
  private card: Card | null = null;
  private scriptLoaded = false;

  constructor(@Inject(SQUARE_CONFIG) private squareConfig: SquareConfig) {}

  /**
   * Dynamically loads the Square SDK script based on the injected config.
   * Only loads once; subsequent calls return immediately.
   */
  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.scriptLoaded || window.Square) {
        this.scriptLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = this.squareConfig.scriptUrl;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Square SDK'));
      document.head.appendChild(script);
    });
  }

  /**
   * Initializes the Square Payments SDK.
   * Automatically loads the script if not already loaded.
   */
  async initialize(): Promise<void> {
    await this.loadScript();

    if (!window.Square) {
      throw new Error('Square SDK not available after loading');
    }

    this.payments = await window.Square.payments(
      this.squareConfig.applicationId,
      this.squareConfig.locationId
    );
  }

  /**
   * Attaches the Square card input form to a DOM element.
   * @param containerId CSS selector for the container element (e.g., '#card-container')
   */
  async attachCard(containerId: string): Promise<void> {
    if (!this.payments) {
      await this.initialize();
    }
    this.card = await this.payments!.card();
    await this.card.attach(containerId);
  }

  /**
   * Tokenizes the card data entered by the user.
   * @returns The payment token to send to the server
   * @throws Error if tokenization fails
   */
  async tokenizeCard(): Promise<string> {
    if (!this.card) {
      throw new Error('Card not attached. Call attachCard() first.');
    }

    const result = await this.card.tokenize();

    if (result.status !== 'OK' || !result.token) {
      const errorMessage = result.errors?.[0]?.message || 'Card tokenization failed';
      throw new Error(errorMessage);
    }

    return result.token;
  }

  /**
   * Destroys the card form and resets state.
   * Call this when navigating away from the payment page.
   */
  destroy(): void {
    this.card = null;
    this.payments = null;
    // Note: We don't unload the script as it may be needed again
  }
}
