import { describe, expect, it } from 'vitest'
import { normalizeInitial, normalizeName, pupilDisplayName, inspectClassroomBackup } from './classroomRepository'

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
  it('inspecciona copias locales sin mostrar ni enviar datos privados', () => {
    const json = JSON.stringify({format:'rosetta-private-classroom',version:1,pupils:[
      {id:'one',name:'Sara',photo:'data:image/png;base64,AA=='},
      {id:'two',name:'Emma',nameAudio:'data:audio/wav;base64,AA=='},
    ]})
    expect(inspectClassroomBackup(json)).toEqual({pupils:2,photos:1,recordings:1})
  })
  it('rechaza duplicados y formatos de copia inválidos antes de importar', () => {
    const student = {id:'one',name:'Sara'}
    expect(() => inspectClassroomBackup(JSON.stringify({format:'rosetta-private-classroom',version:1,pupils:[student,student]}))).toThrow()
    expect(() => inspectClassroomBackup(JSON.stringify({format:'otro',version:1,pupils:[]}))).toThrow()
  })
  it('no añade apellido cuando no es necesario', () => {
    expect(pupilDisplayName({ id: '2', name: 'Lucas' })).toBe('Lucas')
  })
})
