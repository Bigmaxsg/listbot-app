// Photo prep on the phone: fix orientation, resize to 2400px long edge, JPEG ~0.85.
// Re-encoding through a canvas drops ALL metadata, including GPS location.
export const MAX_EDGE = 2400;
export const QUALITY = 0.85;

export async function toJpeg(file, maxEdge = MAX_EDGE, quality = QUALITY) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close && bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode photo"))), "image/jpeg", quality));
}
