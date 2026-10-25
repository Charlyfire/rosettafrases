import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../domain/content'
import type { ActionCompatibility, SentenceDefinition } from '../domain/sentence'
import { generateCompatibleSentences } from './sentenceGenerator'

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

const content = [
  item('papa', 'subject'), item('mama', 'subject'), item('come', 'action'),
  item('arroz', 'complement'), item('agua', 'complement'),
]
const rules: ActionCompatibility[] = [{
  actionId: 'come', allowWithoutComplement: true, allowedComplementIds: ['arroz'],
}]

describe('compatible sentence generator', () => {
  it('creates every subject/action/complement combination allowed by the rule', () => {
    const sentences = generateCompatibleSentences([], rules, content)
    expect(sentences).toHaveLength(4)
    expect(sentences.map(({ subjectId, complementIds }) => [subjectId, ...complementIds])).toEqual([
      ['papa'], ['papa', 'arroz'], ['mama'], ['mama', 'arroz'],
    ])
  })

  it('keeps an explicit sentence instead of duplicating its generated equivalent', () => {
    const explicit: SentenceDefinition = {
      id: 'scene-papa-come-arroz', subjectId: 'papa', actionId: 'come',
      complementIds: ['arroz'], sceneImage: 'images/scene.png', availableFromUnit: 1,
    }
    const sentences = generateCompatibleSentences([explicit], rules, content)
    expect(sentences.filter(({ subjectId, actionId, complementIds }) =>
      subjectId === 'papa' && actionId === 'come' && complementIds[0] === 'arroz',
    )).toEqual([explicit])
  })

  it('creates a coordinated sentence for each distinct pair of allowed complements', () => {
    const pairRules: ActionCompatibility[] = [{
      actionId: 'come', allowedComplementIds: ['arroz', 'agua'],
    }]
    const sentences = generateCompatibleSentences([], pairRules, content)
    expect(sentences.map(({ subjectId, complementIds }) => [subjectId, ...complementIds])).toEqual([
      ['papa', 'arroz'], ['papa', 'agua'], ['papa', 'arroz', 'agua'],
      ['mama', 'arroz'], ['mama', 'agua'], ['mama', 'arroz', 'agua'],
    ])
  })

  it('ignores missing or non-complement content referenced by a rule', () => {
    const invalidRules: ActionCompatibility[] = [{
      actionId: 'come', allowedComplementIds: ['missing', 'papa'],
    }]
    expect(generateCompatibleSentences([], invalidRules, content)).toEqual([])
  })
})
