import type { AudioResource, LocalContentDraft, LocalContentRecord, Pictogram } from '../domain/content'
import type { ActionCompatibility, LocalSceneRecord } from '../domain/sentence'
import { createLocalContentId, listLocalContent, openDatabase, requestResult, saveLocalContent, transactionDone } from './localContentRepository'
import { mergeCompatibility, validateRule, validateScene, validateWord, wordPictograms } from './resourceBank'

export interface ResourceBank { words: LocalContentRecord[]; scenes: LocalSceneRecord[]; rules: ActionCompatibility[] }
export interface BankContext { pictograms: Pictogram[]; rules: ActionCompatibility[] }

async function listStore<T>(store: string): Promise<T[]> {
  const db = await openDatabase()
  try { return await requestResult(db.transaction(store,'readonly').objectStore(store).getAll() as IDBRequest<T[]>) }
  finally { db.close() }
}
export const listLocalScenes = () => listStore<LocalSceneRecord>('local-scenes')
export const listLocalRules = () => listStore<ActionCompatibility>('local-rules')
export const readResourceBank = async (): Promise<ResourceBank> => {
  const db = await openDatabase()
  try {
    const tx = db.transaction(['local-content','local-scenes','local-rules'],'readonly')
    const done = transactionDone(tx)
    const [words,scenes,rules] = await Promise.all([
      requestResult(tx.objectStore('local-content').getAll() as IDBRequest<LocalContentRecord[]>),
      requestResult(tx.objectStore('local-scenes').getAll() as IDBRequest<LocalSceneRecord[]>),
      requestResult(tx.objectStore('local-rules').getAll() as IDBRequest<ActionCompatibility[]>),
    ])
    await done
    return { words,scenes,rules }
  } finally { db.close() }
}

export function validateBank(bank: ResourceBank, context: BankContext): void {
  const ids = new Set<string>()
  const overridden = new Set<string>()
  for (const word of bank.words) {
    validateWord(word)
    if (ids.has(word.id)) throw new Error('La copia contiene tarjetas duplicadas.')
    ids.add(word.id)
    if (word.overrideId) {
      if (!context.pictograms.some(({ id }) => id === word.overrideId) || overridden.has(word.overrideId)) throw new Error('La personalización de una tarjeta incluida no es válida.')
      overridden.add(word.overrideId)
    }
  }
  const pictograms = wordPictograms(context.pictograms,bank.words)
  const normalized = new Set<string>()
  for (const item of pictograms) {
    const name = item.label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
    if (normalized.has(name)) throw new Error(`Ya existe una tarjeta llamada «${item.label}».`)
    normalized.add(name)
  }
  const ruleIds = new Set<string>()
  for (const rule of bank.rules) {
    if (!rule || typeof rule.actionId !== 'string') throw new Error('La copia contiene una compatibilidad no válida.')
    if (ruleIds.has(rule.actionId)) throw new Error('Hay compatibilidades duplicadas para el mismo verbo.')
    ruleIds.add(rule.actionId)
  }
  const rules = mergeCompatibility(context.rules,bank.rules)
  rules.forEach((rule) => validateRule(rule,pictograms))
  const sceneIds = new Set<string>()
  for (const scene of bank.scenes) {
    if (sceneIds.has(scene.id)) throw new Error('La copia contiene escenas duplicadas.')
    sceneIds.add(scene.id)
    validateScene(scene,pictograms,rules)
  }
}

