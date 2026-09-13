// Shrink a phone photo before uploading: keeps the request small and fast
// while leaving more than enough detail to read a handwritten table.
export function downscaleImage(file, maxEdge = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) { reject(new Error('ملف غير صالح')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      const scale = Math.min(1, maxEdge / Math.max(width, height));
      // Already small enough — send as-is rather than re-encoding it.
      if (scale === 1 && file.size <= 4 * 1024 * 1024) { resolve(file); return; }
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob
          ? resolve(new File([blob], 'table.jpg', { type: 'image/jpeg' }))
          : reject(new Error('تعذّرت معالجة الصورة'))),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('تعذّرت قراءة الصورة')); };
    img.src = url;
  });
}
