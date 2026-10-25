import type { Pictogram } from '../../domain/content'
import type { SentenceStructureType } from '../../domain/activity'
import type { ActionCompatibility, SentenceDefinition } from '../../domain/sentence'

const hasRole = (pictogram: Pictogram, role: 'subject' | 'action' | 'complement') =>
  pictogram.grammatical?.role?.includes(role) || pictogram.categories.includes(role)

export const getBuilderSubjects = (pictograms: Pictogram[]) =>
  pictograms.filter((pictogram) => hasRole(pictogram, 'subject'))

export const getBuilderActions = (
  pictograms: Pictogram[],
  compatibility: ActionCompatibility[],
  subjectId: string,
  structure: SentenceStructureType,
) => {
  const allowedActionIds = new Set(compatibility
    .filter((rule) => (!rule.allowedSubjectIds || rule.allowedSubjectIds.includes(subjectId)) &&
      (structure === 'subject-action' ? rule.allowWithoutComplement : rule.allowedComplementIds.length > 0))
    .map(({ actionId }) => actionId))
  return pictograms.filter((pictogram) =>
    hasRole(pictogram, 'action') && allowedActionIds.has(pictogram.id))
}

export const getBuilderComplements = (
  pictograms: Pictogram[],
  compatibility: ActionCompatibility[],
  actionId: string,
) => {
  const rule = compatibility.find(({ actionId: currentId }) => currentId === actionId)
  const allowedIds = new Set(rule?.allowedComplementIds ?? [])
  return pictograms.filter((pictogram) =>
    hasRole(pictogram, 'complement') && allowedIds.has(pictogram.id))
}

export const getAllBuilderComplements = (pictograms: Pictogram[]) =>
  pictograms.filter((pictogram) => hasRole(pictogram, 'complement'))

export const findBuiltSentence = (
  sentences: SentenceDefinition[],
  subjectId: string,
  actionId: string,
  complementIds: string[] = [],
) => sentences.find((sentence) =>
  sentence.subjectId === subjectId &&
  sentence.actionId === actionId &&
  sentence.complementIds.length === complementIds.length &&
  sentence.complementIds.every((id, index) => id === complementIds[index]))
