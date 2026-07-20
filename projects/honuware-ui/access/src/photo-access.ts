import { Observable } from 'rxjs';
import { SourcePhotoInfo } from './photo.types';

// The framework photo-attachment surface of the server (honuware_platform's
// photo endpoints — any table row registered for photo support can carry one
// photo). photo-upload injects HONUWARE_PHOTO_ACCESS (see access-tokens.ts)
// instead of the full ServerAccess. Signatures are verbatim from ServerAccess,
// which extends this interface. Scaled-photo display URLs are built by
// PhotoUrlBuilder, not a method here (they're <img src> targets, not XHRs).
// getHomePagePhotos is NOT part of this interface — home_page_photos is an
// app-side table.

export interface PhotoAccess {
  uploadPhoto(tableName: string, tableItemId: number, imageData: ArrayBuffer, imageType: string): Observable<SourcePhotoInfo>;
  uploadUserPhoto(imageData: ArrayBuffer, imageType: string): Observable<SourcePhotoInfo>;
  deletePhoto(tableName: string, tableItemId: number): Observable<void>;
  hasPhoto(tableName: string, tableItemId: number): Observable<{ has_photo: boolean }>;
}
