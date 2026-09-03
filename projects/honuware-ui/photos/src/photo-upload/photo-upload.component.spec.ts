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

  // ---- Vector (SVG) uploads ----

  const svgBody =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
    + '<path d="M4 4h16v16H4z"/></svg>';
  const svgFile = (name = 'logo.svg', type = 'image/svg+xml') =>
    new File([svgBody], name, { type });

  // THE test for this change. The canvas path rasterises whatever it is given
  // and re-encodes it as JPEG, so an SVG that reached it would upload as a
  // fixed-size photograph — vector gone, transparency flattened, and no error
  // to show for it. Silently turning the file into something else is worse
  // than refusing it, which is why this asserts the BYTES as well as the type.
  // Real async rather than fakeAsync, and a POLL rather than a single tick:
  // these go through `File.arrayBuffer()`, whose promise zone.js does not
  // patch. It settles on neither fakeAsync's microtask queue nor in a
  // guaranteed order against a patched setTimeout, so both flushMicrotasks()
  // and a lone `await setTimeout(0)` can return with the upload still pending.
  async function waitUntil(done: () => boolean): Promise<void> {
    for (let i = 0; i < 50 && !done(); i++) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  it('uploads an SVG byte-for-byte instead of rasterising it', async () => {
    const { c, photoAccess } = make();
    c.onDrop({
      preventDefault: () => {}, stopPropagation: () => {},
      dataTransfer: { files: [svgFile()] },
    } as unknown as DragEvent);
    await waitUntil(() => photoAccess.uploadPhoto.calls.any());

    expect(photoAccess.uploadPhoto).toHaveBeenCalled();
    const [table, id, buffer, imageType] =
      photoAccess.uploadPhoto.calls.mostRecent().args;
    expect(table).toBe('classes');
    expect(id).toBe(3);
    expect(imageType).toBe('svg');
    expect(new TextDecoder().decode(buffer as ArrayBuffer)).toBe(svgBody);
    expect(c.uploading).toBeFalse();
  });

  // A file dragged from some file managers arrives with an empty MIME type,
  // and that is exactly the case that would fall through to the canvas.
  it('treats a .svg with no MIME type as a vector', async () => {
    const { c, photoAccess } = make();
    c.onDrop({
      preventDefault: () => {}, stopPropagation: () => {},
      dataTransfer: { files: [svgFile('logo.svg', '')] },
    } as unknown as DragEvent);
    await waitUntil(() => photoAccess.uploadPhoto.calls.any());

    expect(photoAccess.uploadPhoto.calls.mostRecent().args[3]).toBe('svg');
  });

  it('still re-encodes a raster through the canvas path', fakeAsync(() => {
    const { c, photoAccess } = make();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prepare = spyOn<any>(c, 'prepareImageForUpload').and.callThrough();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isVector = spyOn<any>(c, 'isVector').and.callThrough();

    c.onDrop({
      preventDefault: () => {}, stopPropagation: () => {},
      dataTransfer: { files: [jpegFile()] },
    } as unknown as DragEvent);
    flushMicrotasks();

    // The vector branch was CONSIDERED and declined — a raster must not take
    // the byte-for-byte path, or the client-side resize stops happening.
    expect(prepare).toHaveBeenCalled();
    expect(isVector).toHaveBeenCalled();
    expect(isVector.calls.mostRecent().returnValue).toBeFalse();
    // The 3-byte fake JPEG cannot decode, so this ends in the error branch
    // rather than an upload — which is itself the proof it went to the canvas.
    expect(photoAccess.uploadPhoto).not.toHaveBeenCalled();
  }));

  it('onDeletePhoto removes the photo', () => {
    const { c, photoAccess } = make();
    c.hasPhoto = true;
    c.onDeletePhoto();
    expect(photoAccess.deletePhoto).toHaveBeenCalledWith('classes', 3);
    expect(c.hasPhoto).toBeFalse();
    expect(c.uploading).toBeFalse();
  });
});
