import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { PhotoUploadComponent } from './photo-upload.component';
import { PhotoUrlBuilder } from '@honuware/ui/access';

describe('PhotoUploadComponent', () => {
  function makePhotoAccess() {
    return {
      hasPhoto: jasmine.createSpy('hasPhoto').and.returnValue(of({ has_photo: false })),
      uploadPhoto: jasmine.createSpy('uploadPhoto').and.returnValue(of({})),
      uploadUserPhoto: jasmine.createSpy('uploadUserPhoto').and.returnValue(of({})),
      deletePhoto: jasmine.createSpy('deletePhoto').and.returnValue(of(undefined)),
    };
  }

  // The control now depends on the narrow PhotoAccess seam + PhotoUrlBuilder,
  // not the full ServerAccess. `apiBase` lets a test prove display URLs flow
  // through the builder rather than a hardcoded '/api/get_scaled_photo/...'.
  function make(
    overrides: Partial<ReturnType<typeof makePhotoAccess>> = {},
    apiBase = '/api'
  ) {
    const photoAccess = { ...makePhotoAccess(), ...overrides };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = new PhotoUploadComponent(photoAccess as any, new PhotoUrlBuilder(apiBase));
    c.tableName = 'classes';
    c.tableItemId = 3;
    return { c, photoAccess };
  }

  const jpegFile = () =>
    new File([new Uint8Array([1, 2, 3])], 'p.jpg', { type: 'image/jpeg' });

  it('checkPhoto on init reflects the server has_photo result', () => {
    const { c } = make({ hasPhoto: jasmine.createSpy().and.returnValue(of({ has_photo: true })) });
    c.ngOnInit();
    expect(c.hasPhoto).toBeTrue();
    expect(c.loading).toBeFalse();
    expect(c.photoUrl).toContain('/api/get_scaled_photo/classes/3/300/300');
  });

  it('builds the display URL through PhotoUrlBuilder (honors a custom API base)', () => {
    const { c } = make(
      { hasPhoto: jasmine.createSpy().and.returnValue(of({ has_photo: true })) },
      'https://cdn.example.com/api'
    );
    c.ngOnInit();
    expect(c.photoUrl).toBe('https://cdn.example.com/api/get_scaled_photo/classes/3/300/300');
  });

  it('uploads via uploadPhoto when an image is processed (table mode)', fakeAsync(() => {
    const { c, photoAccess } = make();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    spyOn<any>(c, 'prepareImageForUpload').and.returnValue(
      Promise.resolve({ buffer: new ArrayBuffer(3), imageType: 'jpeg' }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).uploadFile(jpegFile());
    flushMicrotasks();

    expect(photoAccess.uploadPhoto).toHaveBeenCalledWith('classes', 3, jasmine.any(ArrayBuffer), 'jpeg');
    expect(photoAccess.uploadUserPhoto).not.toHaveBeenCalled();
    expect(c.hasPhoto).toBeTrue();
    expect(c.uploading).toBeFalse();
  }));

  it('uploads via uploadUserPhoto in user mode', fakeAsync(() => {
    const { c, photoAccess } = make();
    c.userMode = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    spyOn<any>(c, 'prepareImageForUpload').and.returnValue(
      Promise.resolve({ buffer: new ArrayBuffer(3), imageType: 'jpeg' }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).uploadFile(jpegFile());
    flushMicrotasks();

    expect(photoAccess.uploadUserPhoto).toHaveBeenCalled();
    expect(photoAccess.uploadPhoto).not.toHaveBeenCalled();
  }));

  it('clears the spinner and shows an error when the image cannot be decoded', fakeAsync(() => {
    const { c, photoAccess } = make();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    spyOn<any>(c, 'prepareImageForUpload').and.returnValue(
      Promise.reject(new Error('decode failed')));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).uploadFile(jpegFile());
    flushMicrotasks();

    expect(c.uploading).toBeFalse();           // no longer stuck on "Processing…"
    expect(c.error).toContain('JPEG');
    expect(photoAccess.uploadPhoto).not.toHaveBeenCalled();
  }));

  it('surfaces an upload failure and clears the spinner', fakeAsync(() => {
    const { c } = make({
      uploadPhoto: jasmine.createSpy().and.returnValue(throwError(() => new Error('500'))),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    spyOn<any>(c, 'prepareImageForUpload').and.returnValue(
      Promise.resolve({ buffer: new ArrayBuffer(3), imageType: 'jpeg' }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).uploadFile(jpegFile());
    flushMicrotasks();

    expect(c.uploading).toBeFalse();
    expect(c.error).toContain('Failed to upload');
  }));

  it('defers the upload when deferUpload is set (no request yet)', () => {
    const { c, photoAccess } = make();
    c.deferUpload = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).uploadFile(jpegFile());
    expect(c.hasPendingFile).toBeTrue();
    expect(c.uploading).toBeFalse();
    expect(photoAccess.uploadPhoto).not.toHaveBeenCalled();
  });

  it('onDeletePhoto removes the photo', () => {
    const { c, photoAccess } = make();
    c.hasPhoto = true;
    c.onDeletePhoto();
    expect(photoAccess.deletePhoto).toHaveBeenCalledWith('classes', 3);
    expect(c.hasPhoto).toBeFalse();
    expect(c.uploading).toBeFalse();
  });
});
