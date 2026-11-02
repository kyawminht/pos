import { toJPEGFileOf } from './compressHelpers'

/** Canvas downscale to max 1024px long edge, JPEG q=0.8 (research R8). */
export const MAX_IMAGE_EDGE = 1024
export const COMPRESSED_JPEG = 0.8

export async function compressImage(file: File): Promise<File> {
  if (file.size <= 150 * 1024 && file.type === 'image/jpeg') {
    return file // already small jpeg
  }
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(img, 0, 0, w, h)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', COMPRESSED_JPEG)
  })
  return toJPEGFileOf(blob, file.name)
}
