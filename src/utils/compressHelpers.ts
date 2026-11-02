/** Split out for jsdom-testability without a full canvas environment. */
export function toJPEGFileOf(blob: Blob, originalName: string): File {
  const base = originalName.replace(/\.[^.]+$/, '').replace(/\W+/g, '_') || 'image'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
}
