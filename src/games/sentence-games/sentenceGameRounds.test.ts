import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../../domain/content'
import type { SentenceDefinition } from '../../domain/sentence'
import { buildSentenceGameRounds } from './sentenceGameRounds'

const item = (id: string, role: 'subject' | 'action' | 'complement' | 'conjunction' | 'punctuation'): Pictogram => ({ id, label: id, image: `images/${id}.png`, audioIds: [], categories: [role], tags: [], availableFromUnit: 1, grammatical: { role: [role] } })
const pictograms = [item('papa', 'subject'), item('mama', 'subject'), item('come', 'action'), item('bebe', 'action'), item('arroz', 'complement'), item('agua', 'complement'), item('y', 'conjunction'), item('punto', 'punctuation')]
const sentence: SentenceDefinition = { id: 'papa-come-arroz', subjectId: 'papa', actionId: 'come', complementIds: ['arroz'], sceneImage: 'images/scene.png', audioId: 'sentence', availableFromUnit: 1 }
const secondClause: SentenceDefinition = { id: 'papa-bebe-agua', subjectId: 'papa', actionId: 'bebe', complementIds: ['agua'], availableFromUnit: 1 }
const otherSubjectClause: SentenceDefinition = { ...secondClause, id: 'mama-bebe-agua', subjectId: 'mama' }
const settings = { structure: 'subject-action-complement' as const, optionCount: 2 as const, roundCount: 3 as const, order: 'fixed' as const, showLabels: true }

describe('motor común de frases', () => {
  it('incluye el punto entre las piezas que debe colocar el niño', () => {
    const [round] = buildSentenceGameRounds([sentence], pictograms, settings, 'complete-dictation')
    expect(round.parts.map(({ id }) => id)).toEqual(['papa', 'come', 'arroz', 'punto'])
  })
  it('solo crea el juego de escena con frases que tienen PNG de escena', () => {
    expect(buildSentenceGameRounds([{ ...sentence, sceneImage: undefined }], pictograms, settings, 'scene-sentence')).toEqual([])
  })
  it('no presenta Ordenar frase ya resuelta', () => {
    const [round] = buildSentenceGameRounds([sentence], pictograms, settings, 'sentence-order')
    expect(round.options.map(({ id }) => id)).not.toEqual(round.parts.map(({ id }) => id))
  })
  it('construye las dos estructuras coordinadas con y y punto', () => {
    const sharedSubject = buildSentenceGameRounds([sentence, secondClause], pictograms, { ...settings, structure: 'subject-action-complement-y-action-complement' }, 'complete-dictation')[0]
    expect(sharedSubject.parts.map(({ id }) => id)).toEqual(['papa', 'come', 'arroz', 'y', 'bebe', 'agua', 'punto'])
    const twoSubjects = buildSentenceGameRounds([sentence, otherSubjectClause], pictograms, { ...settings, structure: 'subject-action-complement-y-subject-action-complement' }, 'complete-dictation')[0]
    expect(twoSubjects.parts.map(({ id }) => id)).toEqual(['papa', 'come', 'arroz', 'y', 'mama', 'bebe', 'agua', 'punto'])
  })
})
