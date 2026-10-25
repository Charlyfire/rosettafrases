import type { Pictogram } from '../../domain/content'
import { shuffle } from '../../utils/collections'

export const prepareBits = (
  pictograms: Pictogram[],
  order: 'fixed' | 'random',
  quantity: 5 | 6 | 'all',
) => {
  const ordered = order === 'random' ? shuffle(pictograms) : [...pictograms]
  return quantity === 'all' ? ordered : ordered.slice(0, quantity)
}
