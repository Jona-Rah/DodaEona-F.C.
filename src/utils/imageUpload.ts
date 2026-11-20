/**
 * Compresses and normalizes an admin-uploaded image file into a browser-ready
 * data URL so homepage and card assets persist reliably in JSON and Firestore
 * without exceeding document size budgets.
 */
export async function optimizeImageFileToDataUrl(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<string> {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (JPG, PNG, or WebP).');
  }

  const { maxWidth = 1600, maxHeight = 1000, quality = 0.86 } = options;

  // Preserve SVGs verbatim cleanly
  if (file.type === 'image/svg+xml') {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode the selected image file.'));
      el.src = objectUrl;
    });

    const srcW = img.naturalWidth || maxWidth;
    const srcH = img.naturalHeight || maxHeight;
    const scale = Math.min(1, maxWidth / srcW, maxHeight / srcH);
    const targetW = Math.max(1, Math.round(srcW * scale));
    const targetH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Image processing canvas unavailable in this browser.');
    }
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Preserve PNG alpha only if explicitly PNG and reasonably sized; otherwise use crisp JPEG
    const mimeOut = file.type === 'image/png' && targetW * targetH <= 900_000 ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mimeOut, quality);
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      throw new Error('Image optimization failed.');
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
