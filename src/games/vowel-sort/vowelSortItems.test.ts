import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../../domain/content'
import { buildVowelSortItems } from './vowelSortItems'

const word = (id: string, initialSound: 'a' | 'u' | 'i'): Pictogram => ({
  id, label: id, initialSound, image: `images/${id}.png`, audioIds: [`word-${id}`],
  categories: ['global-word'], tags: [], availableFromUnit: 6,
})
const words = [word('abeja', 'a'), word('agua', 'a'), word('uno', 'u'), word('uvas', 'u'), word('isla', 'i')]

describe('clasificar por vocal', () => {
  it('incluye contenido de todas las vocales seleccionadas sin duplicados', () => {
    const items = buildVowelSortItems(words, ['u', 'a'], 4, 'fixed')
    expect(items).toHaveLength(4)
    expect(new Set(items.map(({ id }) => id)).size).toBe(4)
    expect(new Set(items.map(({ initialSound }) => initialSound))).toEqual(new Set(['u', 'a']))
  })

  it('rechaza una configuración sin palabras para cada zona', () => {
    expect(buildVowelSortItems(words, ['u', 'a', 'i'], 2, 'fixed')).toEqual([])
  })
})
