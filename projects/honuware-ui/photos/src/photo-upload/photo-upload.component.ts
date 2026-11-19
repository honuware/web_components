import {
  Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, Inject, Injector, Optional,
} from '@angular/core';

import { Observable, of, from, throwError } from 'rxjs';
import { catchError, switchMap, tap, map, shareReplay } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  PhotoAccess, HONUWARE_PHOTO_ACCESS, PhotoUrlBuilder, HONUWARE_IMAGE_UPLOAD_SETTINGS_ACCESS,
} from '@honuware/ui/access';
import {
  ImageTooLargeError, PreparedImage, checkImageUploadSize, prepareImageForUpload,
} from '../prepare-image-for-upload';

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

  photoUrl: string = '';
  hasPhoto: boolean = false;
  loading: boolean = true;
  uploading: boolean = false;
  error?: string;

  pendingFile: File | null = null;
  pendingPreviewUrl: string = '';

  // The upload limit, read once, the first time a file is sent.
  private uploadLimit$: Observable<number | null> | null = null;

  constructor(
    @Inject(HONUWARE_PHOTO_ACCESS) private photoAccess: PhotoAccess,
    private photoUrlBuilder: PhotoUrlBuilder,
    // For the upload limit, looked up only when a file is sent (see
    // uploadLimit). Optional so the control can be built by hand.
    @Optional() private injector: Injector | null = null,
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

    this.prepareWithinLimit(file).subscribe({
      next: ({ buffer, imageType }) => {
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
      },
      error: (err) => {
        // Without this, a decode/encode failure (e.g. an unsupported format
        // such as HEIC, which browsers can't render) would leave the control
        // stuck on "Processing…" with no error and no request.
        this.error = this.preparationProblem(err);
        this.uploading = false;
        console.error('Error preparing image for upload:', err);
      }
    });
  }

  /**
   * The pending file (deferUpload), shrunk and re-encoded as every upload is
   * (prepareImageForUpload) and checked against the upload limit, for an app
   * that sends it itself. Emits null when nothing is pending. Errors with
   * ImageTooLargeError when it's still over the limit, or the browser's error
   * when it can't be read; either way, nothing has been sent.
   */
  preparePendingPhoto(): Observable<PreparedImage | null> {
    if (!this.pendingFile) {
      return of(null);
    }
    return this.prepareWithinLimit(this.pendingFile);
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

    return this.prepareWithinLimit(file).pipe(
      catchError((err) => {
        // The control is still on screen with the file in it: say why here
        // too, not only to the caller.
        if (err instanceof ImageTooLargeError) {
          this.error = err.message;
        }
        return throwError(() => err);
      }),
      switchMap(({ buffer, imageType }) =>
        this.photoAccess.uploadPhoto(tableName, tableItemId, buffer, imageType)),
      tap(() => this.clearPendingFile()),
      map(() => void 0)
    );
  }

  // The shared shrink step (prepare-image-for-upload.ts). A method so specs
  // can stand in for the canvas.
  private prepareImageForUpload(file: File): Promise<PreparedImage> {
    return prepareImageForUpload(file);
  }

  // Prepares `file`, then refuses it with ImageTooLargeError if it's still
  // over the upload limit, so a file the server would refuse isn't sent.
  private prepareWithinLimit(file: File): Observable<PreparedImage> {
    return from(this.prepareImageForUpload(file)).pipe(
      switchMap(prepared => this.uploadLimit().pipe(
        map(limit => {
          checkImageUploadSize(prepared, limit);
          return prepared;
        }),
      )),
    );
  }

  // The upload limit in bytes, or null when it can't be read. Null checks
  // nothing: the server's own check still applies, so a missing limit costs
  // only the early message. Looked up through the injector, and only when a
  // file is sent, so rendering the control never needs the limit's access
  // (an app's spec may render it without an HttpClient).
  private uploadLimit(): Observable<number | null> {
    if (!this.uploadLimit$) {
      let limit$: Observable<number | null> = of(null);
      try {
        const access = this.injector?.get(HONUWARE_IMAGE_UPLOAD_SETTINGS_ACCESS, null) ?? null;
        if (access) {
          limit$ = access.getUploadLimit().pipe(
            map(result => result.max_upload_bytes),
            catchError(() => of(null)),
          );
        }
      } catch {
        // The access couldn't be built: no early check.
      }
      this.uploadLimit$ = limit$.pipe(shareReplay(1));
    }
    return this.uploadLimit$;
  }

  private preparationProblem(err: unknown): string {
    if (err instanceof ImageTooLargeError) {
      return err.message;
    }
    return 'Could not read this image. Try a JPEG, PNG or SVG '
      + '(formats like HEIC are not supported).';
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
