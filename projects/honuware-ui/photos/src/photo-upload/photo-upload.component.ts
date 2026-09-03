import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, Inject } from '@angular/core';

import { Observable, of, from } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PhotoAccess, HONUWARE_PHOTO_ACCESS, PhotoUrlBuilder } from '@honuware/ui/access';

@Component({
  selector: 'hw-photo-upload',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './photo-upload.component.html',
  styleUrls: ['./photo-upload.component.scss']
})
export class PhotoUploadComponent implements OnInit, OnChanges, OnDestroy {
  @Input() tableName!: string;
  @Input() tableItemId!: number;
  @Input() userMode: boolean = false;
  @Input() deferUpload: boolean = false;

  // Must match the server's image_max_source_width / image_max_source_height
  // defaults. Images larger than this are resized on the client before upload
  // so they stay under the server's image_max_upload_bytes limit.
  //
  // Does not apply to a VECTOR — see isVector.
  private static readonly MAX_IMAGE_DIMENSION = 4096;

  photoUrl: string = '';
  hasPhoto: boolean = false;
  loading: boolean = true;
  uploading: boolean = false;
  error?: string;

  pendingFile: File | null = null;
  pendingPreviewUrl: string = '';

  constructor(
    @Inject(HONUWARE_PHOTO_ACCESS) private photoAccess: PhotoAccess,
    private photoUrlBuilder: PhotoUrlBuilder
  ) {}

  ngOnInit(): void {
    if (this.deferUpload) {
      this.loading = false;
    } else {
      this.checkPhoto();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.deferUpload) return;
    if ((changes['tableName'] || changes['tableItemId']) && !changes['tableName']?.firstChange) {
      this.checkPhoto();
    }
  }

  ngOnDestroy(): void {
    this.clearPendingFile();
  }

  private checkPhoto(): void {
    this.loading = true;
    this.error = undefined;

    this.photoAccess.hasPhoto(this.tableName, this.tableItemId).subscribe({
      next: (result) => {
        this.hasPhoto = result.has_photo;
        if (this.hasPhoto) {
          this.photoUrl = this.buildPhotoUrl();
        }
        this.loading = false;
      },
      error: () => {
        this.hasPhoto = false;
        this.loading = false;
      }
    });
  }

  private buildPhotoUrl(): string {
    return this.photoUrlBuilder.scaledPhotoUrl(this.tableName, this.tableItemId, 300, 300);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!event.dataTransfer?.files || event.dataTransfer.files.length === 0) return;

    const file = event.dataTransfer.files[0];
    this.uploadFile(file);
  }

  private uploadFile(file: File): void {
    if (this.deferUpload) {
      this.clearPendingFile();
      this.pendingFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.pendingPreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
      return;
    }

    this.uploading = true;
    this.error = undefined;

    this.prepareImageForUpload(file).then(({ buffer, imageType }) => {
      const upload$ = this.userMode
        ? this.photoAccess.uploadUserPhoto(buffer, imageType)
        : this.photoAccess.uploadPhoto(this.tableName, this.tableItemId, buffer, imageType);
      upload$.subscribe({
        next: () => {
          this.hasPhoto = true;
          this.uploading = false;
          // Bust cache by adding timestamp
          this.photoUrl = this.buildPhotoUrl() + '?t=' + Date.now();
        },
        error: (err) => {
          this.error = 'Failed to upload photo';
          this.uploading = false;
          console.error('Error uploading photo:', err);
        }
      });
    }).catch((err) => {
      // Without this catch, a decode/encode failure (e.g. an unsupported
      // format such as HEIC, which browsers can't render) would leave the
      // control stuck on "Processing…" with no error and no request.
      this.error = 'Could not read this image. Try a JPEG, PNG or SVG '
        + '(formats like HEIC are not supported).';
      this.uploading = false;
      console.error('Error preparing image for upload:', err);
    });
  }

  get hasPendingFile(): boolean {
    return this.pendingFile !== null;
  }

  clearPendingFile(): void {
    this.pendingFile = null;
    this.pendingPreviewUrl = '';
  }

  uploadPendingPhoto(tableName: string, tableItemId: number): Observable<void> {
    if (!this.pendingFile) {
      return of(void 0);
    }
    const file = this.pendingFile;

    return from(this.prepareImageForUpload(file)).pipe(
      switchMap(({ buffer, imageType }) =>
        this.photoAccess.uploadPhoto(tableName, tableItemId, buffer, imageType)),
      tap(() => this.clearPendingFile()),
      map(() => void 0)
    );
  }

  /**
   * Is this a VECTOR image?
   *
   * Checked by MIME type first, falling back to the extension: a drag-and-drop
   * from some file managers arrives with an empty `type`, and an `.svg` that
   * reached the canvas path below would be silently destroyed.
   */
  private isVector(file: File): boolean {
    return file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
  }

  /**
   * Re-encode the image as JPEG and resize if it exceeds the max dimensions.
   * Converting to JPEG dramatically reduces file size for photographic content
   * (a 25 MB PNG becomes ~1-2 MB JPEG) and keeps uploads under the server's
   * image_max_upload_bytes limit.
   *
   * A VECTOR is uploaded byte-for-byte instead, and this is not an
   * optimisation — it is a correctness fix. The canvas path below RASTERISES
   * whatever it is given and re-encodes it as JPEG, so an SVG that reached it
   * would upload as a fixed-size photograph: the vector gone, transparency
   * flattened, and no error to show for it. Silently turning the file into
   * something else is worse than refusing it.
   *
   * Nothing is resized on the way: a vector has no dimensions to clamp, and
   * the server's byte cap still applies to what we send.
   */
  private prepareImageForUpload(file: File): Promise<{ buffer: ArrayBuffer; imageType: string }> {
    if (this.isVector(file)) {
      return file.arrayBuffer().then(buffer => ({ buffer, imageType: 'svg' }));
    }

    const maxDim = PhotoUploadComponent.MAX_IMAGE_DIMENSION;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        // Clamp dimensions to max while preserving aspect ratio
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not create canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error('Canvas toBlob returned null'));
              return;
            }
            blob.arrayBuffer().then(
              buffer => resolve({ buffer, imageType: 'jpeg' }),
              err => reject(err)
            );
          },
          'image/jpeg',
          0.92
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };

      img.src = objectUrl;
    });
  }

  onDeletePhoto(): void {
    this.uploading = true;
    this.error = undefined;

    this.photoAccess.deletePhoto(this.tableName, this.tableItemId).subscribe({
      next: () => {
        this.hasPhoto = false;
        this.uploading = false;
      },
      error: (err) => {
        this.error = 'Failed to delete photo';
        this.uploading = false;
        console.error('Error deleting photo:', err);
      }
    });
  }
}
