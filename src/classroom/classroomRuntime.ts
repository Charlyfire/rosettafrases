import type { Pictogram } from '../domain/content'
import type { Pupil } from './classroomRepository'
import { pupilDisplayName } from './classroomRepository'

export type PupilDisplay = 'photo' | 'name' | 'both'

const escapeLabel = (value: string) => value

/** Draw a self-contained bitmap, never downloaded or sent to a server. */
export async function renderPupilCard(pupil: Pupil, display: PupilDisplay): Promise<string> {
  await document.fonts.load('48px Escolar2')
  const canvas = document.createElement('canvas')
  canvas.width = 520
  canvas.height = 420
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('El dispositivo no permite generar las etiquetas.')
  ctx.fillStyle = '#fffdf8'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const includePhoto = display !== 'name' && Boolean(pupil.photo)
  if (includePhoto && pupil.photo) {
    const localUrl = URL.createObjectURL(pupil.photo)
    try {
      const img = new Image()
      img.src = localUrl
      await img.decode()
      const box = display === 'photo' ? { x: 70, y: 20, w: 380, h: 380 } : { x: 160, y: 12, w: 200, h: 230 }
      const ratio = Math.max(box.w / img.width, box.h / img.height)
      const scaledW = img.width * ratio
      const scaledH = img.height * ratio
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(box.x, box.y, box.w, box.h, 12)
      ctx.clip()
      ctx.drawImage(img, box.x + (box.w - scaledW) / 2, box.y + (box.h - scaledH) / 2, scaledW, scaledH)
      ctx.restore()
    } finally {
      URL.revokeObjectURL(localUrl)
    }
  }
  // A pupil without a photograph gets a name-only card, never a blank game option.
  if (display !== 'photo' || !pupil.photo) {
    const base = pupil.name
    const suffix = pupil.surnameInitial ? `${pupil.surnameInitial}.` : ''
    const centerY = includePhoto ? 340 : 210
    let font = 72
    ctx.font = `${font}px Escolar2`
    while (ctx.measureText(base).width > 390 && font > 30) { font -= 2; ctx.font = `${font}px Escolar2` }
    const width = Math.min(405, Math.ceil(ctx.measureText(base).width + 36))
    const sx = suffix ? (canvas.width - width - 64) / 2 : (canvas.width - width) / 2
    ctx.strokeStyle = '#111b30'
    ctx.lineWidth = 3
    ctx.strokeRect(sx, centerY - font * .85, width, font * 1.22)
    ctx.fillStyle = '#111b30'
    ctx.textBaseline = 'middle'
    ctx.fillText(base, sx + 18, centerY - font * .16)
    if (suffix) { ctx.font = `${font * .7}px Escolar2`; ctx.fillText(suffix, sx + width + 8, centerY - font * .16) }
  }
  return canvas.toDataURL('image/png')
}

export async function pupilsToPictograms(pupils: Pupil[], display: PupilDisplay): Promise<Pictogram[]> {
  const usable = display === 'photo' ? pupils.filter((pupil) => Boolean(pupil.photo)) : pupils
  return Promise.all(usable.map(async (pupil) => ({
    id: `pupil-${pupil.id}`,
    label: escapeLabel(pupilDisplayName(pupil)),
    image: await renderPupilCard(pupil, display),
    audioIds: [],
    categories: ['subject', 'character'] as Pictogram['categories'],
    tags: ['classroom'],
    initialSound: pupil.name.trim().charAt(0).toLocaleLowerCase('es'),
    availableFromUnit: 1,
    source: 'local' as const,
    grammatical: { role: ['subject'] as Array<'subject'>, number: 'singular' as const },
  })))
}
