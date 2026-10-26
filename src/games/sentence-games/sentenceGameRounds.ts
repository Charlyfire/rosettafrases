import type { SentenceGameSettings } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility, SentenceDefinition } from '../../domain/sentence'
import { rotate, shuffle, uniqueById } from '../../utils/collections'
import { buildSentencePlans, type SentencePlan } from '../sentences/sentencePlans'
import { actionForSubjects } from '../sentences/sentenceStructure'

export type SentenceGameMode = 'complete-dictation' | 'sentence-order' | 'scene-sentence'
export interface SentenceGameRound extends SentencePlan { options: Pictogram[] }

export function buildSentenceGameRounds(sentences: SentenceDefinition[], pictograms: Pictogram[], settings: SentenceGameSettings, mode: SentenceGameMode, compatibility: ActionCompatibility[]): SentenceGameRound[] {
  return buildSentencePlans(sentences, pictograms, compatibility, settings, mode === 'scene-sentence').map((plan) => {
    if (mode === 'sentence-order') {
      const random = shuffle(plan.parts)
      const options = random.some((part, index) => part.id !== plan.parts[index].id) ? random : rotate(plan.parts, 1)
      return { ...plan, options }
    }
    const distractors = plan.parts.flatMap((part, index) => {
      const role = plan.roles[index]
      if (role === 'conjunction' || role === 'comma' || role === 'punctuation') return []
      return pictograms.filter((item) => item.id !== part.id && (item.categories.includes(role) || item.grammatical?.role?.includes(role)))
        .slice(0, 1).map((item) => role === 'action' ? actionForSubjects(item, settings.subjectCount) : item)
    })
    return { ...plan, options: shuffle(uniqueById([...plan.parts, ...distractors])) }
  })
}
