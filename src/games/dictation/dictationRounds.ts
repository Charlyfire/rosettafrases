import type { SequentialDictationSettings } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility, SentenceDefinition } from '../../domain/sentence'
import { rotate, uniqueById } from '../../utils/collections'
import { buildSentencePlans } from '../sentences/sentencePlans'
import { actionForSubjects } from '../sentences/sentenceStructure'

export type SentencePart = 'subject' | 'action' | 'complement' | 'conjunction' | 'comma' | 'punctuation'
export interface DictationStep { role: SentencePart; correctId: string; options: Pictogram[] }
export interface DictationRound { id: string; sentence: SentenceDefinition; parts: Pictogram[]; steps: DictationStep[] }

export function buildDictationRounds(sentences: SentenceDefinition[], pictograms: Pictogram[], compatibility: ActionCompatibility[], settings: SequentialDictationSettings): DictationRound[] {
  return buildSentencePlans(sentences, pictograms, compatibility, settings).map((plan, roundIndex) => ({
    ...plan,
    steps: plan.parts.map((correct, index) => {
      const role = plan.roles[index]
      const pool = uniqueById(pictograms.filter((item) => role === 'comma' ? item.id === 'coma' : item.categories.includes(role) || item.grammatical?.role?.includes(role)))
        .filter(({ id }) => id !== correct.id)
        .map((item) => role === 'action' ? actionForSubjects(item, settings.subjectCount) : item)
      const options = role === 'conjunction' || role === 'comma' || role === 'punctuation' ? [correct] : rotate([correct, ...rotate(pool, roundIndex + index).slice(0, 2)], index)
      return { role, correctId: correct.id, options }
    }),
  }))
}
