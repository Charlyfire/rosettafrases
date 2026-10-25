import type { SentenceGameSettings } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { SentenceDefinition } from '../../domain/sentence'
import { getSentenceParts, type SentencePart } from '../dictation/dictationRounds'
import { rotate, shuffle, uniqueById } from '../../utils/collections'

export type SentenceGameMode = 'complete-dictation' | 'sentence-order' | 'scene-sentence'

export interface SentenceGameRound {
  id: string
  sentence: SentenceDefinition
  parts: Pictogram[]
  options: Pictogram[]
  roles: SentencePart[]
  audioId?: string
  sceneImage?: string
}

const rolesFor = (sentence: SentenceDefinition): SentencePart[] => [
  'subject', 'action', ...sentence.complementIds.map(() => 'complement' as const), 'punctuation',
]

const hasRole = (item: Pictogram, role: SentencePart) =>
  item.grammatical?.role?.includes(role) || item.categories.includes(role)

const optionsForParts = (
  parts: Pictogram[],
  roles: SentencePart[],
  pictograms: Pictogram[],
  optionCount: number,
  roundIndex: number,
  order: 'fixed' | 'random',
) => {
  const distractors = parts.flatMap((correct, index) => {
    const role = roles[index]
    if (role === 'conjunction' || role === 'punctuation') return []
    const pool = uniqueById(pictograms.filter((item) => hasRole(item, role) && item.id !== correct.id))
    return (order === 'random' ? shuffle(pool) : rotate(pool, roundIndex + index)).slice(0, optionCount - 1)
  })
  const options = uniqueById([...parts, ...distractors])
  return order === 'random' ? shuffle(options) : rotate(options, roundIndex)
}

export const buildSentenceGameRounds = (
  sentences: SentenceDefinition[],
  pictograms: Pictogram[],
  settings: SentenceGameSettings,
  mode: SentenceGameMode,
): SentenceGameRound[] => {
  const compound = settings.structure === 'subject-action-complement-y-action-complement' ||
    settings.structure === 'subject-action-complement-y-subject-action-complement'
  if (compound && mode === 'complete-dictation') {
    const byId = new Map(pictograms.map((item) => [item.id, item]))
    const clauses = sentences.filter((sentence) => sentence.complementIds.length === 1 && Boolean(getSentenceParts(sentence, pictograms)))
    const firstClauses = settings.order === 'random' ? shuffle(clauses) : clauses
    return firstClauses.slice(0, settings.roundCount).flatMap((first, index) => {
      const requireSecondSubject = settings.structure === 'subject-action-complement-y-subject-action-complement'
      const candidates = clauses.filter((second) => second.id !== first.id &&
        second.actionId !== first.actionId && second.complementIds[0] !== first.complementIds[0] &&
        (requireSecondSubject ? second.subjectId !== first.subjectId : second.subjectId === first.subjectId))
      const second = (settings.order === 'random' ? shuffle(candidates) : rotate(candidates, index))[0]
      if (!second) return []
      const ids = requireSecondSubject
        ? [first.subjectId, first.actionId, first.complementIds[0], 'y', second.subjectId, second.actionId, second.complementIds[0], 'punto']
        : [first.subjectId, first.actionId, first.complementIds[0], 'y', second.actionId, second.complementIds[0], 'punto']
      const parts = ids.map((id) => byId.get(id))
      if (!parts.every(Boolean)) return []
      const roles: SentencePart[] = requireSecondSubject
        ? ['subject', 'action', 'complement', 'conjunction', 'subject', 'action', 'complement', 'punctuation']
        : ['subject', 'action', 'complement', 'conjunction', 'action', 'complement', 'punctuation']
      const resolved = parts as Pictogram[]
      return [{
        id: `complete-compound-${first.id}-${second.id}`,
        sentence: first,
        parts: resolved,
        roles,
        options: optionsForParts(resolved, roles, pictograms, settings.optionCount, index, settings.order),
      }]
    })
  }
  const complementCount = settings.structure === 'subject-action' ? 0 : 1
  const eligible = sentences.filter((sentence) =>
    sentence.complementIds.length === complementCount &&
    (mode !== 'scene-sentence' || Boolean(sentence.sceneImage)) &&
    Boolean(getSentenceParts(sentence, pictograms)),
  )
  const ordered = mode === 'complete-dictation'
    ? [
        ...(settings.order === 'random' ? shuffle(eligible.filter(({ audioId }) => audioId)) : eligible.filter(({ audioId }) => audioId)),
        ...(settings.order === 'random' ? shuffle(eligible.filter(({ audioId }) => !audioId)) : eligible.filter(({ audioId }) => !audioId)),
      ]
    : settings.order === 'random' ? shuffle(eligible) : eligible
  const chosen = ordered.slice(0, settings.roundCount)

  return chosen.flatMap((sentence, roundIndex) => {
    const parts = getSentenceParts(sentence, pictograms)
    if (!parts) return []
    if (mode === 'sentence-order') {
      const randomOrder = shuffle(parts)
      const shuffled = settings.order === 'random' && randomOrder.some((item, index) => item.id !== parts[index].id)
        ? randomOrder
        : rotate(parts, 1)
      return [{ id: `${mode}-${sentence.id}`, sentence, parts, roles: rolesFor(sentence), options: shuffled, audioId: sentence.audioId, sceneImage: sentence.sceneImage }]
    }
    const roles = rolesFor(sentence)
    return [{
      id: `${mode}-${sentence.id}`,
      sentence,
      parts,
      roles,
      options: optionsForParts(parts, roles, pictograms, settings.optionCount, roundIndex, settings.order),
      audioId: sentence.audioId,
      sceneImage: sentence.sceneImage,
    }]
  })
}
