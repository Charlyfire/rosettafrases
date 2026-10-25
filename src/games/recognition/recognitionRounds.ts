import type { Pictogram } from '../../domain/content'
import type { DistractorType } from '../../domain/activity'
import { sharesCategory, sharesTag } from '../../content/contentFilters'
import { rotate, shuffle } from '../../utils/collections'

export interface RecognitionRound {
  id: string
  correctId: string
  options: Pictogram[]
}

const takeFixedDistractors = (
  pool: Pictogram[],
  correctId: string,
  count: number,
  startIndex: number,
) => {
  const available = pool.filter(({ id }) => id !== correctId)
  if (available.length < count) return []
  return Array.from({ length: count }, (_, offset) =>
    available[(startIndex + offset) % available.length],
  )
}

export const buildListenAndFindRounds = (
  candidates: Pictogram[],
  optionCount: number,
  roundCount: number,
  order: 'fixed' | 'random',
  distractorPool: Pictogram[] = candidates,
  distractorType: DistractorType = 'any',
): RecognitionRound[] => {
  const getPool = (correct: Pictogram) => distractorPool.filter((candidate) => {
    if (candidate.id === correct.id) return false
    if (distractorType === 'same-category') return sharesCategory(correct, candidate)
    if (distractorType === 'similar') return sharesTag(correct, candidate)
    return true
  })
  const eligible = candidates.filter((candidate) => getPool(candidate).length >= optionCount - 1)
  if (eligible.length === 0) return []
  const targets = (order === 'random' ? shuffle(eligible) : [...eligible])
    .slice(0, Math.min(roundCount, eligible.length))

  return targets.map((correct, roundIndex) => {
    const pool = getPool(correct)
    const distractors = order === 'random'
      ? shuffle(pool).slice(0, optionCount - 1)
      : takeFixedDistractors(pool, correct.id, optionCount - 1, roundIndex)
    const unplaced = [correct, ...distractors]
    return {
      id: `listen-${roundIndex}-${correct.id}`,
      correctId: correct.id,
      options: order === 'random' ? shuffle(unplaced) : rotate(unplaced, roundIndex),
    }
  })
}

export const buildInitialSoundRounds = (
  correctCandidates: Pictogram[],
  distractorCandidates: Pictogram[],
  optionCount: number,
  roundCount: number,
  order: 'fixed' | 'random',
): RecognitionRound[] => {
  if (correctCandidates.length === 0 || distractorCandidates.length < optionCount - 1) return []
  const targets = (order === 'random' ? shuffle(correctCandidates) : [...correctCandidates])
    .slice(0, Math.min(roundCount, correctCandidates.length))

  return targets.map((correct, roundIndex) => {
    const distractors = order === 'random'
      ? shuffle(distractorCandidates).slice(0, optionCount - 1)
      : Array.from({ length: optionCount - 1 }, (_, offset) =>
          distractorCandidates[(roundIndex + offset) % distractorCandidates.length],
        )
    const unplaced = [correct, ...distractors]
    return {
      id: `sound-${roundIndex}-${correct.id}`,
      correctId: correct.id,
      options: order === 'random' ? shuffle(unplaced) : rotate(unplaced, roundIndex),
    }
  })
}
