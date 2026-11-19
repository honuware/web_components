import { Observable, of, throwError } from 'rxjs';
import {
  ImageUploadLimit,
  ImageUploadSettings,
  ImageUploadSettingsAccess,
} from '@honuware/ui/access';

const MEGABYTE = 1024 * 1024;

/**
 * In-memory {@link ImageUploadSettingsAccess} simulator: the server's default
 * (10 MB) and range (1 to 50 MB), and its refusal of a limit outside the range
 * (a 400 whose `error.detail` is the server's message, as HttpErrorResponse
 * carries it). Signed-in and admin checks aren't simulated.
 */
export class MockImageUploadSettingsAccess implements ImageUploadSettingsAccess {
  static readonly DEFAULT_BYTES = 10 * MEGABYTE;
  static readonly MINIMUM_BYTES = 1 * MEGABYTE;
  static readonly MAXIMUM_BYTES = 50 * MEGABYTE;

  /** The stored limit. Tests may set it directly. */
  maxUploadBytes = MockImageUploadSettingsAccess.DEFAULT_BYTES;

  getUploadLimit(): Observable<ImageUploadLimit> {
    return of({ max_upload_bytes: this.maxUploadBytes });
  }

  getSettings(): Observable<ImageUploadSettings> {
    return of(this.settings());
  }

  saveSettings(maxUploadBytes: number): Observable<ImageUploadSettings> {
    if (!Number.isInteger(maxUploadBytes)) {
      return refused('The upload limit must be a whole number of bytes.');
    }
    if (maxUploadBytes < MockImageUploadSettingsAccess.MINIMUM_BYTES
        || maxUploadBytes > MockImageUploadSettingsAccess.MAXIMUM_BYTES) {
      return refused('The upload limit must be from 1 to 50 MB.');
    }
    this.maxUploadBytes = maxUploadBytes;
    return of(this.settings());
  }

  private settings(): ImageUploadSettings {
    return {
      max_upload_bytes: this.maxUploadBytes,
      default_bytes: MockImageUploadSettingsAccess.DEFAULT_BYTES,
      minimum_bytes: MockImageUploadSettingsAccess.MINIMUM_BYTES,
      maximum_bytes: MockImageUploadSettingsAccess.MAXIMUM_BYTES,
    };
  }
}

function refused(detail: string): Observable<never> {
  return throwError(() => ({
    status: 400,
    error: { type: 'validation_error', status: 400, detail, field: 'max_upload_bytes' },
  }));
}
