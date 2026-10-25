import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../../domain/content'
import type { SentenceDefinition } from '../../domain/sentence'
import { buildDictationRounds, getPlayableSentences } from './dictationRounds'

const pictogram = (id: string, role: 'subject' | 'action' | 'complement' | 'conjunction' | 'punctuation'): Pictogram => ({
  id,
  label: id,
  image: `images/${id}.png`,
  audioIds: [`word-${id}`],
  categories: [role],
  tags: [],
  availableFromUnit: 1,
  grammatical: { role: [role] },
})

const content = [
  pictogram('papa', 'subject'), pictogram('mama', 'subject'), pictogram('jacobo', 'subject'),
  pictogram('come', 'action'), pictogram('bebe', 'action'), pictogram('canta', 'action'),
  pictogram('arroz', 'complement'), pictogram('agua', 'complement'), pictogram('leche', 'complement'),
  pictogram('y', 'conjunction'), pictogram('punto', 'punctuation'),
]
const sentence: SentenceDefinition = {
  id: 'papa-come-arroz', subjectId: 'papa', actionId: 'come', complementIds: ['arroz'], availableFromUnit: 1,
}

describe('dictation rounds', () => {
  it('builds subject, action, complement and punctuation steps', () => {
    const [round] = buildDictationRounds([sentence], content, 3, 3, 'fixed')
    expect(round.steps.map(({ role }) => role)).toEqual(['subject', 'action', 'complement', 'punctuation'])
    round.steps.forEach((step) => {
      expect(step.options).toHaveLength(step.role === 'punctuation' ? 1 : 3)
      expect(step.options.filter(({ id }) => id === step.correctId)).toHaveLength(1)
      expect(new Set(step.options.map(({ id }) => id)).size).toBe(step.role === 'punctuation' ? 1 : 3)
    })
  })

  it('places the conjunction between two complements', () => {
    const coordinated = { ...sentence, id: 'coordinated', complementIds: ['arroz', 'agua'] }
    const [round] = buildDictationRounds([coordinated], content, 2, 3, 'fixed')
    expect(round.parts.map(({ id }) => id)).toEqual(['papa', 'come', 'arroz', 'y', 'agua', 'punto'])
    expect(round.steps.map(({ role }) => role)).toEqual([
      'subject', 'action', 'complement', 'conjunction', 'complement', 'punctuation',
    ])
  })

  it('rejects a sentence whose component does not exist', () => {
    expect(getPlayableSentences([{ ...sentence, subjectId: 'missing' }], content, 2)).toEqual([])
  })

  it('rejects an option count without enough same-role distractors', () => {
    expect(getPlayableSentences([sentence], content.slice(0, 7), 3)).toEqual([])
  })
})
