/**
 * Client-side image compression utility.
 * Resizes images to max 1200px and compresses to WebP format.
 * Reduces large images down to ~50-150KB.
 */

/**
 * Compress an image File before upload.
 * @param {File} file  — original image file
 * @param {object} opts
 * @param {number} opts.maxWidth   — max pixel width  (default 1200)
 * @param {number} opts.maxHeight  — max pixel height (default 1200)
 * @param {number} opts.quality    — WebP quality 0-1  (default 0.75)
 * @returns {Promise<Blob>}        — compressed WebP blob
 */
export function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.75 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      // Scale down if needed, keeping aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width  = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Try WebP first, fall back to JPEG if not supported
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else {
            // Fallback to JPEG if WebP is not supported
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) resolve(jpegBlob);
                else reject(new Error("Compression failed"));
              },
              "image/jpeg",
              quality
            );
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Compress and wrap as a named File ready for FormData.
 */
export async function compressImageFile(file, opts) {
  const blob = await compressImage(file, opts);
  // Determine extension based on actual blob type
  const ext = blob.type === "image/webp" ? ".webp" : ".jpg";
  const name = file.name.replace(/\.[^.]+$/, ext);
  return new File([blob], name, { type: blob.type });
}
