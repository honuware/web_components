import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { PhotoAccess } from './photo-access';
import { SourcePhotoInfo } from './photo.types';
import { HONUWARE_API_BASE } from './api-base';

// Default HttpClient implementation of the framework photo surface.
@Injectable({ providedIn: 'root' })
export class PhotoHttpAccess implements PhotoAccess {
  constructor(
    private http: HttpClient,
    @Inject(HONUWARE_API_BASE) private base: string,
  ) {}

  uploadPhoto(tableName: string, tableItemId: number, imageData: ArrayBuffer, imageType: string): Observable<SourcePhotoInfo> {
    const type = imageType.split('/').pop() || imageType;
    const url = `${this.base}/upload_photo/${encodeURIComponent(tableName)}/${tableItemId}/${encodeURIComponent(type)}`;
    return this.http.post<SourcePhotoInfo>(url, imageData, { withCredentials: true });
  }

  uploadUserPhoto(imageData: ArrayBuffer, imageType: string): Observable<SourcePhotoInfo> {
    const type = imageType.split('/').pop() || imageType;
    const url = `${this.base}/upload_user_photo/${encodeURIComponent(type)}`;
    return this.http.post<SourcePhotoInfo>(url, imageData, { withCredentials: true });
  }

  deletePhoto(tableName: string, tableItemId: number): Observable<void> {
    const url = `${this.base}/delete_photo/${encodeURIComponent(tableName)}/${tableItemId}`;
    return this.http.post(url, null, { withCredentials: true }).pipe(map(() => void 0));
  }

  hasPhoto(tableName: string, tableItemId: number): Observable<{ has_photo: boolean }> {
    const url = `${this.base}/has_photo/${encodeURIComponent(tableName)}/${tableItemId}`;
    return this.http.get<{ has_photo: boolean }>(url, { withCredentials: true });
  }
}
