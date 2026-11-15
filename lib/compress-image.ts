export async function compressImageToWebp(
  file: File,
  options: { maxDimension?: number; maxBytes?: number } = {},
): Promise<File> {
  const maxDimension = options.maxDimension ?? 1800;
  const maxBytes = options.maxBytes ?? 1_500_000;
  const bitmap = await createImageBitmap(file);
  try {
    let scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("تعذر تجهيز الصورة على هذا الجهاز.");

    for (let resizeAttempt = 0; resizeAttempt < 6; resizeAttempt += 1) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.86, 0.8, 0.74, 0.68]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
        if (!blob || blob.type !== "image/webp") throw new Error("تعذر تحويل الصورة إلى WebP على هذا الجهاز.");
        if (blob.size <= maxBytes) {
          const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}.webp`;
          return new File([blob], name, { type: "image/webp", lastModified: Date.now() });
        }
      }

      scale *= 0.82;
    }

    throw new Error("تعذر ضغط الصورة إلى الحجم المناسب. اختر صورة أصغر.");
  } finally {
    bitmap.close();
  }
}

export function formatImageFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
