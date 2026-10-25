import type { SentenceBuilderSettings } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility } from '../../domain/sentence'
import type { SentencePart } from '../dictation/dictationRounds'
import { getBuilderSubjects } from './sentenceBuilderOptions'

export function builderRoles(subjectCount: number, complementCount: number): SentencePart[] {
  const roles: SentencePart[] = []
  for (let subject = 0; subject < subjectCount; subject += 1) {
    if (subject > 0) roles.push('conjunction')
    roles.push('subject', 'action')
    for (let i = 0; i < complementCount; i += 1) {
      if (i > 0) roles.push('conjunction')
      roles.push('complement')
    }
  }
  return [...roles, 'punctuation']
}

// Only offer choices that can finish the requested sentence with distinct complements.
export function builderChoices(pictograms: Pictogram[], compatibility: ActionCompatibility[], settings: SentenceBuilderSettings) {
  const ids = new Set(pictograms.map(({ id }) => id))
  const rules = compatibility.filter((rule) => settings.complementCount === 0
    ? rule.allowWithoutComplement
    : new Set(rule.allowedComplementIds.filter((id) => ids.has(id))).size >= settings.complementCount)
  const subjects = getBuilderSubjects(pictograms).filter(({ id }) => rules.some((rule) =>
    ids.has(rule.actionId) && (!rule.allowedSubjectIds || rule.allowedSubjectIds.includes(id)),
  ))
  const actionIds = new Set(rules.filter((rule) => subjects.some(({ id }) =>
    !rule.allowedSubjectIds || rule.allowedSubjectIds.includes(id),
  )).map(({ actionId }) => actionId))
  const complementIds = new Set(rules.filter(({ actionId }) => actionIds.has(actionId)).flatMap(({ allowedComplementIds }) => allowedComplementIds))
  return {
    subjects,
    actions: pictograms.filter(({ id }) => actionIds.has(id)),
    complements: pictograms.filter(({ id }) => complementIds.has(id)),
    rules,
  }
}

export type BuilderSelection = Array<Pictogram | undefined>

// Keep independent slots when a word changes; clear only invalid dependent choices.
export function reconcileBuilderSelection(selection: BuilderSelection, roles: SentencePart[], rules: ActionCompatibility[]): BuilderSelection {
  const result = [...selection]
  const subjects = new Set<string>()
  let subject: Pictogram | undefined
  let action: ActionCompatibility | undefined
  let complements = new Set<string>()
  roles.forEach((role, index) => {
    const item = result[index]
    if (role === 'subject') {
      subject = item && !subjects.has(item.id) ? item : undefined
      result[index] = subject
      if (subject) subjects.add(subject.id)
      action = undefined
      complements = new Set()
    } else if (role === 'action') {
      const subjectId = subject?.id
      action = subjectId && item ? rules.find((rule) => rule.actionId === item.id &&
        (!rule.allowedSubjectIds || rule.allowedSubjectIds.includes(subjectId))) : undefined
      if (!action) result[index] = undefined
    } else if (role === 'complement' && item) {
      if (!action?.allowedComplementIds.includes(item.id) || complements.has(item.id)) result[index] = undefined
      else complements.add(item.id)
    }
  })
  return result
}

export const complementCategoryLabels = {
  all: 'Todos', food: 'Alimentos', drink: 'Bebidas', objects: 'Objetos', other: 'Otros',
} as const
export type ComplementCategory = keyof typeof complementCategoryLabels
export function complementCategory(item: Pictogram): Exclude<ComplementCategory, 'all'> {
  if (item.categories.includes('drink')) return 'drink'
  if (item.categories.includes('food')) return 'food'
  if (item.categories.includes('toy') || item.categories.includes('noun')) return 'objects'
  return 'other'
}
