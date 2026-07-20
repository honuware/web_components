import { SourcePhotoInfo } from '@honuware/ui/access';
import { MockPhotoAccess } from './mock-photo-access';

describe('MockPhotoAccess', () => {
  it('hasPhoto reflects a prior upload, then a delete', () => {
    const photos = new MockPhotoAccess();

    let has: boolean | undefined;
    photos.hasPhoto('classes', 3).subscribe((r) => (has = r.has_photo));
    expect(has).toBeFalse();

    photos.uploadPhoto('classes', 3, new ArrayBuffer(3), 'jpeg').subscribe();
    photos.hasPhoto('classes', 3).subscribe((r) => (has = r.has_photo));
    expect(has).toBeTrue();

    photos.deletePhoto('classes', 3).subscribe();
    photos.hasPhoto('classes', 3).subscribe((r) => (has = r.has_photo));
    expect(has).toBeFalse();
  });

  it('tracks photos per (table, row) — a different row or table is independent', () => {
    const photos = new MockPhotoAccess();
    photos.uploadPhoto('classes', 3, new ArrayBuffer(1), 'jpeg').subscribe();

    let sameTableOtherRow: boolean | undefined;
    photos.hasPhoto('classes', 4).subscribe((r) => (sameTableOtherRow = r.has_photo));
    expect(sameTableOtherRow).toBeFalse();

    let otherTableSameId: boolean | undefined;
    photos.hasPhoto('people', 3).subscribe((r) => (otherTableSameId = r.has_photo));
    expect(otherTableSameId).toBeFalse();
  });

  it('uploadPhoto and uploadUserPhoto return SourcePhotoInfo carrying the image type', () => {
    const photos = new MockPhotoAccess();

    let info: SourcePhotoInfo | undefined;
    photos.uploadPhoto('classes', 3, new ArrayBuffer(1), 'png').subscribe((i) => (info = i));
    expect(info?.type).toBe('png');
    expect(info?.source_photo_id).toBe(1);

    let userInfo: SourcePhotoInfo | undefined;
    photos.uploadUserPhoto(new ArrayBuffer(1), 'jpeg').subscribe((i) => (userInfo = i));
    expect(userInfo?.type).toBe('jpeg');
    expect(userInfo?.source_photo_id).toBe(2);
  });
});
