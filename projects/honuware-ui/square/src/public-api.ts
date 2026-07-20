/*
 * @honuware/ui/square — SquarePaymentService behind the SQUARE_CONFIG token
 * (Web Payments SDK loader + card tokenizer). A standalone side entry that
 * depends on nothing internal. The Square SDK ambient types ship in square.d.ts.
 */
export { SquarePaymentService } from './square-payment.service';
export { SQUARE_CONFIG } from './square-config';
export type { SquareConfig } from './square-config';
