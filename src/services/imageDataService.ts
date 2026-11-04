/**
 * Product images are stored as compressed JPEG data URLs directly on the
 * product record in IndexedDB (no external storage bucket in the MVP).
 */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('IMAGE_UNREADABLE'))
    reader.readAsDataURL(file)
  })
}
