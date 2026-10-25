import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../../domain/content'
import { buildFindSameInitialRounds } from './findSameInitialRounds'

const word = (id: string, initialSound: 'a' | 'u'): Pictogram => ({
  id, label: id, initialSound, image: `images/${id}.png`, audioIds: [`word-${id}`],
  categories: ['global-word'], tags: [], availableFromUnit: 6,
})

const words = [word('abeja', 'a'), word('agua', 'a'), word('avion', 'a'), word('uno', 'u'), word('uvas', 'u')]

describe('busca otra que empiece igual', () => {
  it('separa el modelo y ofrece una única respuesta con el mismo sonido', () => {
    const rounds = buildFindSameInitialRounds(words, 'a', 3, 5, 'fixed')
    expect(rounds).toHaveLength(3)
    rounds.forEach((round) => {
      expect(round.options).toHaveLength(3)
      expect(round.options.some(({ id }) => id === round.model.id)).toBe(false)
      expect(round.options.filter(({ initialSound }) => initialSound === 'a')).toHaveLength(1)
    })
  })

  it('no crea rondas sin dos palabras modelo o distractores suficientes', () => {
    expect(buildFindSameInitialRounds(words.slice(0, 2), 'u', 2, 5, 'fixed')).toEqual([])
  })
})
