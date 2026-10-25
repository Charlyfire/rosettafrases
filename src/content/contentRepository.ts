import type { ActivityDefinition } from '../domain/activity'
import type { ContentBank } from '../domain/content'
import type { RosettaSequence } from '../domain/rosetta'
import type { SentenceCatalog } from '../domain/sentence'
import { listLocalContent, localRecordToRuntime } from './localContentRepository'
import { generateCompatibleSentences } from './sentenceGenerator'

let activeLocalObjectUrls: string[] = []

const loadJson = async <T,>(path: string): Promise<T> => {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`No se pudo cargar ${path}`)
  return response.json() as Promise<T>
}

export const loadAppContent = async () => {
  const [content, constructionContent, activities, sequence, sentenceCatalog, localRecords] = await Promise.all([
    loadJson<ContentBank>('/content/pictograms.json'),
    loadJson<ContentBank>('/content/construction-content.json'),
    loadJson<{ schemaVersion: 1; activities: ActivityDefinition[] }>('/content/activities.json'),
    loadJson<RosettaSequence>('/content/rosetta-sequence.json'),
    loadJson<SentenceCatalog>('/content/sentences.json'),
    listLocalContent(),
  ])

  activeLocalObjectUrls.forEach((url) => URL.revokeObjectURL(url))
  const localRuntime = localRecords.map(localRecordToRuntime)
  activeLocalObjectUrls = localRuntime.flatMap(({ objectUrls }) => objectUrls)

  const bundledPictograms = [...content.pictograms, ...constructionContent.pictograms]
  const bundledAudio = [...content.audio, ...constructionContent.audio]
  const mergedContent: ContentBank = {
    ...content,
    pictograms: [
      ...bundledPictograms.map((pictogram) => ({ ...pictogram, source: 'bundled' as const })),
      ...localRuntime.map(({ pictogram }) => pictogram),
    ],
    audio: [...bundledAudio, ...localRuntime.map(({ audio }) => audio)],
  }

  const sentences = generateCompatibleSentences(
    sentenceCatalog.sentences,
    sentenceCatalog.actionCompatibility,
    mergedContent.pictograms,
  )

  return {
    content: mergedContent,
    activities: activities.activities,
    sequence,
    sentences,
    actionCompatibility: sentenceCatalog.actionCompatibility,
    localRecords,
  }
}

export const resolveAssetUrl = (relativePath: string) => {
  if (/^(blob:|data:|https?:)/.test(relativePath)) return relativePath
  return `/assets/${relativePath.replace(/^\/+/, '')}`
}
