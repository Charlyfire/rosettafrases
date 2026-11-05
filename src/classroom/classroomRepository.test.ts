import { describe, expect, it } from 'vitest'
import { normalizeInitial, normalizeName, pupilDisplayName } from './classroomRepository'

describe('etiquetas de Mi clase', () => {
  it('escribe la primera letra con mayúscula y las demás con minúsculas', () => {
    expect(normalizeName('  mARÍA  ')).toBe('María')
    expect(normalizeName('ANA  MARÍA')).toBe('Ana María')
  })
  it('limita el apellido a una inicial fuera del marco visual', () => {
    expect(normalizeInitial('garcía')).toBe('G')
    expect(normalizeInitial('S.')).toBe('S')
    expect(pupilDisplayName({ id: '1', name: 'Sara', surnameInitial: 'F' })).toBe('Sara F.')
  })
  it('no añade apellido cuando no es necesario', () => {
    expect(pupilDisplayName({ id: '2', name: 'Lucas' })).toBe('Lucas')
  })
})
