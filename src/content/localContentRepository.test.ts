import { describe, expect, it } from 'vitest'
import { createLocalContentId, slugifyContentLabel } from './localContentRepository'

describe('identificadores del banco local', () => {
  it('normaliza tildes, espacios y mayúsculas', () => {
    expect(slugifyContentLabel('  Árbol Azul  ')).toBe('arbol-azul')
  })

  it('separa los identificadores locales de los incluidos', () => {
    expect(createLocalContentId('Árbol')).toBe('local-arbol')
  })

  it('rechaza nombres sin letras ni números', () => {
    expect(() => createLocalContentId('---')).toThrow()
  })
})
