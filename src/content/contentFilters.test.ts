import { describe, expect, it } from 'vitest'
import type { ContentCategory, Pictogram } from '../domain/content'
import { selectContent, sharesCategory, sharesTag } from './contentFilters'

const item = (
  id: string,
  categories: ContentCategory[],
  availableFromUnit: number,
  initialSound?: string,
  tags: string[] = [],
): Pictogram => ({
  id,
  label: id,
  image: `images/${id}.png`,
  audioIds: [`word-${id}`],
  categories,
  tags,
  initialSound,
  availableFromUnit,
})

const bank = [
  item('abeja', ['global-word', 'noun'], 6, 'a'),
  item('agua', ['global-word', 'noun', 'food', 'drink', 'complement'], 6, 'a', ['bebida']),
  item('elefante', ['global-word', 'noun'], 9, 'e'),
  item('mama', ['subject', 'character'], 1),
  item('come', ['action'], 1),
  item('juguetes', ['noun', 'toy', 'complement'], 1),
  item('vowel-a', ['vowel'], 5),
]

describe('filtros del banco central', () => {
  it('filtra por tipo, unidad y sonido sin duplicar contenidos', () => {
    expect(selectContent(bank, 'initial-sound-words', 6, 'a').map(({ id }) => id))
      .toEqual(['abeja', 'agua'])
    expect(selectContent(bank, 'initial-sound-words', 6, 'e')).toEqual([])
    expect(selectContent(bank, 'foods', 10).map(({ id }) => id)).toEqual(['agua'])
    expect(selectContent(bank, 'characters', 1).map(({ id }) => id)).toEqual(['mama'])
    expect(selectContent(bank, 'actions', 1).map(({ id }) => id)).toEqual(['come'])
    expect(selectContent(bank, 'toys', 1).map(({ id }) => id)).toEqual(['juguetes'])
    expect(selectContent(bank, 'vowels', 5).map(({ id }) => id)).toEqual(['vowel-a'])
  })

  it('distingue categorías compartidas y etiquetas de semejanza', () => {
    expect(sharesCategory(bank[0], bank[1])).toBe(true)
    expect(sharesTag(bank[0], bank[1])).toBe(false)
    expect(sharesTag(bank[1], item('leche', ['drink'], 1, undefined, ['bebida']))).toBe(true)
  })
})
