import type { SentenceBuilderSettings } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility } from '../../domain/sentence'
import type { SentencePart } from '../dictation/dictationRounds'

export interface SentenceSlot {
  role: SentencePart
  clause: number
}

export function sentenceLayout(settings: Pick<SentenceBuilderSettings, 'subjectCount' | 'complementCount' | 'clauseCount'>): SentenceSlot[] {
  const slots: SentenceSlot[] = []
  for (let clause = 0; clause < settings.clauseCount; clause += 1) {
    if (clause) slots.push({ role: 'conjunction', clause })
    for (let subject = 0; subject < settings.subjectCount; subject += 1) {
      if (subject) slots.push({ role: 'conjunction', clause })
      slots.push({ role: 'subject', clause })
    }
    slots.push({ role: 'action', clause })
    for (let complement = 0; complement < settings.complementCount; complement += 1) {
      if (complement) slots.push({ role: complement === settings.complementCount - 1 ? 'conjunction' : 'comma', clause })
      slots.push({ role: 'complement', clause })
    }
  }
  return [...slots, { role: 'punctuation', clause: settings.clauseCount - 1 }]
}

const plurals: Record<string, string> = {
  barre: 'barren', besa: 'besan', bebe: 'beben', canta: 'cantan', cocina: 'cocinan',
  come: 'comen', compra: 'compran', corre: 'corren', corta: 'cortan', duerme: 'duermen',
  juega: 'juegan', lee: 'leen', nada: 'nadan', patina: 'patinan', pinta: 'pintan',
}

export function actionForSubjects(action: Pictogram, count: number): Pictogram {
  if (count === 1) return action
  const plural = plurals[action.id]
  if (!plural) return action
  return {
    ...action, label: plural, audioIds: [`word-${plural}`],
    grammatical: { ...action.grammatical, number: 'plural', displayForm: plural },
  }
}

export const supportsPlural = (action: Pictogram) => Boolean(plurals[action.id])

export type BuilderSelection = Array<Pictogram | undefined>

export function reconcileSelection(selection: BuilderSelection, slots: SentenceSlot[], rules: ActionCompatibility[]): BuilderSelection {
  const result = [...selection]
  for (const clause of new Set(slots.map((slot) => slot.clause))) {
    const subjectIds = new Set<string>()
    const subjects: Pictogram[] = []
    slots.forEach((slot, index) => {
      if (slot.clause !== clause || slot.role !== 'subject') return
      const item = result[index]
      if (!item || subjectIds.has(item.id)) result[index] = undefined
      else { subjectIds.add(item.id); subjects.push(item) }
    })
    const requiredSubjects = slots.filter((slot) => slot.clause === clause && slot.role === 'subject').length
    const actionIndex = slots.findIndex((slot) => slot.clause === clause && slot.role === 'action')
    const rule = rules.find((candidate) => candidate.actionId === result[actionIndex]?.id &&
      subjects.length === requiredSubjects && subjects.every(({ id }) => !candidate.allowedSubjectIds || candidate.allowedSubjectIds.includes(id)))
    if (!rule) result[actionIndex] = undefined
    const complements = new Set<string>()
    slots.forEach((slot, index) => {
      if (slot.clause !== clause || slot.role !== 'complement') return
      const item = result[index]
      if (!item) return
      if (!rule?.allowedComplementIds.includes(item.id) || complements.has(item.id)) result[index] = undefined
      else complements.add(item.id)
    })
  }
  return result
}

export const commaPictogram: Pictogram = {
  id: 'coma', label: ',', image: 'images/coma.svg', audioIds: [], categories: ['punctuation'],
  tags: [], availableFromUnit: 1, grammatical: { role: ['punctuation'] },
}
