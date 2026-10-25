import { describe, expect, it } from 'vitest'
import { builderChoices, builderRoles } from './builderSession'
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
})
