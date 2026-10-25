import { describe, expect, it } from 'vitest'
import constructionJson from '../../public/content/construction-content.json'
import coreJson from '../../public/content/pictograms.json'
import sentenceJson from '../../public/content/sentences.json'
import type { Pictogram } from '../domain/content'
import type { SentenceCatalog } from '../domain/sentence'
import { generateCompatibleSentences } from './sentenceGenerator'

const pictograms = [
  ...coreJson.pictograms,
  ...constructionJson.pictograms,
] as unknown as Pictogram[]
const catalog = sentenceJson as unknown as SentenceCatalog
const sentences = generateCompatibleSentences(
  catalog.sentences,
  catalog.actionCompatibility,
  pictograms,
)

describe('construction content catalog', () => {
  it('produces 14004 unique compatible sentences with up to two complements', () => {
    const signatures = sentences.map((sentence) =>
      [sentence.subjectId, sentence.actionId, ...sentence.complementIds].join('|'),
    )
    expect(sentences).toHaveLength(14004)
    expect(new Set(signatures).size).toBe(sentences.length)
  })

  it('references an existing pictogram in every sentence part', () => {
    const ids = new Set(pictograms.map(({ id }) => id))
    sentences.forEach((sentence) => {
      expect(ids.has(sentence.subjectId)).toBe(true)
      expect(ids.has(sentence.actionId)).toBe(true)
      sentence.complementIds.forEach((id) => expect(ids.has(id)).toBe(true))
    })
  })

  it('does not generate structures that require an unmodelled preposition', () => {
    expect(sentences.some(({ actionId, complementIds }) =>
      actionId === 'besa' && complementIds.length > 0,
    )).toBe(false)
    expect(sentences.some(({ actionId, complementIds }) =>
      actionId === 'juega' && complementIds.length > 0,
    )).toBe(false)
  })
})
