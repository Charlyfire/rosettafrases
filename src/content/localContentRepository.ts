import type {
  AudioResource,
  LocalContentDraft,
  LocalContentRecord,
  Pictogram,
} from '../domain/content'

const DATABASE_NAME = 'rosetta-digital-content'
const DATABASE_VERSION = 1
const STORE_NAME = 'local-content'

interface BackupFile {
  name: string
  type: string
  dataUrl: string
}

interface BackupItem {
  id: string
  label: string
  image: BackupFile
  audio: BackupFile
  categories: LocalContentRecord['categories']
  initialSound?: LocalContentRecord['initialSound']
  availableFromUnit: number
  createdAt: string
  updatedAt: string
}

interface LocalContentBackup {
  schemaVersion: 1
  exportedAt: string
  items: BackupItem[]
}

const requestResult = <T,>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Error de almacenamiento local.'))
  })

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('No se pudo guardar el contenido.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Se canceló el guardado.'))
  })

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir el banco local.'))
  })

export const slugifyContentLabel = (label: string) =>
  label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const createLocalContentId = (label: string) => {
  const slug = slugifyContentLabel(label)
  if (!slug) throw new Error('El nombre debe contener letras o números.')
  return `local-${slug}`
}

export const listLocalContent = async (): Promise<LocalContentRecord[]> => {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const records = await requestResult(
      transaction.objectStore(STORE_NAME).getAll() as IDBRequest<LocalContentRecord[]>,
    )
    return records.sort((left, right) => left.label.localeCompare(right.label, 'es'))
  } finally {
    database.close()
  }
}

export const saveLocalContent = async (draft: LocalContentDraft): Promise<LocalContentRecord> => {
  const now = new Date().toISOString()
  const imageBlob = draft.imageBlob.type
    ? draft.imageBlob
    : new Blob([draft.imageBlob], { type: 'image/png' })
  const audioBlob = draft.audioBlob.type
    ? draft.audioBlob
    : new Blob([draft.audioBlob], { type: 'audio/mpeg' })
  const record: LocalContentRecord = {
    id: draft.id ?? createLocalContentId(draft.label),
    label: draft.label.trim(),
    imageBlob,
    imageFileName: draft.imageFileName,
    audioBlob,
    audioFileName: draft.audioFileName,
    categories: draft.categories,
    initialSound: draft.initialSound,
    availableFromUnit: draft.availableFromUnit,
    createdAt: draft.createdAt ?? now,
    updatedAt: now,
  }
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(record)
    await transactionDone(transaction)
    return record
  } finally {
    database.close()
  }
}

export const deleteLocalContent = async (id: string) => {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(id)
    await transactionDone(transaction)
  } finally {
    database.close()
  }
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo preparar la copia.'))
    reader.readAsDataURL(blob)
  })

export const createLocalContentBackup = async (records: LocalContentRecord[]): Promise<Blob> => {
  const items = await Promise.all(records.map(async (record): Promise<BackupItem> => ({
    id: record.id,
    label: record.label,
    image: {
      name: record.imageFileName,
      type: record.imageBlob.type,
      dataUrl: await blobToDataUrl(record.imageBlob),
    },
    audio: {
      name: record.audioFileName,
      type: record.audioBlob.type,
      dataUrl: await blobToDataUrl(record.audioBlob),
    },
    categories: record.categories,
    initialSound: record.initialSound,
    availableFromUnit: record.availableFromUnit,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })))
  const backup: LocalContentBackup = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    items,
  }
  return new Blob([JSON.stringify(backup)], { type: 'application/json' })
}

const isBackup = (value: unknown): value is LocalContentBackup => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<LocalContentBackup>
  return candidate.schemaVersion === 1 && Array.isArray(candidate.items)
}

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl)
  if (!response.ok) throw new Error('La copia contiene un archivo que no puede leerse.')
  return response.blob()
}

export const importLocalContentBackup = async (file: File): Promise<number> => {
  const parsed: unknown = JSON.parse(await file.text())
  if (!isBackup(parsed)) throw new Error('El archivo no es una copia válida de Rosetta Digital.')

  for (const item of parsed.items) {
    if (
      !item.id?.startsWith('local-') ||
      !item.label ||
      !item.image?.dataUrl?.startsWith('data:image/') ||
      !item.audio?.dataUrl?.startsWith('data:audio/') ||
      !Array.isArray(item.categories) ||
      !Number.isInteger(item.availableFromUnit) ||
      item.availableFromUnit < 1 ||
      item.availableFromUnit > 10
    ) {
      throw new Error('La copia contiene una entrada incompleta o no válida.')
    }
  }

  let imported = 0
  for (const item of parsed.items) {
    await saveLocalContent({
      id: item.id,
      label: item.label,
      imageBlob: await dataUrlToBlob(item.image.dataUrl),
      imageFileName: item.image.name,
      audioBlob: await dataUrlToBlob(item.audio.dataUrl),
      audioFileName: item.audio.name,
      categories: item.categories,
      initialSound: item.initialSound,
      availableFromUnit: item.availableFromUnit,
      createdAt: item.createdAt,
    })
    imported += 1
  }
  return imported
}

export const localRecordToRuntime = (record: LocalContentRecord): {
  pictogram: Pictogram
  audio: AudioResource
  objectUrls: string[]
} => {
  const imageUrl = URL.createObjectURL(record.imageBlob)
  const audioUrl = URL.createObjectURL(record.audioBlob)
  const audioId = `word-${record.id}`
  return {
    pictogram: {
      id: record.id,
      label: record.label,
      image: imageUrl,
      audioIds: [audioId],
      categories: record.categories,
      tags: [],
      initialSound: record.initialSound,
      availableFromUnit: record.availableFromUnit,
      source: 'local',
    },
    audio: {
      id: audioId,
      kind: 'word',
      file: audioUrl,
      transcript: record.label,
    },
    objectUrls: [imageUrl, audioUrl],
  }
}
