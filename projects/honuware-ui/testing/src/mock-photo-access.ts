import { Observable, of } from 'rxjs';
import { PhotoAccess, SourcePhotoInfo } from '@honuware/ui/access';

const photoInfo = (id: number, type: string): SourcePhotoInfo => ({
  source_photo_id: id,
  type,
  width: 300,
  height: 300,
  created_at_us: 0,
});

/**
 * In-memory {@link PhotoAccess} simulator for tests. Remembers which table rows
 * have a photo so `hasPhoto()` reflects prior `uploadPhoto()`/`deletePhoto()`
 * calls. Ignores the image bytes (mocks the server's re-encode + store).
 */
export class MockPhotoAccess implements PhotoAccess {
  private readonly photos = new Set<string>();
  private nextId = 1;

  uploadPhoto(
    tableName: string,
    tableItemId: number,
    imageData: ArrayBuffer,
    imageType: string,
  ): Observable<SourcePhotoInfo> {
    this.photos.add(this.key(tableName, tableItemId));
    return of(photoInfo(this.nextId++, imageType));
  }

  uploadUserPhoto(imageData: ArrayBuffer, imageType: string): Observable<SourcePhotoInfo> {
    return of(photoInfo(this.nextId++, imageType));
  }

  deletePhoto(tableName: string, tableItemId: number): Observable<void> {
    this.photos.delete(this.key(tableName, tableItemId));
    return of(void 0);
  }

  hasPhoto(tableName: string, tableItemId: number): Observable<{ has_photo: boolean }> {
    return of({ has_photo: this.photos.has(this.key(tableName, tableItemId)) });
  }

  private key(tableName: string, tableItemId: number): string {
    return `${tableName}:${tableItemId}`;
  }
}
