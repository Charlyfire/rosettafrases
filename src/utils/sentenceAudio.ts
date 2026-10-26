import type { Pictogram } from '../domain/content'

// Punctuation is required on the board, but is silent when reading a sentence.
export const sentenceWords = (parts: Pictogram[]) => parts.filter((part) =>
  part.id !== 'punto' && !part.categories.includes('punctuation') &&
  !part.grammatical?.role?.includes('punctuation'),
)

export const formatSentence = (parts: Pictogram[]) => parts
  .map((part) => part.id === 'punto' ? '.' : part.id === 'coma' ? ',' : part.label)
  .join(' ').replace(/\s+([,.])/g, '$1')

export function sentencePauses(parts: Pictogram[]): Record<number, number> {
  const pauses: Record<number, number> = {}
  let words = 0
  parts.forEach((part) => {
    if (part.id === 'coma' && words > 0) pauses[words - 1] = 240
    else if (sentenceWords([part]).length) words += 1
  })
  return pauses
}
