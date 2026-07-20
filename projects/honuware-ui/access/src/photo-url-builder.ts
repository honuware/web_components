import { Inject, Injectable } from '@angular/core';
import { HONUWARE_API_BASE } from './api-base';

// Builds the <img src> URLs for server-scaled photos, so no component
// string-concatenates API paths. Callers append their own cache-busting query
// params when they need them.
@Injectable({ providedIn: 'root' })
export class PhotoUrlBuilder {
  constructor(@Inject(HONUWARE_API_BASE) private apiBase: string) {}

  public scaledPhotoUrl(
    tableName: string,
    tableItemId: number | string,
    width: number,
    height: number
  ): string {
    return `${this.apiBase}/get_scaled_photo/${tableName}/${tableItemId}/${width}/${height}`;
  }
}
