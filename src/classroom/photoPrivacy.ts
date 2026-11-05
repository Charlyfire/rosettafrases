/** Calculate dimensions without expanding an image or changing its aspect ratio. */
export function classroomPhotoSize(width: number, height: number): { width: number; height: number } {
  if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) throw new Error('Dimensiones inválidas.')
  const scale = Math.min(1, 1200 / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Strip EXIF/GPS metadata and constrain local pupil portraits before persistence. */
export async function sanitizePupilPhoto(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
    throw new Error('Solo se admiten fotografías JPG, PNG o WebP de hasta 4 MB.')
  }
  const bitmap = await createImageBitmap(file)
  try {
    const size = classroomPhotoSize(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo preparar la fotografía en este navegador.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('No se pudo procesar la fotografía.')), 'image/jpeg', 0.88)
    })
  } finally {
    bitmap.close()
  }
}
