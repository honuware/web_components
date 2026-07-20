export interface SourcePhotoInfo {
  source_photo_id: number;
  type: string;
  width: number;
  height: number;
  created_at_us?: number;
}

export interface HomePagePhotoInfo {
  id: number;
  title?: string;
  description?: string;
  created_at_us: number;
}
