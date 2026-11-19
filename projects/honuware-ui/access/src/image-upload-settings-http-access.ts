import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { HONUWARE_API_BASE } from './api-base';
import {
  ImageUploadLimit,
  ImageUploadSettings,
  ImageUploadSettingsAccess,
} from './image-upload-settings-access';

// Default HttpClient implementation of the image upload limit's routes.
@Injectable({ providedIn: 'root' })
export class ImageUploadSettingsHttpAccess implements ImageUploadSettingsAccess {
  constructor(
    private http: HttpClient,
    @Inject(HONUWARE_API_BASE) private base: string,
  ) {}

  getUploadLimit(): Observable<ImageUploadLimit> {
    return this.http.get<ImageUploadLimit>(`${this.base}/image_upload_limit`, { withCredentials: true });
  }

  getSettings(): Observable<ImageUploadSettings> {
    return this.http.get<ImageUploadSettings>(`${this.base}/admin/image_upload_settings`, {
      withCredentials: true,
    });
  }

  saveSettings(maxUploadBytes: number): Observable<ImageUploadSettings> {
    return this.http.put<ImageUploadSettings>(
      `${this.base}/admin/image_upload_settings`,
      { max_upload_bytes: maxUploadBytes },
      { withCredentials: true },
    );
  }
}
