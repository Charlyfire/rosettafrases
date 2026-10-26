import type { ActivityDefinition } from '../domain/activity'
import type { ContentBank } from '../domain/content'
import type { RosettaSequence } from '../domain/rosetta'
import type { SentenceCatalog } from '../domain/sentence'
import { listLocalContent, localRecordToRuntime } from './localContentRepository'
import { listLocalScenes, listLocalRules, localSceneToRuntime } from './resourceBankRepository'
import { mergeCompatibility } from './resourceBank'
import { generateCompatibleSentences } from './sentenceGenerator'

let activeLocalObjectUrls: string[] = []

// Bundled catalogs are immutable for the current page. Local edits do not re-download them.
const bundledJson = new Map<string,Promise<unknown>>()
const loadJson = async <T,>(path: string): Promise<T> => {
  let request = bundledJson.get(path)
  if (!request) {
    request = fetch(path).then((response) => {
      if (!response.ok) throw new Error(`No se pudo cargar ${path}`)
      return response.json() as Promise<unknown>
    })
    bundledJson.set(path,request)
    void request.catch(() => bundledJson.delete(path))
  }
  return request as Promise<T>
}

export const loadAppContent = async () => {
  const [content, constructionContent, activities, sequence, sentenceCatalog, localRecords, localScenes, localRules] = await Promise.all([
    loadJson<ContentBank>('/content/pictograms.json'),
    loadJson<ContentBank>('/content/construction-content.json'),
    loadJson<{ schemaVersion: 1; activities: ActivityDefinition[] }>('/content/activities.json'),
    loadJson<RosettaSequence>('/content/rosetta-sequence.json'),
    loadJson<SentenceCatalog>('/content/sentences.json'),
    listLocalContent(),
    listLocalScenes(),
    listLocalRules(),
  ])

  activeLocalObjectUrls.forEach((url) => URL.revokeObjectURL(url))
  const localRuntime = localRecords.map(localRecordToRuntime)
  const sceneRuntime = localScenes.map(localSceneToRuntime)
  activeLocalObjectUrls = [...localRuntime.flatMap(({ objectUrls }) => objectUrls),...sceneRuntime.flatMap(({ objectUrls }) => objectUrls)]

  const bundledPictograms = [...content.pictograms, ...constructionContent.pictograms]
  const bundledAudio = [...content.audio, ...constructionContent.audio]
  const mergedContent: ContentBank = {
    ...content,
    pictograms: [...new Map([
      ...bundledPictograms.map((pictogram) => ({ ...pictogram,source:'bundled' as const })),
      ...localRuntime.map(({ pictogram }) => pictogram),
    ].map((pictogram) => [pictogram.id,pictogram])).values()],
    audio: [...bundledAudio,...localRuntime.map(({ audio }) => audio),...localRuntime.flatMap(({ pluralAudio }) => pluralAudio ? [pluralAudio] : []),...sceneRuntime.flatMap(({ audio }) => audio ? [audio] : [])],
  }
  const actionCompatibility = mergeCompatibility(sentenceCatalog.actionCompatibility,localRules)

  const sentences = generateCompatibleSentences(
    [...sentenceCatalog.sentences,...sceneRuntime.map(({ sentence }) => sentence)],
    actionCompatibility,
    mergedContent.pictograms,
  )

  return {
    content: mergedContent,
    activities: activities.activities,
    sequence,
    sentences,
    actionCompatibility,
    baseCompatibility:sentenceCatalog.actionCompatibility,
    bundledPictograms,
    localScenes,
    localRules,
    localRecords,
  }
}

export const resolveAssetUrl = (relativePath: string) => {
  if (/^(blob:|data:|https?:)/.test(relativePath)) return relativePath
  return `/assets/${relativePath.replace(/^\/+/, '')}`
}
