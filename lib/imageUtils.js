/**
 * Client-side image compression utility.
 * Resizes images to max 1200px and compresses to JPEG ~80% quality.
 * Reduces 5MB images down to ~100-200KB.
 */

/**
 * Compress an image File before upload.
 * @param {File} file  — original image file
 * @param {object} opts
 * @param {number} opts.maxWidth   — max pixel width  (default 1200)
 * @param {number} opts.maxHeight  — max pixel height (default 1200)
 * @param {number} opts.quality    — JPEG quality 0-1  (default 0.8)
 * @returns {Promise<Blob>}        — compressed JPEG blob
 */
export function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = {}) {
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

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Compression failed"));
        },
        "image/jpeg",
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
  const name = file.name.replace(/\.[^.]+$/, ".jpg");
  return new File([blob], name, { type: "image/jpeg" });
}
