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
