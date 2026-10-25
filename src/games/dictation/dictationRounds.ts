import type { DictationOptionCount, DictationRoundCount } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { SentenceDefinition } from '../../domain/sentence'
import { shuffle, uniqueById } from '../../utils/collections'

export type SentencePart = 'subject' | 'action' | 'complement' | 'conjunction' | 'punctuation'

export interface DictationStep {
  role: SentencePart
  correctId: string
  options: Pictogram[]
}

export interface DictationRound {
  id: string
  sentence: SentenceDefinition
  parts: Pictogram[]
  steps: DictationStep[]
}

const sequenceForSentence = (sentence: SentenceDefinition) => {
  const ids = sentence.complementIds.length === 2
    ? [sentence.subjectId, sentence.actionId, sentence.complementIds[0], 'y', sentence.complementIds[1], 'punto']
    : [sentence.subjectId, sentence.actionId, ...sentence.complementIds, 'punto']
  const roles: SentencePart[] = sentence.complementIds.length === 2
    ? ['subject', 'action', 'complement', 'conjunction', 'complement', 'punctuation']
    : ['subject', 'action', ...sentence.complementIds.map(() => 'complement' as const), 'punctuation']
  return { ids, roles }
}

const hasRole = (pictogram: Pictogram, role: SentencePart) =>
  pictogram.grammatical?.role?.includes(role) || pictogram.categories.includes(role)

export const getSentenceParts = (
  sentence: SentenceDefinition,
  pictograms: Pictogram[],
): Pictogram[] | undefined => {
  const byId = new Map(pictograms.map((item) => [item.id, item]))
  const { ids } = sequenceForSentence(sentence)
  const parts = ids.map((id) => byId.get(id))
  return parts.every(Boolean) ? parts as Pictogram[] : undefined
}

export const getPlayableSentences = (
  sentences: SentenceDefinition[],
  pictograms: Pictogram[],
  optionCount: number,
) => sentences.filter((sentence) => {
  const parts = getSentenceParts(sentence, pictograms)
  if (!parts) return false
  const { roles } = sequenceForSentence(sentence)
  return roles.every((role) =>
    uniqueById(pictograms.filter((item) => hasRole(item, role))).length >=
      (role === 'conjunction' || role === 'punctuation' ? 1 : optionCount),
  )
})

const buildOptions = (
  correct: Pictogram,
  pool: Pictogram[],
  optionCount: number,
  fixedPosition: number,
  random: boolean,
) => {
  const distractors = pool.filter(({ id }) => id !== correct.id)
  const selected = (random ? shuffle(distractors) : distractors).slice(0, optionCount - 1)
  const options = [correct, ...selected]
  if (random) return shuffle(options)
  options.splice(0, 1)
  options.splice(fixedPosition % optionCount, 0, correct)
  return options
}

export const buildDictationRounds = (
  sentences: SentenceDefinition[],
  pictograms: Pictogram[],
  optionCount: DictationOptionCount,
  roundCount: DictationRoundCount,
  order: 'fixed' | 'random',
): DictationRound[] => {
  const playable = getPlayableSentences(sentences, pictograms, optionCount)
  const selected = (order === 'random' ? shuffle(playable) : playable).slice(0, roundCount)

  return selected.flatMap((sentence, roundIndex) => {
    const parts = getSentenceParts(sentence, pictograms)
    if (!parts) return []
    const { roles } = sequenceForSentence(sentence)
    const steps = parts.map((correct, stepIndex) => ({
      role: roles[stepIndex],
      correctId: correct.id,
      options: buildOptions(
        correct,
        uniqueById(pictograms.filter((item) => hasRole(item, roles[stepIndex]))),
        roles[stepIndex] === 'conjunction' || roles[stepIndex] === 'punctuation' ? 1 : optionCount,
        roundIndex + stepIndex,
        order === 'random',
      ),
    }))
    return [{ id: `dictation-${sentence.id}`, sentence, parts, steps }]
  })
}
