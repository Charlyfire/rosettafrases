import type { Pictogram } from '../domain/content'

// Punctuation is required on the board, but is silent when reading a sentence.
export const sentenceWords = (parts: Pictogram[]) => parts.filter((part) =>
  part.id !== 'punto' && !part.categories.includes('punctuation') &&
  !part.grammatical?.role?.includes('punctuation'),
)
