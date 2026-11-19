import {
  ImageTooLargeError,
  MAX_UPLOAD_IMAGE_DIMENSION,
  checkImageUploadSize,
  formatMegabytes,
  isVectorImage,
  prepareImageForUpload,
} from './prepare-image-for-upload';

const MB = 1024 * 1024;

// A real PNG of the given size, drawn on a canvas, so the canvas path is
// tested end to end.
function pngFile(width: number, height: number): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3366cc';
  ctx.fillRect(0, 0, width, height);
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(new File([blob!], 'flyer.png', { type: 'image/png' })), 'image/png'));
}

describe('prepareImageForUpload', () => {
  const svgBody = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';

  it('re-encodes a raster as a JPEG', async () => {
    const prepared = await prepareImageForUpload(await pngFile(40, 30));
    expect(prepared.imageType).toBe('jpeg');
    const bitmap = await createImageBitmap(new Blob([prepared.buffer], { type: 'image/jpeg' }));
    expect([bitmap.width, bitmap.height]).toEqual([40, 30]);
  });

  it('shrinks a raster whose longer side is over the limit, keeping its shape', async () => {
    const prepared = await prepareImageForUpload(await pngFile(200, 50), 100);
    const bitmap = await createImageBitmap(new Blob([prepared.buffer], { type: 'image/jpeg' }));
    expect([bitmap.width, bitmap.height]).toEqual([100, 25]);
  });

  it('shrinks to 4096 px by default, as the server expects', () => {
    expect(MAX_UPLOAD_IMAGE_DIMENSION).toBe(4096);
  });

  it('sends a vector byte-for-byte', async () => {
    const prepared = await prepareImageForUpload(new File([svgBody], 'logo.svg', { type: 'image/svg+xml' }));
    expect(prepared.imageType).toBe('svg');
    expect(new TextDecoder().decode(prepared.buffer)).toBe(svgBody);
  });

  it('rejects a file the browser cannot decode', async () => {
    await expectAsync(
      prepareImageForUpload(new File([new Uint8Array([1, 2, 3])], 'p.heic', { type: 'image/heic' })),
    ).toBeRejected();
  });
});

describe('isVectorImage', () => {
  it('knows an SVG by its type, or by its name when the type is missing', () => {
    expect(isVectorImage(new File([''], 'logo.svg', { type: 'image/svg+xml' }))).toBeTrue();
    expect(isVectorImage(new File([''], 'LOGO.SVG', { type: '' }))).toBeTrue();
    expect(isVectorImage(new File([''], 'photo.jpg', { type: 'image/jpeg' }))).toBeFalse();
  });
});

describe('formatMegabytes', () => {
  it('shows whole megabytes plainly and others to a tenth', () => {
    expect(formatMegabytes(10 * MB)).toBe('10 MB');
    expect(formatMegabytes(12.5 * MB)).toBe('12.5 MB');
    expect(formatMegabytes(1.04 * MB)).toBe('1 MB');
  });

  it('rounds up when asked, so a file a byte over a limit reads as over it', () => {
    expect(formatMegabytes(10 * MB + 1, true)).toBe('10.1 MB');
    expect(formatMegabytes(10 * MB, true)).toBe('10 MB');
  });
});

describe('checkImageUploadSize', () => {
  const image = (bytes: number) => ({ buffer: new ArrayBuffer(bytes), imageType: 'jpeg' as const });

  it('passes an image at or under the limit', () => {
    expect(() => checkImageUploadSize(image(100), 100)).not.toThrow();
  });

  it('refuses one over it, saying both sizes', () => {
    let error: unknown;
    try {
      checkImageUploadSize(image(MB + 1), MB);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ImageTooLargeError);
    const tooLarge = error as ImageTooLargeError;
    expect(tooLarge.sizeBytes).toBe(MB + 1);
    expect(tooLarge.limitBytes).toBe(MB);
    expect(tooLarge.message).toBe(
      'This image is 1.1 MB even after shrinking, and the limit is 1 MB. Try a smaller image.');
  });

  it('checks nothing when the limit is unknown', () => {
    expect(() => checkImageUploadSize(image(100 * MB), null)).not.toThrow();
  });
});
