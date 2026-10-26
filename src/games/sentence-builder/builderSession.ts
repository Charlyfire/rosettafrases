import type { SentenceBuilderSettings } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility } from '../../domain/sentence'
import type { SentencePart } from '../dictation/dictationRounds'
import { sentenceLayout, actionForSubjects, supportsPlural } from '../sentences/sentenceStructure'
import { getBuilderSubjects } from './sentenceBuilderOptions'

export function builderRoles(subjectCount: 1 | 2, complementCount: 0 | 1 | 2 | 3, clauseCount: 1 | 2 = 1): SentencePart[] {
  return sentenceLayout({ subjectCount, complementCount, clauseCount }).map(({ role }) => role)
}

// Only offer choices that can finish the requested sentence with distinct complements.
export function builderChoices(pictograms: Pictogram[], compatibility: ActionCompatibility[], settings: SentenceBuilderSettings) {
  const ids = new Set(pictograms.map(({ id }) => id))
  const rules = compatibility.filter((rule) => {
    const action = pictograms.find(({ id }) => id === rule.actionId)
    return action && (settings.subjectCount === 1 || supportsPlural(action)) && (settings.complementCount === 0
    ? rule.allowWithoutComplement
    : new Set(rule.allowedComplementIds.filter((id) => ids.has(id))).size >= settings.complementCount)
  })
  const subjects = getBuilderSubjects(pictograms).filter(({ id }) => rules.some((rule) =>
    ids.has(rule.actionId) && (!rule.allowedSubjectIds || rule.allowedSubjectIds.includes(id)),
  ))
  const actionIds = new Set(rules.filter((rule) => subjects.some(({ id }) =>
    !rule.allowedSubjectIds || rule.allowedSubjectIds.includes(id),
  )).map(({ actionId }) => actionId))
  const complementIds = new Set(rules.filter(({ actionId }) => actionIds.has(actionId)).flatMap(({ allowedComplementIds }) => allowedComplementIds))
  return {
    subjects,
    actions: pictograms.filter(({ id }) => actionIds.has(id)).map((action) => actionForSubjects(action, settings.subjectCount)),
    complements: pictograms.filter(({ id }) => complementIds.has(id)),
    rules,
  }
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
