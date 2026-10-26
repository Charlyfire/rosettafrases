import type { Pictogram } from '../domain/content'
import type { ActionCompatibility, SentenceDefinition } from '../domain/sentence'

const hasRole = (pictogram: Pictogram, role: 'subject' | 'action' | 'complement') =>
  pictogram.grammatical?.role?.includes(role) || pictogram.categories.includes(role)

const signature = (sentence: SentenceDefinition) =>
  sentence.clauses ? `scene:${sentence.id}` : [sentence.subjectId, sentence.actionId, ...sentence.complementIds].join('|')

export const generateCompatibleSentences = (
  explicitSentences: SentenceDefinition[],
  compatibility: ActionCompatibility[],
  pictograms: Pictogram[],
) => {
  const byId = new Map(pictograms.map((pictogram) => [pictogram.id, pictogram]))
  const subjects = [...byId.values()].filter((pictogram) => hasRole(pictogram, 'subject'))
  const result = [...explicitSentences]
  const known = new Set(explicitSentences.map(signature))

  const add = (subject: Pictogram, action: Pictogram, complements: Pictogram[] = []) => {
    const sentence: SentenceDefinition = {
      id: `generated-${subject.id}-${action.id}${complements.map(({ id }) => `-${id}`).join('')}`,
      subjectId: subject.id,
      actionId: action.id,
      complementIds: complements.map(({ id }) => id),
      availableFromUnit: Math.max(
        subject.availableFromUnit,
        action.availableFromUnit,
        ...complements.map(({ availableFromUnit }) => availableFromUnit),
      ),
    }
    const sentenceSignature = signature(sentence)
    if (!known.has(sentenceSignature)) {
      known.add(sentenceSignature)
      result.push(sentence)
    }
  }

  compatibility.forEach((rule) => {
    const action = byId.get(rule.actionId)
    if (!action || !hasRole(action, 'action')) return
    const compatibleSubjects = rule.allowedSubjectIds
      ? subjects.filter(({ id }) => rule.allowedSubjectIds?.includes(id))
      : subjects

    compatibleSubjects.forEach((subject) => {
      if (rule.allowWithoutComplement) add(subject, action)
      const complements = rule.allowedComplementIds
        .map((complementId) => byId.get(complementId))
        .filter((complement): complement is Pictogram => Boolean(complement && hasRole(complement, 'complement')))
      complements.forEach((complement) => add(subject, action, [complement]))
      complements.forEach((first, firstIndex) => {
        complements.slice(firstIndex + 1).forEach((second) => add(subject, action, [first, second]))
      })
    })
  })

  return result
}
