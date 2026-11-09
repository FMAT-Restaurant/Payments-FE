/** File name from a `Content-Disposition` header (`filename*=UTF-8''...` or `filename="..."`), or `fallback`. */
export function filenameFromContentDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim())
    } catch {
      // Falls through to the plain filename.
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)?.[1]
  return plain?.trim() || fallback
}

/** Forces the browser to save `blob` as `filename` (PMC-24 AC5: `URL.createObjectURL`). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
