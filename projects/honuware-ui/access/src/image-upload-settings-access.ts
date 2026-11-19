import { Observable } from 'rxjs';

// The image upload limit: the largest image anyone may upload, which the
// server's upload routes enforce (`image_max_upload_bytes`; honuware_platform's
// image_upload_settings endpoints). 10 MB by default; an admin may set 1 to
// 50 MB.
//
// Its own seam rather than more PhotoAccess methods, so an app that
// implements PhotoAccess itself (knottyyoga's ServerAccess extends it) keeps
// compiling. hw-photo-upload reads the limit to say a file is too big before
// sending it; hw-image-upload-settings reads and saves it.

/** GET /api/image_upload_limit — any signed-in session. */
export interface ImageUploadLimit {
  max_upload_bytes: number;
}

/** GET / PUT /api/admin/image_upload_settings — admin_portal. */
export interface ImageUploadSettings extends ImageUploadLimit {
  default_bytes: number;
  minimum_bytes: number;
  maximum_bytes: number;
}

export interface ImageUploadSettingsAccess {
  /** The limit, for anyone signed in. */
  getUploadLimit(): Observable<ImageUploadLimit>;
  /** The limit and the range an admin may choose from. */
  getSettings(): Observable<ImageUploadSettings>;
  /**
   * Saves a new limit, in bytes. One outside the range is refused with a 400
   * whose `detail` says why (field `max_upload_bytes`).
   */
  saveSettings(maxUploadBytes: number): Observable<ImageUploadSettings>;
}
