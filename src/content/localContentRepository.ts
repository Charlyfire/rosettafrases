import type {
  AudioResource,
  LocalContentDraft,
  LocalContentRecord,
  Pictogram,
} from '../domain/content'

const DATABASE_NAME = 'rosetta-digital-content'
const DATABASE_VERSION = 2
const STORE_NAME = 'local-content'

export const requestResult = <T,>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Error de almacenamiento local.'))
  })

export const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('No se pudo guardar el contenido.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Se canceló el guardado.'))
  })

export const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      if (!database.objectStoreNames.contains('local-scenes')) database.createObjectStore('local-scenes', { keyPath: 'id' })
      if (!database.objectStoreNames.contains('local-rules')) database.createObjectStore('local-rules', { keyPath: 'actionId' })
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
    overrideId: draft.overrideId,
    pluralLabel: draft.pluralLabel?.trim() || undefined,
    pluralAudioBlob: draft.pluralAudioBlob,
    pluralAudioFileName: draft.pluralAudioFileName,
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

export const localRecordToRuntime = (record: LocalContentRecord): {
  pictogram: Pictogram
  audio: AudioResource
  pluralAudio?: AudioResource
  objectUrls: string[]
} => {
  const imageUrl = URL.createObjectURL(record.imageBlob)
  const audioUrl = URL.createObjectURL(record.audioBlob)
  const audioId = `word-${record.id}`
  const pluralUrl = record.pluralAudioBlob ? URL.createObjectURL(record.pluralAudioBlob) : undefined
  const pluralId = `${audioId}-plural`
  return {
    pictogram: {
      id: record.overrideId ?? record.id,
      label: record.label,
      image: imageUrl,
      audioIds: [audioId],
      categories: record.categories,
      tags: [],
      initialSound: record.initialSound,
      availableFromUnit: record.availableFromUnit,
      source: 'local',
      grammatical: record.categories.includes('action') && record.pluralLabel ? { role: ['action'], pluralForm: record.pluralLabel, pluralAudioIds: pluralUrl ? [pluralId] : [] } : undefined,
    },
    audio: {
      id: audioId,
      kind: 'word',
      file: audioUrl,
      transcript: record.label,
    },
    pluralAudio: pluralUrl ? { id: pluralId, kind: 'word', file: pluralUrl, transcript: record.pluralLabel } : undefined,
    objectUrls: [imageUrl, audioUrl, ...(pluralUrl ? [pluralUrl] : [])],
  }
}
