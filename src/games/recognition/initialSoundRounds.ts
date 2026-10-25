import type { VowelSound } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import { rotate, shuffle } from '../../utils/collections'

export interface VowelChoiceRound {
  kind: 'vowel-choice'
  id: string
  model: Pictogram
  options: Pictogram[]
  correctId: string
}

export interface FindWordsRound {
  kind: 'find-words'
  id: string
  targetSound: VowelSound
  options: Pictogram[]
  correctIds: string[]
}

export interface SameSoundRound {
  kind: 'same-sound'
  id: string
  models: [Pictogram, Pictogram]
  correctAnswer: 'yes' | 'no'
}

export type InitialSoundRound = VowelChoiceRound | FindWordsRound | SameSoundRound

const soundFromModel = (model: Pictogram) =>
  (model.initialSound ?? model.id.replace('vowel-', '')) as VowelSound

export const buildVowelChoiceRounds = (
  models: Pictogram[],
  vowelOptions: Pictogram[],
  roundCount: number,
  order: 'fixed' | 'random',
): VowelChoiceRound[] => {
  const optionIds = new Set(vowelOptions.map(({ id }) => id))
  const eligible = models.filter((model) => optionIds.has(`vowel-${soundFromModel(model)}`))
  return (order === 'random' ? shuffle(eligible) : eligible)
    .slice(0, Math.min(roundCount, eligible.length))
    .map((model, index) => ({
      kind: 'vowel-choice',
      id: `vowel-choice-${index}-${model.id}`,
      model,
      options: order === 'random' ? shuffle(vowelOptions) : rotate(vowelOptions, index),
      correctId: `vowel-${soundFromModel(model)}`,
    }))
}

export const buildFindWordsRounds = (
  words: Pictogram[],
  targetSound: VowelSound,
  optionCount: number,
  roundCount: number,
  order: 'fixed' | 'random',
): FindWordsRound[] => {
  const correctPool = words.filter(({ initialSound }) => initialSound === targetSound)
  const distractorPool = words.filter(({ initialSound }) => initialSound !== targetSound)
  const correctCount = Math.min(2, correctPool.length, optionCount - 1)
  const distractorCount = optionCount - correctCount
  if (correctCount === 0 || distractorPool.length < distractorCount) return []

  return Array.from({ length: Math.min(roundCount, correctPool.length) }, (_, index) => {
    const correct = rotate(correctPool, index).slice(0, correctCount)
    const distractors = rotate(distractorPool, index).slice(0, distractorCount)
    const options = [...correct, ...distractors]
    return {
      kind: 'find-words' as const,
      id: `find-words-${targetSound}-${index}`,
      targetSound,
      options: order === 'random' ? shuffle(options) : rotate(options, index),
      correctIds: correct.map(({ id }) => id),
    }
  })
}

export const buildSameSoundRounds = (
  words: Pictogram[],
  roundCount: number,
  order: 'fixed' | 'random',
  targetSounds?: VowelSound[],
): SameSoundRound[] => {
  const eligible = words.filter((word) =>
    (!targetSounds || targetSounds.includes(word.initialSound as VowelSound)) &&
    words.some((other) => other.id !== word.id && other.initialSound === word.initialSound))
  const different = (word: Pictogram) => words.filter((other) => other.initialSound !== word.initialSound)
  const targets = order === 'random' ? shuffle(eligible) : eligible

  return targets.slice(0, Math.min(roundCount, targets.length)).flatMap((first, index) => {
    const shouldMatch = index % 2 === 0
    const pool = shouldMatch
      ? words.filter((item) => item.id !== first.id && item.initialSound === first.initialSound)
      : different(first)
    const second = (order === 'random' ? shuffle(pool) : pool)[index % Math.max(1, pool.length)]
    if (!second) return []
    return [{
      kind: 'same-sound' as const,
      id: `same-sound-${index}-${first.id}-${second.id}`,
      models: [first, second] as [Pictogram, Pictogram],
      correctAnswer: shouldMatch ? 'yes' as const : 'no' as const,
    }]
  })
}
