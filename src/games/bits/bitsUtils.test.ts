import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../../domain/content'
import { prepareBits } from './bitsUtils'

const bank = Array.from({ length: 8 }, (_, index): Pictogram => ({
  id: String(index),
  label: String(index),
  image: `images/${index}.png`,
  audioIds: [],
  categories: ['global-word'],
  tags: [],
  availableFromUnit: 6,
}))

describe('prepareBits', () => {
  it('limita la cantidad sin alterar el banco original', () => {
    expect(prepareBits(bank, 'fixed', 5)).toHaveLength(5)
    expect(bank).toHaveLength(8)
  })

  it('mantiene todo el contenido cuando se elige todas', () => {
    expect(prepareBits(bank, 'fixed', 'all')).toEqual(bank)
  })
})
