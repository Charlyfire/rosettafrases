import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility, SentenceDefinition } from '../../domain/sentence'
import {
  findBuiltSentence,
  getAllBuilderComplements,
  getBuilderActions,
  getBuilderComplements,
  getBuilderSubjects,
} from './sentenceBuilderOptions'

const item = (id: string, role: 'subject' | 'action' | 'complement'): Pictogram => ({
  id,
  label: id,
  image: `images/${id}.png`,
  audioIds: [`word-${id}`],
  categories: [role],
  tags: [],
  availableFromUnit: 1,
  grammatical: { role: [role] },
})

const pictograms = [
  item('papa', 'subject'), item('mama', 'subject'),
  item('canta', 'action'), item('come', 'action'),
  item('arroz', 'complement'), item('leche', 'complement'),
]
const compatibility: ActionCompatibility[] = [
  { actionId: 'canta', allowWithoutComplement: true, allowedComplementIds: [] },
  { actionId: 'come', allowWithoutComplement: false, allowedComplementIds: ['arroz'] },
]
const sentences: SentenceDefinition[] = [
  { id: 'papa-canta', subjectId: 'papa', actionId: 'canta', complementIds: [], availableFromUnit: 1 },
  { id: 'papa-come-arroz', subjectId: 'papa', actionId: 'come', complementIds: ['arroz'], availableFromUnit: 1 },
]

describe('opciones de Construye tu oración', () => {
  it('presenta los tipos en orden y solo muestra combinaciones compatibles', () => {
    expect(getBuilderSubjects(pictograms).map(({ id }) => id)).toEqual(['papa', 'mama'])
    expect(getBuilderActions(pictograms, compatibility, 'papa', 'subject-action').map(({ id }) => id)).toEqual(['canta'])
    expect(getBuilderActions(pictograms, compatibility, 'papa', 'subject-action-complement').map(({ id }) => id)).toEqual(['come'])
    expect(getBuilderComplements(pictograms, compatibility, 'come').map(({ id }) => id)).toEqual(['arroz'])
    expect(getAllBuilderComplements(pictograms).map(({ id }) => id)).toEqual(['arroz', 'leche'])
  })

  it('localiza la frase exacta construida', () => {
    expect(findBuiltSentence(sentences, 'papa', 'canta')?.id).toBe('papa-canta')
    expect(findBuiltSentence(sentences, 'papa', 'come', ['arroz'])?.id).toBe('papa-come-arroz')
    expect(findBuiltSentence(sentences, 'papa', 'come', ['leche'])).toBeUndefined()
  })
  it('no utiliza el audio de una escena compuesta para leer solo su primera frase', () => {
    const recorded:SentenceDefinition = { ...sentences[1],id:'scene-compound',audioId:'compound',clauses:[
      {subjectIds:['papa'],actionId:'come',complementIds:['arroz']},
      {subjectIds:['mama'],actionId:'come',complementIds:['arroz']},
    ] }
    expect(findBuiltSentence([recorded], 'papa','come',['arroz'])).toBeUndefined()
    expect(findBuiltSentence([{...recorded,clauses:[recorded.clauses![0]]}], 'papa','come',['arroz'])?.audioId).toBe('compound')
  })

})
