/**
 * RFC 7807 Problem Details for HTTP APIs
 * https://tools.ietf.org/html/rfc7807
 */
export interface ProblemDetails {
  /** Error type identifier (e.g., "validation_error") */
  type: string;
  /** Short human-readable summary */
  title: string;
  /** HTTP status code */
  status: number;
  /** Human-readable explanation for this specific occurrence */
  detail: string;
  /** URI reference identifying the specific occurrence (optional) */
  instance?: string;
  /** For validation errors, which field failed (extension) */
  field?: string;
  /** What constraint was violated (extension) */
  constraint?: string;
  /** For payment errors, which provider (extension) */
  provider?: string;
  /** Provider's error code (extension) */
  provider_code?: string;
  /** Allow additional extension fields */
  [key: string]: unknown;
}

/** Error type constants matching server-side ErrorCodes */
export const ErrorTypes = {
  VALIDATION_ERROR: 'validation_error',
  BAD_REQUEST: 'bad_request',
  NOT_AUTHENTICATED: 'not_authenticated',
  INVALID_CREDENTIALS: 'invalid_credentials',
  SESSION_EXPIRED: 'session_expired',
  NOT_AUTHORIZED: 'not_authorized',
  NOT_FOUND: 'not_found',
  IDEMPOTENCY_CONFLICT: 'idempotency_conflict',
  INTERNAL_ERROR: 'internal_error',
  PAYMENT_DECLINED: 'payment_declined',
  PAYMENT_FAILED: 'payment_failed',
  VOUCHER_INVALID: 'voucher_invalid',
  SEATS_EXCEEDED: 'seats_exceeded',
  BOOKING_CONFLICT: 'booking_conflict',
} as const;

export type ErrorType = (typeof ErrorTypes)[keyof typeof ErrorTypes];

/** Check if an error response is in RFC 7807 format */
export function isProblemDetails(error: unknown): error is ProblemDetails {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'status' in error &&
    typeof (error as ProblemDetails).type === 'string' &&
    typeof (error as ProblemDetails).status === 'number'
  );
}
