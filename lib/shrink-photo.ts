/**
 * Shrink a drone photo in the browser before upload, keeping its metadata.
 *
 * A 20 MP drone JPEG is 8-12 MB; reconstruction only uses ~1600 px, so a
 * 100-photo flight drops from ~1 GB to ~40 MB. Re-encoding through a canvas
 * throws away EXIF/XMP (GPS position, focal length, gimbal angle), which the
 * reconstruction needs, so the original's APP1 segments are copied into the
 * new JPEG.
 */

export interface PhotoCheck {
  name: string
  hasGps: boolean
  bytes: number
}

const MAX_WIDTH = 2000

/** All APP1 segments (EXIF and XMP) from the start of a JPEG. */
function app1Segments(buf: ArrayBuffer): Uint8Array[] {
  const b = new Uint8Array(buf)
  const out: Uint8Array[] = []
  if (b[0] !== 0xff || b[1] !== 0xd8) return out
  let i = 2
  while (i + 4 < b.length && b[i] === 0xff) {
    const marker = b[i + 1]
    if (marker === 0xda || marker === 0xd9) break // start of scan: no more headers
    const len = (b[i + 2] << 8) | b[i + 3]
    if (marker === 0xe1) out.push(b.subarray(i, i + 2 + len))
    i += 2 + len
  }
  return out
}

/** True if the EXIF block has a GPS IFD pointer (tag 0x8825). */
function exifHasGps(seg: Uint8Array): boolean {
  // "Exif\0\0" then a TIFF header; look for the GPS IFD tag in either byte order
  const s = seg.subarray(4, Math.min(seg.length, 4096))
  for (let i = 0; i + 1 < s.length; i++) {
    if ((s[i] === 0x88 && s[i + 1] === 0x25) || (s[i] === 0x25 && s[i + 1] === 0x88)) return true
  }
  return false
}

export async function checkPhoto(file: File): Promise<PhotoCheck> {
  const head = await file.slice(0, 128 * 1024).arrayBuffer()
  const segs = app1Segments(head)
  return { name: file.name, hasGps: segs.some(exifHasGps), bytes: file.size }
}

export async function shrinkPhoto(file: File): Promise<Blob> {
  const original = await file.arrayBuffer()
  // 'none': keep the stored pixel orientation, which the copied EXIF describes
  const bitmap = await createImageBitmap(new Blob([original]), { imageOrientation: 'none' })
  const scale = Math.min(1, MAX_WIDTH / bitmap.width)
  if (scale === 1) { bitmap.close(); return file }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const small: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not re-encode photo'))), 'image/jpeg', 0.9))
  const body = new Uint8Array(await small.arrayBuffer())
  // new JPEG = SOI + original APP1 segments + everything after the new SOI
  const segs = app1Segments(original)
  return new Blob([body.subarray(0, 2), ...segs, body.subarray(2)], { type: 'image/jpeg' })
}
