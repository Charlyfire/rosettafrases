import type { ContentCategory, LocalContentRecord, Pictogram } from '../domain/content'
import type { ActionCompatibility, LocalSceneRecord, SentenceClauseDefinition } from '../domain/sentence'

export const contentCategories: ContentCategory[] = ['global-word','noun','food','drink','subject','action','complement','toy','character','vowel','conjunction','punctuation']
export const hasRole = (item: Pictogram, role: 'subject' | 'action' | 'complement') => item.categories.includes(role) || Boolean(item.grammatical?.role?.includes(role))
export const mergeCompatibility = (base: ActionCompatibility[], local: ActionCompatibility[]) => [...new Map([...base, ...local].map((rule) => [rule.actionId, rule])).values()]

export function validateRule(rule: ActionCompatibility, pictograms: Pictogram[]): void {
  if (!rule || typeof rule.actionId !== 'string' || !Array.isArray(rule.allowedComplementIds) || (rule.allowedSubjectIds !== undefined && !Array.isArray(rule.allowedSubjectIds))) throw new Error('Compatibilidad incompleta.')
  const byId = new Map(pictograms.map((item) => [item.id, item]))
  const action = byId.get(rule.actionId)
  if (!action || !hasRole(action, 'action')) throw new Error('El verbo de la compatibilidad no existe o no es una acción.')
  if (rule.allowWithoutComplement !== undefined && typeof rule.allowWithoutComplement !== 'boolean') throw new Error('Indica si el verbo admite frases sin complemento.')
  for (const [role, ids] of [['complement',rule.allowedComplementIds], ['subject',rule.allowedSubjectIds ?? []]] as const) {
    if (new Set(ids).size !== ids.length) throw new Error('Hay tarjetas repetidas en la compatibilidad.')
    for (const id of ids) {
      const item = byId.get(id)
      if (!item || !hasRole(item, role)) throw new Error(`La compatibilidad contiene un ${role === 'subject' ? 'sujeto' : 'complemento'} que no existe o tiene otra categoría.`)
    }
  }
}

export function validateClauses(clauses: SentenceClauseDefinition[], pictograms: Pictogram[], rules: ActionCompatibility[]): void {
  if (!Array.isArray(clauses) || clauses.length < 1 || clauses.length > 2) throw new Error('La escena necesita una o dos frases.')
  const byId = new Map(pictograms.map((item) => [item.id, item]))
  for (const clause of clauses) {
    if (!clause || !Array.isArray(clause.subjectIds) || !Array.isArray(clause.complementIds)) throw new Error('La frase de la escena está incompleta.')
    if (clause.subjectIds.length < 1 || clause.subjectIds.length > 2 || clause.complementIds.length > 3) throw new Error('Elige uno o dos sujetos y hasta tres complementos por frase.')
    if (new Set(clause.subjectIds).size !== clause.subjectIds.length || new Set(clause.complementIds).size !== clause.complementIds.length) throw new Error('No repitas una tarjeta dentro del mismo grupo de la frase.')
    if (clause.subjectIds.length !== clauses[0].subjectIds.length || clause.complementIds.length !== clauses[0].complementIds.length) throw new Error('Las dos frases deben tener la misma cantidad de sujetos y complementos para usar el menú común.')
    const action = byId.get(clause.actionId)
    const rule = rules.find(({ actionId }) => actionId === clause.actionId)
    if (!action || !hasRole(action, 'action') || !rule) throw new Error('Configura primero las compatibilidades del verbo de la escena.')
    if (clause.subjectIds.length === 2 && !action.grammatical?.pluralForm && !['barre','besa','bebe','canta','cocina','come','compra','corre','corta','duerme','juega','lee','nada','patina','pinta'].includes(action.id)) throw new Error('Añade la forma plural de este verbo en su tarjeta.')
    for (const id of clause.subjectIds) {
      const subject = byId.get(id)
      if (!subject || !hasRole(subject,'subject') || (rule.allowedSubjectIds && !rule.allowedSubjectIds.includes(id))) throw new Error('Uno de los sujetos no es compatible con el verbo.')
    }
    if (!clause.complementIds.length && !rule.allowWithoutComplement) throw new Error('Este verbo necesita al menos un complemento.')
    for (const id of clause.complementIds) {
      const complement = byId.get(id)
      if (!complement || !hasRole(complement,'complement') || !rule.allowedComplementIds.includes(id)) throw new Error('Uno de los complementos no es compatible con el verbo.')
    }
  }
}

export function validateWord(record: LocalContentRecord): void {
  if (typeof record.id !== 'string' || !record.id.startsWith('local-') || typeof record.label !== 'string' || !record.label.trim() || !Array.isArray(record.categories) || !record.categories.length || record.categories.some((category) => !contentCategories.includes(category))) throw new Error('La tarjeta tiene un nombre o categorías no válidos.')
  if (record.pluralLabel !== undefined && typeof record.pluralLabel !== 'string') throw new Error('La forma plural no es válida.')
  if (record.overrideId !== undefined && (typeof record.overrideId !== 'string' || !record.overrideId || record.overrideId.startsWith('local-'))) throw new Error('La tarjeta original que se quiere personalizar no es válida.')
  if (!Number.isInteger(record.availableFromUnit) || record.availableFromUnit < 1 || record.availableFromUnit > 10) throw new Error('La unidad debe estar entre 1 y 10.')
  if (!(record.imageBlob instanceof Blob) || !record.imageBlob.size || record.imageBlob.type !== 'image/png') throw new Error('La tarjeta necesita una imagen PNG.')
  if (!(record.audioBlob instanceof Blob) || !record.audioBlob.size || !['audio/mpeg','audio/mp3'].includes(record.audioBlob.type)) throw new Error('La tarjeta necesita un audio MP3.')
  if (record.pluralAudioBlob && (!record.pluralLabel?.trim() || !record.categories.includes('action') || !record.pluralAudioBlob.size || !['audio/mpeg','audio/mp3'].includes(record.pluralAudioBlob.type))) throw new Error('El audio plural necesita un verbo y su forma plural escrita.')
}

export function validateScene(record: LocalSceneRecord, pictograms: Pictogram[], rules: ActionCompatibility[]): void {
  if (typeof record.id !== 'string' || !record.id.startsWith('local-scene-') || typeof record.label !== 'string' || !record.label.trim() || !Number.isInteger(record.availableFromUnit) || record.availableFromUnit < 1 || record.availableFromUnit > 10) throw new Error('La escena necesita nombre y unidad entre 1 y 10.')
  if (!(record.imageBlob instanceof Blob) || !record.imageBlob.size || record.imageBlob.type !== 'image/png') throw new Error('La escena necesita una imagen PNG.')
  if (record.audioBlob && (!record.audioBlob.size || !['audio/mpeg','audio/mp3'].includes(record.audioBlob.type))) throw new Error('El audio de la escena debe ser un MP3.')
  validateClauses(record.clauses, pictograms, rules)
}

export function wordPictograms(base: Pictogram[], records: LocalContentRecord[]): Pictogram[] {
  const map = new Map(base.map((item) => [item.id, item]))
  for (const record of records) map.set(record.overrideId ?? record.id, { id: record.overrideId ?? record.id, label: record.label, image:'',audioIds:[], categories:record.categories, tags:[],availableFromUnit:record.availableFromUnit, grammatical: record.pluralLabel ? { pluralForm:record.pluralLabel } : undefined })
  return [...map.values()]
}
