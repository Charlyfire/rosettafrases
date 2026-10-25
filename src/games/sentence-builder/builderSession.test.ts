import { describe, expect, it } from 'vitest'
import { builderChoices, builderRoles, complementCategory, reconcileBuilderSelection } from './builderSession'
import type { Pictogram } from '../../domain/content'

const item = (id: string, role: 'subject' | 'action' | 'complement'): Pictogram => ({
  id, label: id, image: `${id}.png`, audioIds: [], categories: [role], tags: [], availableFromUnit: 1,
})

describe('sesiones de construcción', () => {
  it('mantiene dos sujetos y sus complementos en cláusulas coordinadas, con un solo punto final', () => {
    expect(builderRoles(2, 2)).toEqual([
      'subject', 'action', 'complement', 'conjunction', 'complement', 'conjunction',
      'subject', 'action', 'complement', 'conjunction', 'complement', 'punctuation',
    ])
    expect(builderRoles(1, 0)).toEqual(['subject', 'action', 'punctuation'])
  })

  it('no ofrece acciones que dejarían una oración incompleta ni cuenta recursos inexistentes', () => {
    const pictograms = [item('papa', 'subject'), item('mama', 'subject'), item('come', 'action'), item('bebe', 'action'), item('pan', 'complement'), item('arroz', 'complement')]
    const bank = builderChoices(pictograms, [
      { actionId: 'come', allowedSubjectIds: ['papa'], allowedComplementIds: ['pan', 'arroz'] },
      { actionId: 'bebe', allowedComplementIds: ['pan', 'pan', 'missing'] },
    ], { subjectCount: 1, complementCount: 2, roundCount: 3 })
    expect(bank.actions.map(({ id }) => id)).toEqual(['come'])
    expect(bank.subjects.map(({ id }) => id)).toEqual(['papa'])
    expect(bank.complements.map(({ id }) => id)).toEqual(['pan', 'arroz'])
  })
  it('prioriza bebidas sobre alimentos y agrupa los objetos del banco', () => {
    expect(complementCategory({ ...item('agua', 'complement'), categories: ['food', 'drink', 'noun'] })).toBe('drink')
    expect(complementCategory({ ...item('arroz', 'complement'), categories: ['food', 'noun'] })).toBe('food')
    expect(complementCategory({ ...item('juguete', 'complement'), categories: ['toy', 'noun'] })).toBe('objects')
    expect(complementCategory(item('local', 'complement'))).toBe('other')
  })

  it('al sustituir un verbo preserva la otra cláusula, los signos y los complementos compatibles', () => {
    const selected = [item('papa', 'subject'), item('come', 'action'), item('arroz', 'complement'), item('y', 'complement'), item('pan', 'complement'), item('y', 'complement'), item('mama', 'subject'), item('come', 'action'), item('arroz', 'complement'), item('y', 'complement'), item('pan', 'complement'), item('punto', 'complement')]
    selected[1] = item('corta', 'action')
    const result = reconcileBuilderSelection(selected, builderRoles(2, 2), [
      { actionId: 'come', allowedComplementIds: ['arroz', 'pan'] },
      { actionId: 'corta', allowedComplementIds: ['pan', 'fruta'] },
    ])
    expect(result[2]).toBeUndefined()
    expect(result[4]?.id).toBe('pan')
    expect(result.slice(5)).toEqual(selected.slice(5))
  })

})
