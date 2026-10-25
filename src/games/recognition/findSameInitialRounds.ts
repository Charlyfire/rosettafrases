import type { VowelSound } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import { rotate, shuffle } from '../../utils/collections'

export interface FindSameInitialRound {
  id: string
  model: Pictogram
  options: Pictogram[]
  correctId: string
  targetSound: VowelSound
}

export const buildFindSameInitialRounds = (
  words: Pictogram[],
  targetSound: VowelSound,
  optionCount: number,
  roundCount: number,
  order: 'fixed' | 'random',
): FindSameInitialRound[] => {
  const matching = words.filter(({ initialSound }) => initialSound === targetSound)
  const distractors = words.filter(({ initialSound }) => initialSound !== targetSound)
  if (matching.length < 2 || distractors.length < optionCount - 1) return []
  const models = order === 'random' ? shuffle(matching) : matching

  return models.slice(0, Math.min(roundCount, matching.length)).map((model, index) => {
    const correctPool = matching.filter(({ id }) => id !== model.id)
    const correct = (order === 'random' ? shuffle(correctPool) : rotate(correctPool, index))[0]
    const otherOptions = (order === 'random' ? shuffle(distractors) : rotate(distractors, index))
      .slice(0, optionCount - 1)
    const options = order === 'random'
      ? shuffle([correct, ...otherOptions])
      : rotate([correct, ...otherOptions], index)
    return {
      id: `find-same-${targetSound}-${index}-${model.id}`,
      model,
      options,
      correctId: correct.id,
      targetSound,
    }
  })
}
