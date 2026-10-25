import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../domain/content'
import { selectInitialSoundPictograms } from './selectors'

const item = (id: string, initialSound: string, availableFromUnit: number): Pictogram => ({
  id,
  label: id,
  image: `images/${id}.png`,
  audioIds: [],
  categories: ['global-word'],
  tags: [],
  initialSound,
  availableFromUnit,
})

describe('selectInitialSoundPictograms', () => {
  it('respeta el sonido y la disponibilidad acumulativa por unidad', () => {
    const bank = [item('a-u6', 'a', 6), item('a-u9', 'a', 9), item('u-u6', 'u', 6)]
    expect(selectInitialSoundPictograms(bank, 'a', 7).map(({ id }) => id)).toEqual(['a-u6'])
  })
})
