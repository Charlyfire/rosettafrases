import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../../domain/content'
import { buildIntruderRounds } from './intruderRounds'

const word = (id: string, initialSound: 'a' | 'u') => ({ id, label: id, initialSound, image: `images/${id}.png`, audioIds: [], categories: ['global-word'], tags: [], availableFromUnit: 6 }) as Pictogram
const words = [word('abeja', 'a'), word('agua', 'a'), word('aguja', 'a'), word('avion', 'a'), word('uno', 'u'), word('uvas', 'u')]

describe('intruso', () => {
  it('crea rondas con un único sonido diferente', () => {
    const rounds = buildIntruderRounds(words, ['a'], 4, 5, 'fixed')
    expect(rounds.length).toBeGreaterThan(0)
    rounds.forEach((round) => expect(round.options.filter((item) => item.initialSound !== 'a')).toHaveLength(1))
  })
})
