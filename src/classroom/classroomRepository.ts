export interface Pupil {
  id: string
  name: string
  surnameInitial?: string
  photo?: Blob
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
  (raw.trim().replace(/\./g, '').charAt(0).toLocaleUpperCase('es') || '')

export const pupilDisplayName = (pupil: Pupil) =>
  `${pupil.name}${pupil.surnameInitial ? ' ' + pupil.surnameInitial + '.' : ''}`

export async function readClassroom(): Promise<{ pupils: Pupil[]; mode: ClassroomMode }> {
  const db = await openClassroom()
  try {
    const tx = db.transaction([STORE, SETTINGS], 'readonly')
    const [pupils, mode] = await Promise.all([
      result(tx.objectStore(STORE).getAll() as IDBRequest<Pupil[]>),
      result(tx.objectStore(SETTINGS).get('mode') as IDBRequest<ClassroomMode | undefined>),
    ])
    return { pupils: pupils.sort((a, b) => a.name.localeCompare(b.name, 'es')), mode: mode === 'class' ? 'class' : 'rosetta' }
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

// Backups only leave the browser when the teacher explicitly saves the file.
// Photos are embedded locally in the downloaded JSON.
export async function exportClassroom() {
  const { pupils, mode } = await readClassroom()
  const convert = (blob?: Blob): Promise<string | null> => !blob ? Promise.resolve(null) : new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
  const records = await Promise.all(pupils.map(async ({ photo, ...pupil }) => ({ ...pupil, photo: await convert(photo) })))
  return JSON.stringify({ format: 'rosetta-private-classroom', version: 1, mode, pupils: records }, null, 2)
}

export async function importClassroom(json: string) {
  const parsed: unknown = JSON.parse(json)
  if (!parsed || typeof parsed !== 'object' || !('format' in parsed) || parsed.format !== 'rosetta-private-classroom' || !('pupils' in parsed) || !Array.isArray(parsed.pupils) || parsed.pupils.length > 100) {
    throw new Error('Este archivo no es una copia válida de Mi clase.')
  }
  const imported: Pupil[] = []
  for (const item of parsed.pupils) {
    if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80 || (item.surnameInitial != null && typeof item.surnameInitial !== 'string')) throw new Error('Hay un alumno con datos no válidos.')
    let photo: Blob | undefined
    if (item.photo != null) {
      if (typeof item.photo !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(item.photo) || item.photo.length > 7000000) throw new Error('La copia incluye una imagen no compatible.')
      const response = await fetch(item.photo)
      photo = await response.blob()
    }
    imported.push({ id: item.id, name: normalizeName(item.name), surnameInitial: normalizeInitial(item.surnameInitial ?? '') || undefined, photo })
  }
  const db = await openClassroom()
  try {
    const tx = db.transaction([STORE, SETTINGS], 'readwrite')
    const store = tx.objectStore(STORE)
    store.clear()
    imported.forEach((pupil) => store.put(pupil))
    tx.objectStore(SETTINGS).put(parsed.mode === 'class' ? 'class' : 'rosetta', 'mode')
    await done(tx)
  } finally { db.close() }
}
