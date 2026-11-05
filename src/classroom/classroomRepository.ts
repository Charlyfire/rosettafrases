import type { PupilDisplay } from './classroomRuntime'
export interface Pupil {
  id: string
  name: string
  surnameInitial?: string
  photo?: Blob
  nameAudio?: Blob
}

export type ClassroomMode = 'rosetta' | 'class'

const DATABASE = 'rosetta-private-classroom'
const STORE = 'pupils'
const SETTINGS = 'settings'

function openClassroom(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: 'id' })
      if (!database.objectStoreNames.contains(SETTINGS)) database.createObjectStore(SETTINGS)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir la clase local'))
  })
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export const normalizeName = (raw: string): string =>
  raw.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es').replace(/(^|[ -])([a-záéíóúüñ])/gu, (_match, prefix: string, letter: string) => prefix + letter.toLocaleUpperCase('es'))

export const normalizeInitial = (raw: string): string =>
  raw.trim().split(/[\s.]+/).filter(Boolean).slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('es') + '.').join(' ')

export const pupilDisplayName = (pupil: Pupil) =>
  `${pupil.name}${pupil.surnameInitial ? ' ' + normalizeInitial(pupil.surnameInitial) : ''}`

export async function readClassroom(): Promise<{ pupils: Pupil[]; mode: ClassroomMode; display: PupilDisplay }> {
  const db = await openClassroom()
  try {
    const tx = db.transaction([STORE, SETTINGS], 'readonly')
    const [pupils, mode, display] = await Promise.all([
      result(tx.objectStore(STORE).getAll() as IDBRequest<Pupil[]>),
      result(tx.objectStore(SETTINGS).get('mode') as IDBRequest<ClassroomMode | undefined>),
      result(tx.objectStore(SETTINGS).get('display') as IDBRequest<PupilDisplay | undefined>),
    ])
    return { pupils: pupils.sort((a, b) => a.name.localeCompare(b.name, 'es')), mode: mode === 'class' ? 'class' : 'rosetta', display: display === 'photo' || display === 'name' ? display : 'both' }
  } finally {
    db.close()
  }
}

export async function savePupil(pupil: Pupil) {
  const db = await openClassroom()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ ...pupil, name: normalizeName(pupil.name), surnameInitial: normalizeInitial(pupil.surnameInitial ?? '') || undefined })
    await done(tx)
  } finally { db.close() }
}

export async function removePupil(id: string) {
  const db = await openClassroom()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    await done(tx)
  } finally { db.close() }
}

export async function setClassroomMode(mode: ClassroomMode) {
  const db = await openClassroom()
  try {
    const tx = db.transaction(SETTINGS, 'readwrite')
    tx.objectStore(SETTINGS).put(mode, 'mode')
    await done(tx)
  } finally { db.close() }
}

export async function setPupilDisplay(display: PupilDisplay) {
  const db = await openClassroom()
  try {
    const tx = db.transaction(SETTINGS, 'readwrite')
    tx.objectStore(SETTINGS).put(display, 'display')
    await done(tx)
  } finally { db.close() }
}

// Backups only leave the browser when the teacher explicitly saves the file.
// Photos are embedded locally in the downloaded JSON.
export async function exportClassroom() {
  const { pupils, mode, display } = await readClassroom()
  const convert = (blob?: Blob): Promise<string | null> => !blob ? Promise.resolve(null) : new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
  const records = await Promise.all(pupils.map(async ({ photo, nameAudio, ...pupil }) => ({ ...pupil, photo: await convert(photo), nameAudio: await convert(nameAudio) })))
  return JSON.stringify({ format: 'rosetta-private-classroom', version: 1, mode, display, pupils: records }, null, 2)
}

export interface ClassroomBackupSummary { pupils: number; photos: number; recordings: number }

