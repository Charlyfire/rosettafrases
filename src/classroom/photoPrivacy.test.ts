import { describe, expect, it } from 'vitest'
import { classroomPhotoSize } from './photoPrivacy'

describe('preparación privada de fotografías', () => {
  it('reduce fotografías grandes manteniendo la proporción', () => {
    expect(classroomPhotoSize(4000, 2000)).toEqual({ width: 1200, height: 600 })
    expect(classroomPhotoSize(1600, 3200)).toEqual({ width: 600, height: 1200 })
  })
  it('no amplía fotografías pequeñas', () => {
    expect(classroomPhotoSize(300, 400)).toEqual({ width: 300, height: 400 })
  })
  it('rechaza imágenes sin dimensiones válidas', () => {
    expect(() => classroomPhotoSize(0, 800)).toThrow()
  })
})
