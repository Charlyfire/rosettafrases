/** Strip EXIF/GPS metadata and constrain local pupil portraits before persistence. */
export async function sanitizePupilPhoto(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
    throw new Error('Solo se admiten fotografías JPG, PNG o WebP de hasta 4 MB.')
  }
  const bitmap = await createImageBitmap(file)
  try {
    const maxSide = 1200
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
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