/** Validate the backup manifest without reading or exposing private image/audio content. */
export function inspectClassroomBackup(json: string): ClassroomBackupSummary {
  const parsed: unknown = JSON.parse(json)
  if (!parsed || typeof parsed !== 'object' || !('format' in parsed) || parsed.format !== 'rosetta-private-classroom' || !('version' in parsed) || parsed.version !== 1 || !('pupils' in parsed) || !Array.isArray(parsed.pupils) || parsed.pupils.length > 100) {
    throw new Error('La copia de Mi clase no tiene un formato compatible.')
  }
  const seen = new Set<string>()
  let photos = 0
  let recordings = 0
  for (const pupil of parsed.pupils) {
    if (!pupil || typeof pupil !== 'object' || typeof pupil.id !== 'string' || pupil.id.length > 100 || !pupil.id || seen.has(pupil.id) || typeof pupil.name !== 'string' || !pupil.name.trim() || pupil.name.length > 80) {
      throw new Error('La copia contiene alumnos no válidos o duplicados.')
    }
    seen.add(pupil.id)
    if (pupil.photo != null) {
      if (typeof pupil.photo !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(pupil.photo) || pupil.photo.length > 7000000) throw new Error('La copia incluye una imagen inválida.')
      photos += 1
    }
    if (pupil.nameAudio != null) {
      if (typeof pupil.nameAudio !== 'string' || !/^data:audio\/(mpeg|mp3|wav|x-wav|ogg|webm);base64,/.test(pupil.nameAudio) || pupil.nameAudio.length > 9000000) throw new Error('La copia incluye un audio inválido.')
      recordings += 1
    }
  }
  return { pupils: parsed.pupils.length, photos, recordings }
}

export async function importClassroom(json: string) {
  inspectClassroomBackup(json)
  const parsed: unknown = JSON.parse(json)
  if (!parsed || typeof parsed !== 'object' || !('format' in parsed) || parsed.format !== 'rosetta-private-classroom' || !('pupils' in parsed) || !Array.isArray(parsed.pupils) || parsed.pupils.length > 100) {
    throw new Error('Este archivo no es una copia válida de Mi clase.')
  }
  const payload = parsed as { mode?: unknown; display?: unknown; pupils: unknown[] }
  const imported: Pupil[] = []
  const importedIds = new Set<string>()
  for (const unvalidated of payload.pupils) {
    const item = unvalidated as { id?: unknown; name?: unknown; surnameInitial?: unknown; photo?: unknown; nameAudio?: unknown } | null
    if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80 || (item.surnameInitial != null && typeof item.surnameInitial !== 'string')) throw new Error('Hay un alumno con datos no válidos.')
    if (item.id.length > 100 || importedIds.has(item.id)) throw new Error('La copia tiene identificadores duplicados o inválidos.')
    importedIds.add(item.id)
    let photo: Blob | undefined
    if (item.photo != null) {
      if (typeof item.photo !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(item.photo) || item.photo.length > 7000000) throw new Error('La copia incluye una imagen no compatible.')
      const response = await fetch(item.photo)
      photo = await response.blob()
      if (photo.size > 5 * 1024 * 1024) throw new Error('Una imagen de la copia supera el límite permitido.')
    }
    let nameAudio: Blob | undefined
    if (item.nameAudio != null) {
      if (typeof item.nameAudio !== 'string' || !/^data:audio\/(mpeg|mp3|wav|x-wav|ogg|webm);base64,/.test(item.nameAudio) || item.nameAudio.length > 9000000) throw new Error('La copia incluye un audio no compatible.')
      nameAudio = await (await fetch(item.nameAudio)).blob()
      if (nameAudio.size > 7 * 1024 * 1024) throw new Error('Un audio de la copia supera el límite permitido.')
    }
    imported.push({ id: item.id, name: normalizeName(item.name), surnameInitial: normalizeInitial(typeof item.surnameInitial === 'string' ? item.surnameInitial : '') || undefined, photo, nameAudio })
  }
  const db = await openClassroom()
  try {
    const tx = db.transaction([STORE, SETTINGS], 'readwrite')
    const store = tx.objectStore(STORE)
    store.clear()
    imported.forEach((pupil) => store.put(pupil))
    tx.objectStore(SETTINGS).put(payload.mode === 'class' ? 'class' : 'rosetta', 'mode')
    tx.objectStore(SETTINGS).put(payload.display === 'photo' || payload.display === 'name' ? payload.display : 'both', 'display')
    await done(tx)
  } finally { db.close() }
}
