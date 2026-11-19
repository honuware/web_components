/*
 * @honuware/ui/photos — the photo-upload control (drag-drop, client-side
 * resize/re-encode to JPEG, deferred-upload mode for create flows, userMode
 * avatar path), the shrink step it uses (public, for an app that sends a file
 * itself), and the upload-limit settings card. Depends on access (PhotoAccess
 * and ImageUploadSettingsAccess seams + PhotoUrlBuilder). Selectors use the
 * `hw-` prefix.
 */
export { PhotoUploadComponent } from './photo-upload/photo-upload.component';
export { ImageUploadSettingsComponent } from './image-upload-settings/image-upload-settings.component';
export {
  MAX_UPLOAD_IMAGE_DIMENSION,
  ImageTooLargeError,
  checkImageUploadSize,
  formatMegabytes,
  isVectorImage,
  prepareImageForUpload,
} from './prepare-image-for-upload';
export type { PreparedImage } from './prepare-image-for-upload';
