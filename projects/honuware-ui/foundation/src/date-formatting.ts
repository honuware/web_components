export function isMicrosecondTimestamp(value: string): boolean {
  return /^\d{11,}$/.test(value);
}

export function microsToDate(value: string): Date {
  return new Date(Number(value) / 1000);
}

export function dateToMicros(date: Date): string {
  return String(date.getTime() * 1000);
}

const ONE_DAY_US = 86400000000;

/**
 * Format a microsecond timestamp as a UTC calendar date.
 * Use for dates that represent calendar days stored as UTC midnight
 * (e.g., period_start_us, valid_from_us, next_billing_us).
 */
export function formatCalendarDate(value: string | number, long = false): string {
  const us = typeof value === 'string' ? Number(value) : value;
  if (!us || isNaN(us)) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: long ? 'long' : 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(us / 1000));
}

/**
 * Format an exclusive-end microsecond timestamp as an inclusive UTC date.
 * Subtracts 1 day to convert from "first moment of next period" to "last day of period".
 * Use for period_end_us, valid_to_us where the stored value is the start of the next period.
 */
export function formatPeriodEndDate(value: string | number, long = false): string {
  const us = typeof value === 'string' ? Number(value) : value;
  if (!us || isNaN(us)) return '';
  return formatCalendarDate(us - ONE_DAY_US, long);
}

/** Get the UTC year from a microsecond timestamp string. */
export function getUtcYear(value: string): number {
  return new Date(Number(value) / 1000).getUTCFullYear();
}

/** Get the UTC month (0-indexed) from a microsecond timestamp string. */
export function getUtcMonth(value: string): number {
  return new Date(Number(value) / 1000).getUTCMonth();
}

// ---------------------------------------------------------------------------
// Local calendar-date arithmetic (used by the calendar views). These operate
// on local-time Date objects and never mutate their inputs.
// ---------------------------------------------------------------------------

export function areSameDates(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/** The Sunday starting the week containing `date` (local time). */
export function firstDayOfWeek(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - date.getDay()
  );
}

/** The Saturday ending the week containing `date` (local time). */
export function lastDayOfWeek(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - date.getDay() + 6
  );
}

export function firstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Expects the first day of a month; returns that month's last day. */
export function lastDayOfMonth(date: Date): Date {
  return addDaysToDate(addMonthsToDate(date, 1), -1);
}

export function addDaysToDate(date: Date, days: number): Date {
  const dateValue = new Date(date.valueOf());
  return new Date(dateValue.setDate(dateValue.getDate() + days));
}

export function addWeeksToDate(date: Date, weeks: number): Date {
  return addDaysToDate(date, weeks * 7);
}

export function addMonthsToDate(date: Date, months: number): Date {
  const dateValue = new Date(date.valueOf());
  return new Date(dateValue.setMonth(dateValue.getMonth() + months));
}

export function formatMicroseconds(value: string): string {
  if (!value || !isMicrosecondTimestamp(value)) {
    return value;
  }

  const date = microsToDate(value);
  if (isNaN(date.getTime())) {
    return value;
  }

  const now = Date.now();
  const diffMs = now - date.getTime();

  if (diffMs < 60 * 1000) {
    return 'just now';
  }

  if (diffMs < 60 * 60 * 1000) {
    const minutes = Math.floor(diffMs / (60 * 1000));
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }

  if (diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}