async function mutate(store: string, key: string, value?: unknown) {
  const db = await openDatabase()
  try {
    const tx = db.transaction(store,'readwrite');const done = transactionDone(tx)
    if (value === undefined) tx.objectStore(store).delete(key)
    else tx.objectStore(store).put(value)
    await done
  } finally { db.close() }
}
export async function saveBankWord(draft: LocalContentDraft, context: BankContext) {
  draft = { ...draft,imageBlob:draft.imageBlob.type ? draft.imageBlob : new Blob([draft.imageBlob],{type:'image/png'}),audioBlob:draft.audioBlob.type ? draft.audioBlob : new Blob([draft.audioBlob],{type:'audio/mpeg'}),pluralAudioBlob:draft.pluralAudioBlob && !draft.pluralAudioBlob.type ? new Blob([draft.pluralAudioBlob],{type:'audio/mpeg'}) : draft.pluralAudioBlob }
  const bank = await readResourceBank();const now = new Date().toISOString()
  const word: LocalContentRecord = { ...draft,id:draft.id ?? createLocalContentId(draft.label),createdAt:draft.createdAt ?? now,updatedAt:now }
  const next = { ...bank,words:[...bank.words.filter(({ id }) => id !== word.id),word] }
  validateBank(next,context)
  return saveLocalContent(draft)
}
export async function deleteBankWord(id: string, context: BankContext) {
  const bank = await readResourceBank()
  validateBank({ ...bank,words:bank.words.filter((word) => word.id !== id) },context)
  await mutate('local-content',id)
}
export async function saveLocalScene(scene: LocalSceneRecord, context: BankContext) {
  const bank = await readResourceBank()
  validateBank({ ...bank,scenes:[...bank.scenes.filter(({ id }) => id !== scene.id),scene] },context)
  await mutate('local-scenes',scene.id,scene)
}
export const deleteLocalScene = (id: string) => mutate('local-scenes',id)
export async function saveLocalRule(rule: ActionCompatibility, context: BankContext) {
  const bank = await readResourceBank()
  validateBank({ ...bank,rules:[...bank.rules.filter(({ actionId }) => actionId !== rule.actionId),rule] },context)
  await mutate('local-rules',rule.actionId,rule)
}
export async function deleteLocalRule(actionId: string, context: BankContext) {
  const bank = await readResourceBank()
  validateBank({ ...bank,rules:bank.rules.filter((rule) => rule.actionId !== actionId) },context)
  await mutate('local-rules',actionId)
}

const encode = (blob: Blob, name: string) => new Promise<{name:string;type:string;dataUrl:string}>((resolve,reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve({ name,type:blob.type,dataUrl:String(reader.result) })
  reader.onerror = () => reject(new Error('No se pudo preparar la copia.'))
  reader.readAsDataURL(blob)
})
export async function createResourceBankBackup(): Promise<Blob> {
  const bank = await readResourceBank()
  const words = await Promise.all(bank.words.map(async (word) => ({
    ...word,imageBlob:undefined,audioBlob:undefined,pluralAudioBlob:undefined,
    image:await encode(word.imageBlob,word.imageFileName),audio:await encode(word.audioBlob,word.audioFileName),
    pluralAudio:word.pluralAudioBlob ? await encode(word.pluralAudioBlob,word.pluralAudioFileName ?? 'plural.mp3') : undefined,
  })))
  const scenes = await Promise.all(bank.scenes.map(async (scene) => ({
    ...scene,imageBlob:undefined,audioBlob:undefined,image:await encode(scene.imageBlob,scene.imageFileName),audio:scene.audioBlob ? await encode(scene.audioBlob,scene.audioFileName ?? 'frase.mp3') : undefined,
  })))
  return new Blob([JSON.stringify({ schemaVersion:2,exportedAt:new Date().toISOString(),words,scenes,rules:bank.rules })],{type:'application/json'})
}

function decode(value: unknown, kind: 'image' | 'audio'): {blob:Blob;name:string} {
  if (!value || typeof value !== 'object') throw new Error('La copia contiene un archivo incompleto.')
  const file = value as {name?:unknown;dataUrl?:unknown}
  if (typeof file.name !== 'string' || typeof file.dataUrl !== 'string') throw new Error('Archivo de copia no válido.')
  const match = /^(data:(image\/png|audio\/mpeg|audio\/mp3);base64,)([A-Za-z0-9+/]*={0,2})$/.exec(file.dataUrl)
  if (!match || !match[2].startsWith(`${kind}/`)) throw new Error('La copia solo admite imágenes PNG y audios MP3 incluidos en el archivo.')
  let data: string
  try { data = atob(match[3]) } catch { throw new Error('La copia contiene un archivo dañado.') }
  return { blob:new Blob([Uint8Array.from(data,(char)=>char.charCodeAt(0))],{type:match[2]}),name:file.name }
}

