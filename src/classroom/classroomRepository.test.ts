import { describe, expect, it } from 'vitest'
import { normalizeInitial, normalizeName, pupilDisplayName } from './classroomRepository'

describe('etiquetas de Mi clase', () => {
  it('escribe la primera letra con mayúscula y las demás con minúsculas', () => {
    expect(normalizeName('  mARÍA  ')).toBe('María')
    expect(normalizeName('ANA  MARÍA')).toBe('Ana María')
  })
  it('limita el apellido a una inicial fuera del marco visual', () => {
    expect(normalizeInitial('garcía')).toBe('G.')
    expect(normalizeInitial('S.')).toBe('S.')
    expect(normalizeInitial('s. l.')).toBe('S. L.')
    expect(pupilDisplayName({ id: '1', name: 'Sara', surnameInitial: 'F' })).toBe('Sara F.')
    expect(pupilDisplayName({ id: '3', name: 'Emma', surnameInitial: 'S. L.' })).toBe('Emma S. L.')
  })
  it('no añade apellido cuando no es necesario', () => {
    expect(pupilDisplayName({ id: '2', name: 'Lucas' })).toBe('Lucas')
  })
})
