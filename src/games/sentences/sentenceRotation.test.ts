import { describe, expect, it } from 'vitest'
import { selectSessionSentences } from './sentencePlans'

const makePool = (scope: string) => Array.from({ length: 9 }, (_, n) => ({ id: scope + '-' + n }))

describe('rotación de frases entre actividades', () => {
  it('recorre todas las frases antes de repetirlas', () => {
    const pool = makePool('exhaust')
    const a = selectSessionSentences(pool, 3, 'dictado')
    const b = selectSessionSentences(pool, 3, 'dictado')
    const c = selectSessionSentences(pool, 3, 'dictado')
    expect(new Set([...a, ...b, ...c].map(({ id }) => id)).size).toBe(9)
  })

  it('no repite una frase dentro de una actividad aunque cruce el final de un ciclo', () => {
    const pool = makePool('boundary')
    for (let i = 0; i < 3; i++) {
      const batch = selectSessionSentences(pool, 4, 'sentence-order')
      expect(new Set(batch.map(({ id }) => id)).size).toBe(4)
    }
  })

  it('respeta el repertorio filtrado y no repite elementos en una sesión', () => {
    const pool = makePool('filtered')
    const subset = [pool[0], pool[3], pool[6]]
    expect(selectSessionSentences(subset, 2, 'dictado').every(({ id }) => subset.some((item) => item.id === id))).toBe(true)
    expect(selectSessionSentences(subset, 8, 'dictado')).toEqual(subset)
  })
})