export class BackupConflictError extends Error {}
export async function importResourceBankBackup(file: File, context: BankContext, replaceExisting = false): Promise<number> {
  let raw: unknown
  try { raw = JSON.parse(await file.text()) }
  catch { throw new Error('No se pudo leer la copia. Selecciona un archivo JSON exportado por Rosetta Digital.') }
  if (!raw || typeof raw !== 'object') throw new Error('El archivo no es una copia válida de Rosetta Digital.')
  const source = raw as {schemaVersion?:unknown;items?:unknown;words?:unknown;scenes?:unknown;rules?:unknown}
  const legacy = source.schemaVersion === 1
  if ((!legacy && source.schemaVersion !== 2) || !Array.isArray(legacy ? source.items : source.words) || (!legacy && (!Array.isArray(source.scenes) || !Array.isArray(source.rules)))) throw new Error('Versión de copia no compatible.')
  const now = new Date().toISOString()
  const words = (legacy ? source.items : source.words) as Array<LocalContentRecord & {image:unknown;audio:unknown;pluralAudio?:unknown}>
  const decodedWords = words.map((word) => {
    if (!word || typeof word !== 'object') throw new Error('La copia contiene una tarjeta no válida.')
    const image = decode(word.image,'image'),audio = decode(word.audio,'audio')
    const plural = word.pluralAudio ? decode(word.pluralAudio,'audio') : undefined
    return { ...word,imageBlob:image.blob,imageFileName:image.name,audioBlob:audio.blob,audioFileName:audio.name,pluralAudioBlob:plural?.blob,pluralAudioFileName:plural?.name,createdAt:word.createdAt || now,updatedAt:now }
  })
  const scenes = (legacy ? [] : source.scenes as Array<LocalSceneRecord & {image:unknown;audio?:unknown}>).map((scene) => {
    if (!scene || typeof scene !== 'object') throw new Error('La copia contiene una escena no válida.')
    const image = decode(scene.image,'image'),audio = scene.audio ? decode(scene.audio,'audio') : undefined
    return { ...scene,imageBlob:image.blob,imageFileName:image.name,audioBlob:audio?.blob,audioFileName:audio?.name,createdAt:scene.createdAt || now,updatedAt:now }
  })
  const incoming: ResourceBank = { words:decodedWords,scenes,rules:legacy ? [] : source.rules as ActionCompatibility[] }
  validateBank(incoming,context)
  const existing = await readResourceBank()
  const collisions = incoming.words.some((word)=>existing.words.some(({id})=>id===word.id)) || incoming.scenes.some((scene)=>existing.scenes.some(({id})=>id===scene.id)) || incoming.rules.some((rule)=>existing.rules.some(({actionId})=>actionId===rule.actionId))
  if (collisions && !replaceExisting) throw new BackupConflictError('La copia contiene recursos que ya existen. ¿Quieres sustituir esos recursos conservando los demás?')
  const merge = <T,>(first:T[],second:T[],key:(item:T)=>string) => [...new Map([...first,...second].map((item)=>[key(item),item])).values()]
  const combined: ResourceBank = { words:merge(existing.words,incoming.words,(word)=>word.id),scenes:merge(existing.scenes,incoming.scenes,(scene)=>scene.id),rules:merge(existing.rules,incoming.rules,(rule)=>rule.actionId) }
  validateBank(combined,context)
  const db = await openDatabase()
  try {
    const tx = db.transaction(['local-content','local-scenes','local-rules'],'readwrite');const done=transactionDone(tx)
    incoming.words.forEach((word)=>tx.objectStore('local-content').put(word))
    incoming.scenes.forEach((scene)=>tx.objectStore('local-scenes').put(scene))
    incoming.rules.forEach((rule)=>tx.objectStore('local-rules').put(rule))
    await done
  } finally { db.close() }
  return incoming.words.length+incoming.scenes.length+incoming.rules.length
}

// Used by callers that only need the original word list.
export { listLocalContent }

export function localSceneToRuntime(scene: LocalSceneRecord) {
  const image = URL.createObjectURL(scene.imageBlob)
  const audio = scene.audioBlob ? URL.createObjectURL(scene.audioBlob) : undefined
  const audioId = `audio-${scene.id}`
  return {
    sentence: { id:scene.id,subjectId:scene.clauses[0].subjectIds[0],actionId:scene.clauses[0].actionId,complementIds:scene.clauses[0].complementIds,clauses:scene.clauses,sceneImage:image,audioId:audio ? audioId : undefined,availableFromUnit:scene.availableFromUnit },
    audio: audio ? { id:audioId,kind:'sentence' as const,file:audio } satisfies AudioResource : undefined,
    objectUrls:[image,...(audio ? [audio] : [])],
  }
}
