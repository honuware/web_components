import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetails, isProblemDetails } from './ApiError';

@Injectable({
  providedIn: 'root',
})
export class ErrorService {
  /**
   * Parse an HTTP error response into RFC 7807 ProblemDetails format.
   * Handles both new RFC 7807 responses and legacy plain-text errors.
   */
  parseError(error: HttpErrorResponse): ProblemDetails {
    // Check if response is already RFC 7807 format
    if (isProblemDetails(error.error)) {
      return error.error;
    }

    // Fallback for legacy plain-text errors
    return {
      type: this.inferTypeFromStatus(error.status),
      title: this.getTitleForStatus(error.status),
      status: error.status,
      detail: this.extractDetailFromError(error),
    };
  }

  /**
   * Get user-friendly message from a ProblemDetails error.
   * The detail field should already be user-friendly.
   */
  getUserFriendlyMessage(error: ProblemDetails): string {
    return error.detail || error.title || 'An error occurred';
  }

  private inferTypeFromStatus(status: number): string {
    switch (status) {
      case 400:
        return 'bad_request';
      case 401:
        return 'not_authenticated';
      case 403:
        return 'not_authorized';
      case 404:
        return 'not_found';
      case 409:
        return 'idempotency_conflict';
      case 402:
        return 'payment_failed';
      default:
        return 'internal_error';
    }
  }

  private getTitleForStatus(status: number): string {
    switch (status) {
      case 400:
        return 'Bad Request';
      case 401:
        return 'Authentication Required';
      case 403:
        return 'Not Authorized';
      case 404:
        return 'Not Found';
      case 409:
        return 'Conflict';
      case 402:
        return 'Payment Failed';
      case 500:
        return 'Internal Server Error';
      default:
        return 'Error';
    }
  }

  private extractDetailFromError(error: HttpErrorResponse): string {
    // If error body is a string, use it directly
    if (typeof error.error === 'string' && error.error.length > 0) {
      return error.error;
    }

    // If there's an error message property
    if (error.error?.message) {
      return error.error.message;
    }

    // Use HTTP status text as fallback
    if (error.statusText && error.statusText !== 'Unknown Error') {
      return error.statusText;
    }

    // Final fallback
    return 'An unexpected error occurred. Please try again later.';
  }
}
