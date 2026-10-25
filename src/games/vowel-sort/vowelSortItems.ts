import type { VowelSound } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import { rotate, shuffle } from '../../utils/collections'

export const buildVowelSortItems = (
  words: Pictogram[],
  sounds: VowelSound[],
  count: number,
  order: 'fixed' | 'random',
) => {
  if (sounds.length < 2 || count < sounds.length) return []
  const pools = sounds.map((sound) => words.filter(({ initialSound }) => initialSound === sound))
  if (pools.some((pool) => pool.length === 0)) return []
  const selected: Pictogram[] = []
  for (let index = 0; index < count; index += 1) {
    const poolIndex = index % sounds.length
    const pool = order === 'random' ? shuffle(pools[poolIndex]) : rotate(pools[poolIndex], Math.floor(index / sounds.length))
    const item = pool.find(({ id }) => !selected.some((selectedItem) => selectedItem.id === id))
    if (item) selected.push(item)
  }
  return order === 'random' ? shuffle(selected) : selected
}
