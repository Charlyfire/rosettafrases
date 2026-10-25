import type { VowelSound } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import { rotate, shuffle } from '../../utils/collections'

export interface IntruderRound {
  id: string
  targetSound: VowelSound
  correctId: string
  options: Pictogram[]
}

export const buildIntruderRounds = (
  words: Pictogram[],
  selectedSounds: VowelSound[],
  optionCount: number,
  roundCount: number,
  order: 'fixed' | 'random',
): IntruderRound[] => {
  const candidates = selectedSounds.flatMap((targetSound) => {
    const matching = words.filter(({ initialSound }) => initialSound === targetSound)
    const intruders = words.filter(({ initialSound }) => initialSound !== targetSound)
    if (matching.length < optionCount - 1 || intruders.length === 0) return []
    const bases = order === 'random' ? shuffle(matching) : matching
    return bases.map((_, index) => {
      const common = (order === 'random' ? shuffle(matching) : rotate(matching, index)).slice(0, optionCount - 1)
      const intruder = (order === 'random' ? shuffle(intruders) : rotate(intruders, index))[0]
      const options = order === 'random' ? shuffle([...common, intruder]) : rotate([...common, intruder], index)
      return { id: `intruder-${targetSound}-${index}`, targetSound, correctId: intruder.id, options }
    })
  })
  return (order === 'random' ? shuffle(candidates) : candidates).slice(0, roundCount)
}
