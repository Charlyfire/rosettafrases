import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../../domain/content'
import { buildInitialSoundRounds, buildListenAndFindRounds } from './recognitionRounds'

const item = (id: string, initialSound: string): Pictogram => ({
  id,
  label: id,
  image: `images/${id}.png`,
  audioIds: [`word-${id}`],
  categories: ['global-word'],
  tags: [],
  initialSound,
  availableFromUnit: 6,
})

const aItems = ['abeja', 'agua', 'arroz', 'avion'].map((id) => item(id, 'a'))
const otherItems = ['oso', 'uvas', 'isla', 'ojo', 'uno'].map((id) => item(id, id[0]))

describe('rondas de reconocimiento', () => {
  it('crea escucha y encuentra con una única respuesta y opciones sin duplicar', () => {
    const rounds = buildListenAndFindRounds(aItems, 3, 5, 'fixed')
    expect(rounds).toHaveLength(4)
    rounds.forEach((round) => {
      expect(round.options).toHaveLength(3)
      expect(new Set(round.options.map(({ id }) => id)).size).toBe(3)
      expect(round.options.filter(({ id }) => id === round.correctId)).toHaveLength(1)
    })
  })

  it('crea sonido inicial con un único pictograma del sonido objetivo', () => {
    const rounds = buildInitialSoundRounds(aItems, otherItems, 4, 5, 'fixed')
    expect(rounds).toHaveLength(4)
    rounds.forEach((round) => {
      expect(round.options.filter(({ initialSound }) => initialSound === 'a')).toHaveLength(1)
    })
  })

  it('no crea rondas si faltan opciones suficientes', () => {
    expect(buildListenAndFindRounds(aItems.slice(0, 2), 4, 5, 'fixed')).toEqual([])
    expect(buildInitialSoundRounds(aItems, otherItems.slice(0, 1), 4, 5, 'fixed')).toEqual([])
  })
})
