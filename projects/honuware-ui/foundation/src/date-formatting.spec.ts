import {
  isMicrosecondTimestamp, microsToDate, dateToMicros, formatMicroseconds,
  formatCalendarDate, formatPeriodEndDate, getUtcYear, getUtcMonth,
  areSameDates, firstDayOfWeek, lastDayOfWeek, firstDayOfMonth,
  lastDayOfMonth, addDaysToDate, addWeeksToDate, addMonthsToDate,
} from './date-formatting';

describe('DateFormatting', () => {
  describe('isMicrosecondTimestamp', () => {
    it('should return true for a 16-digit microsecond timestamp', () => {
      expect(isMicrosecondTimestamp('1708358400000000')).toBeTrue();
    });

    it('should return true for an 11-digit number', () => {
      expect(isMicrosecondTimestamp('10000000000')).toBeTrue();
    });

    it('should return false for a short number', () => {
      expect(isMicrosecondTimestamp('42')).toBeFalse();
    });

    it('should return false for non-numeric string', () => {
      expect(isMicrosecondTimestamp('hello')).toBeFalse();
    });

    it('should return false for an ISO date string', () => {
      expect(isMicrosecondTimestamp('2026-02-18T14:30:00Z')).toBeFalse();
    });

    it('should return false for empty string', () => {
      expect(isMicrosecondTimestamp('')).toBeFalse();
    });
  });

  describe('microsToDate', () => {
    it('should convert microseconds to correct Date', () => {
      // 1708358400000000 microseconds = 1708358400000 ms = Feb 19, 2024 12:00:00 UTC
      const date = microsToDate('1708358400000000');
      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(1); // February (0-indexed)
      expect(date.getUTCDate()).toBe(19);
    });
  });

  describe('dateToMicros', () => {
    it('should convert Date to microsecond string', () => {
      const date = new Date(1708358400000); // Feb 19, 2024 12:00:00 UTC
      expect(dateToMicros(date)).toBe('1708358400000000');
    });
  });

  describe('round-trip', () => {
    it('should preserve value through microsToDate then dateToMicros', () => {
      const original = '1708358400000000';
      const result = dateToMicros(microsToDate(original));
      expect(result).toBe(original);
    });
  });

  describe('formatMicroseconds', () => {
    it('should return raw value for non-numeric input', () => {
      expect(formatMicroseconds('not-a-number')).toBe('not-a-number');
    });

    it('should return raw value for empty string', () => {
      expect(formatMicroseconds('')).toBe('');
    });

    it('should format old date as absolute', () => {
      // A date well in the past: Jan 15, 2024 12:00:00 UTC = 1705320000000 ms = 1705320000000000 us
      // Using midday to avoid timezone boundary issues
      const result = formatMicroseconds('1705320000000000');
      // Should contain "Jan" and "2024" in any timezone
      expect(result).toContain('Jan');
      expect(result).toContain('2024');
    });

    it('should format very recent timestamp as "just now"', () => {
      const nowMicros = String(Date.now() * 1000);
      expect(formatMicroseconds(nowMicros)).toBe('just now');
    });

    it('should format minutes ago', () => {
      const fiveMinAgoMicros = String((Date.now() - 5 * 60 * 1000) * 1000);
      expect(formatMicroseconds(fiveMinAgoMicros)).toBe('5 minutes ago');
    });

    it('should format hours ago', () => {
      const threeHoursAgoMicros = String((Date.now() - 3 * 3600 * 1000) * 1000);
      expect(formatMicroseconds(threeHoursAgoMicros)).toBe('3 hours ago');
    });

    it('should format 1 minute ago as singular', () => {
      const oneMinAgoMicros = String((Date.now() - 1 * 60 * 1000) * 1000);
      expect(formatMicroseconds(oneMinAgoMicros)).toBe('1 minute ago');
    });

    it('should format 1 hour ago as singular', () => {
      const oneHourAgoMicros = String((Date.now() - 1 * 3600 * 1000) * 1000);
      expect(formatMicroseconds(oneHourAgoMicros)).toBe('1 hour ago');
    });

    it('should return raw value for short numbers', () => {
      expect(formatMicroseconds('42')).toBe('42');
    });
  });

  describe('formatCalendarDate', () => {
    // March 1, 2026 00:00:00 UTC = 1772323200000 ms = 1772323200000000 us
    const march1Us = 1772323200000000;
    // April 1, 2026 00:00:00 UTC = 1775001600000 ms = 1775001600000000 us
    const april1Us = 1775001600000000;

    it('should format March 1 UTC as "Mar 1, 2026" regardless of local timezone', () => {
      expect(formatCalendarDate(march1Us)).toBe('Mar 1, 2026');
    });

    it('should format April 1 UTC as "Apr 1, 2026" regardless of local timezone', () => {
      expect(formatCalendarDate(april1Us)).toBe('Apr 1, 2026');
    });

    it('should format in long form when requested', () => {
      expect(formatCalendarDate(march1Us, true)).toBe('March 1, 2026');
    });

    it('should accept string input', () => {
      expect(formatCalendarDate(String(march1Us))).toBe('Mar 1, 2026');
    });

    it('should return empty string for zero', () => {
      expect(formatCalendarDate(0)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(formatCalendarDate('')).toBe('');
    });
  });

  describe('formatPeriodEndDate', () => {
    // April 1, 2026 00:00:00 UTC (exclusive end of March)
    const april1Us = 1775001600000000;

    it('should display exclusive end as inclusive last day of period', () => {
      // April 1 minus 1 day = March 31
      expect(formatPeriodEndDate(april1Us)).toBe('Mar 31, 2026');
    });

    it('should display in long form when requested', () => {
      expect(formatPeriodEndDate(april1Us, true)).toBe('March 31, 2026');
    });

    it('should accept string input', () => {
      expect(formatPeriodEndDate(String(april1Us))).toBe('Mar 31, 2026');
    });

    it('should handle year boundary (Jan 1 exclusive end shows Dec 31)', () => {
      // Jan 1, 2027 00:00:00 UTC = 1798761600000 ms = 1798761600000000 us
      const jan1_2027Us = 1798761600000000;
      expect(formatPeriodEndDate(jan1_2027Us)).toBe('Dec 31, 2026');
    });

    it('should return empty string for zero', () => {
      expect(formatPeriodEndDate(0)).toBe('');
    });
  });

  describe('getUtcYear', () => {
    it('should return UTC year for March 1 2026 timestamp', () => {
      // March 1, 2026 00:00:00 UTC
      expect(getUtcYear('1772323200000000')).toBe(2026);
    });

    it('should not be affected by local timezone', () => {
      // This is the key test: March 1 UTC should be year 2026, not 2025
      // even if local time would be Feb 28 in a western timezone
      expect(getUtcYear('1772323200000000')).toBe(2026);
    });
  });

  describe('getUtcMonth', () => {
    it('should return UTC month (0-indexed) for March 1 2026 timestamp', () => {
      // March 1, 2026 00:00:00 UTC → month 2 (March, 0-indexed)
      expect(getUtcMonth('1772323200000000')).toBe(2);
    });

    it('should not be affected by local timezone', () => {
      // March 1 UTC should be month 2 (March), not month 1 (February)
      expect(getUtcMonth('1772323200000000')).toBe(2);
    });
  });

  // Local calendar-date arithmetic (moved here from the retired
  // DateFunctionsService — the calendar views are the consumers).
  describe('areSameDates', () => {
    it('should return true for two moments on the same local day', () => {
      expect(areSameDates(new Date(2026, 6, 18, 1), new Date(2026, 6, 18, 23))).toBeTrue();
    });

    it('should return false for different days, months, and years', () => {
      expect(areSameDates(new Date(2026, 6, 18), new Date(2026, 6, 19))).toBeFalse();
      expect(areSameDates(new Date(2026, 6, 18), new Date(2026, 5, 18))).toBeFalse();
      expect(areSameDates(new Date(2026, 6, 18), new Date(2025, 6, 18))).toBeFalse();
    });
  });

  describe('firstDayOfWeek / lastDayOfWeek', () => {
    it('should return the surrounding Sunday and Saturday for a mid-week date', () => {
      // Wed Jul 15 2026 → week runs Sun Jul 12 .. Sat Jul 18.
      const wednesday = new Date(2026, 6, 15);
      expect(areSameDates(firstDayOfWeek(wednesday), new Date(2026, 6, 12))).toBeTrue();
      expect(areSameDates(lastDayOfWeek(wednesday), new Date(2026, 6, 18))).toBeTrue();
    });

    it('should be identity on Sunday for firstDayOfWeek and cross months when needed', () => {
      const sunday = new Date(2026, 6, 12);
      expect(areSameDates(firstDayOfWeek(sunday), sunday)).toBeTrue();
      // Wed Jul 1 2026 → the week starts Sun Jun 28.
      expect(areSameDates(firstDayOfWeek(new Date(2026, 6, 1)), new Date(2026, 5, 28))).toBeTrue();
    });
  });

  describe('firstDayOfMonth / lastDayOfMonth', () => {
    it('should return the 1st of the month for any day in it', () => {
      expect(areSameDates(firstDayOfMonth(new Date(2026, 6, 18)), new Date(2026, 6, 1))).toBeTrue();
    });

    it('should return the month\'s last day when given its first day', () => {
      expect(areSameDates(lastDayOfMonth(new Date(2026, 6, 1)), new Date(2026, 6, 31))).toBeTrue();
      // Leap-year February.
      expect(areSameDates(lastDayOfMonth(new Date(2028, 1, 1)), new Date(2028, 1, 29))).toBeTrue();
    });
  });

  describe('addDaysToDate / addWeeksToDate / addMonthsToDate', () => {
    it('should add and subtract days across month boundaries', () => {
      expect(areSameDates(addDaysToDate(new Date(2026, 6, 31), 1), new Date(2026, 7, 1))).toBeTrue();
      expect(areSameDates(addDaysToDate(new Date(2026, 7, 1), -1), new Date(2026, 6, 31))).toBeTrue();
    });

    it('should not mutate the input date', () => {
      const input = new Date(2026, 6, 18);
      addDaysToDate(input, 5);
      addMonthsToDate(input, 2);
      expect(areSameDates(input, new Date(2026, 6, 18))).toBeTrue();
    });

    it('should add whole weeks', () => {
      expect(areSameDates(addWeeksToDate(new Date(2026, 6, 12), 1), new Date(2026, 6, 19))).toBeTrue();
      expect(areSameDates(addWeeksToDate(new Date(2026, 6, 12), -2), new Date(2026, 5, 28))).toBeTrue();
    });

    it('should add and subtract months from a first-of-month anchor', () => {
      expect(areSameDates(addMonthsToDate(new Date(2026, 6, 1), 1), new Date(2026, 7, 1))).toBeTrue();
      expect(areSameDates(addMonthsToDate(new Date(2026, 0, 1), -1), new Date(2025, 11, 1))).toBeTrue();
    });
  });
});
