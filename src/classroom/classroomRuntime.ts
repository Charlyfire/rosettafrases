import type { AudioResource, Pictogram } from '../domain/content'
import type { Pupil } from './classroomRepository'
import { normalizeInitial, pupilDisplayName } from './classroomRepository'

export type PupilDisplay = 'photo' | 'name' | 'both'

const escapeLabel = (value: string) => value

/** Draw a self-contained bitmap, never downloaded or sent to a server. */
export async function renderPupilCard(pupil: Pupil, display: PupilDisplay): Promise<string> {
  await document.fonts.load('48px Escolar2')
  const canvas = document.createElement('canvas')
  canvas.width = 520
  // A compact name-only canvas prevents tiny labels in the selection cards.
  canvas.height = display === 'name' || (display !== 'photo' && !pupil.photo) ? 205 : 420
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
      const box = display === 'photo' ? { x: 70, y: 20, w: 380, h: 380 } : { x: 150, y: 5, w: 220, h: 245 }
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
    const suffix = pupil.surnameInitial ? normalizeInitial(pupil.surnameInitial) : ''
    const centerY = includePhoto ? 339 : canvas.height / 2
    let font = includePhoto ? 105 : 152
    ctx.font = `${font}px Escolar2`
    // Name and surname initials use the SAME font size; fit the whole
    // label (including initials outside the rectangle) inside the canvas.
    const totalWidth = () => ctx.measureText(base).width + 30 +
      (suffix ? 8 + ctx.measureText(suffix).width : 0)
    while (totalWidth() > canvas.width - 24 && font > 30) {
      font -= 2
      ctx.font = `${font}px Escolar2`
    }
    const width = Math.ceil(ctx.measureText(base).width + 30)
    const suffixWidth = suffix ? ctx.measureText(suffix).width : 0
    const sx = (canvas.width - width - suffixWidth - (suffix ? 8 : 0)) / 2
    ctx.strokeStyle = '#111b30'
    ctx.lineWidth = 3
    ctx.strokeRect(sx, centerY - font * .78, width, font * 1.15)
    ctx.fillStyle = '#111b30'
    ctx.textBaseline = 'middle'
    ctx.fillText(base, sx + 15, centerY - font * .12)
    if (suffix) ctx.fillText(suffix, sx + width + 8, centerY - font * .12)
  }
  return canvas.toDataURL('image/png')
}

export async function pupilsToPictograms(pupils: Pupil[], display: PupilDisplay): Promise<Pictogram[]> {
  const usable = display === 'photo' ? pupils.filter((pupil) => Boolean(pupil.photo)) : pupils
  return Promise.all(usable.map(async (pupil) => ({
    id: `pupil-${pupil.id}`,
    label: escapeLabel(pupilDisplayName(pupil)),
    image: await renderPupilCard(pupil, display),
    audioIds: pupil.nameAudio ? [`word-pupil-${pupil.id}`] : [],
    categories: ['subject', 'character'] as Pictogram['categories'],
    tags: ['classroom'],
    initialSound: pupil.name.trim().charAt(0).toLocaleLowerCase('es'),
    availableFromUnit: 1,
    source: 'local' as const,
    grammatical: { role: ['subject'] as Array<'subject'>, number: 'singular' as const },
  })))
}

export function pupilsToAudioResources(pupils: Pupil[]): { resources: AudioResource[]; urls: string[] } {
  const urls: string[] = []
  const resources = pupils.flatMap((pupil): AudioResource[] => {
    if (!pupil.nameAudio) return []
    const url = URL.createObjectURL(pupil.nameAudio)
    urls.push(url)
    return [{ id: `word-pupil-${pupil.id}`, kind: 'word', file: url, transcript: pupilDisplayName(pupil) }]
  })
  return { resources, urls }
}
