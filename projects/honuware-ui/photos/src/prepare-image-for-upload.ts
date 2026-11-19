// Getting an image ready to upload: what hw-photo-upload does to every file
// before it sends it, public so an app that sends a file itself (a form's
// flyer, say) shrinks it the same way (CommunityFinder CM3 Phase 2 §13.2,
// OQ13).

/**
 * The longest side, in pixels, a raster image is shrunk to. Must match the
 * server's image_max_source_width / image_max_source_height defaults.
 */
export const MAX_UPLOAD_IMAGE_DIMENSION = 4096;

/** An image ready to send: the bytes, and the type the upload route takes. */
export interface PreparedImage {
  buffer: ArrayBuffer;
  imageType: 'jpeg' | 'svg';
}

/**
 * Is this a VECTOR image?
 *
 * Checked by MIME type first, falling back to the extension: a drag-and-drop
 * from some file managers arrives with an empty `type`, and an `.svg` that
 * reached the canvas path would be silently destroyed.
 */
export function isVectorImage(file: File): boolean {
  return file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
}

/**
 * Re-encodes a raster image as JPEG, shrinking it first if either side is
 * longer than `maxDimension` (aspect ratio kept). Converting to JPEG
 * dramatically reduces the size of photographic content (a 25 MB PNG becomes
 * ~1–2 MB), so most images end up well under the upload limit.
 *
 * A VECTOR goes up byte-for-byte instead, and that is a correctness fix, not
 * an optimisation: the canvas RASTERISES whatever it's given, so an SVG that
 * reached it would upload as a fixed-size photograph, the vector gone,
 * transparency flattened, and no error to show for it. Nothing is resized on
 * the way: a vector has no dimensions to clamp, and the server's byte cap still
 * applies to what's sent.
 *
 * Rejects when the browser can't decode the file (HEIC, for one).
 */
export function prepareImageForUpload(
  file: File,
  maxDimension: number = MAX_UPLOAD_IMAGE_DIMENSION,
): Promise<PreparedImage> {
  if (isVectorImage(file)) {
    return file.arrayBuffer().then(buffer => ({ buffer, imageType: 'svg' as const }));
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth;
      let height = img.naturalHeight;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not create canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Canvas toBlob returned null'));
            return;
          }
          blob.arrayBuffer().then(
            buffer => resolve({ buffer, imageType: 'jpeg' }),
            err => reject(err)
          );
        },
        'image/jpeg',
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * "10 MB", "12.5 MB": bytes in megabytes, to one decimal place when needed.
 * `roundUp` for a file's size, so one a byte over a 10 MB limit reads "10.1 MB"
 * rather than "10 MB".
 */
export function formatMegabytes(bytes: number, roundUp = false): string {
  const tenths = (bytes / (1024 * 1024)) * 10;
  const rounded = (roundUp ? Math.ceil(tenths) : Math.round(tenths)) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} MB`;
}

/**
 * A prepared image still bigger than the upload limit. Its message says so
 * in words a person can act on.
 */
export class ImageTooLargeError extends Error {
  constructor(
    readonly sizeBytes: number,
    readonly limitBytes: number,
  ) {
    super(
      `This image is ${formatMegabytes(sizeBytes, true)} even after shrinking, and the limit is `
      + `${formatMegabytes(limitBytes)}. Try a smaller image.`
    );
    this.name = 'ImageTooLargeError';
  }
}

/**
 * Throws ImageTooLargeError when `image` is over `limitBytes`. A null limit
 * (it couldn't be read) checks nothing: the server's own check still applies.
 */
export function checkImageUploadSize(image: PreparedImage, limitBytes: number | null): void {
  if (limitBytes !== null && image.buffer.byteLength > limitBytes) {
    throw new ImageTooLargeError(image.buffer.byteLength, limitBytes);
  }
}
