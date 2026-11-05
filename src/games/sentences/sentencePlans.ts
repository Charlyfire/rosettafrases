import type { SentenceBuilderSettings } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility, SentenceDefinition } from '../../domain/sentence'
import { sentenceLayout, commaPictogram, actionForSubjects } from './sentenceStructure'
import { builderChoices } from '../sentence-builder/builderSession'
import { rotate, shuffle } from '../../utils/collections'

export interface SentencePlan {
  id: string
  sentence: SentenceDefinition
  parts: Pictogram[]
  roles: ReturnType<typeof sentenceLayout>[number]['role'][]
  audioId?: string
  sceneImage?: string
}

// The queue lives only in the running browser session. It is deliberately not persisted:
// no classroom content or usage history is sent to a server.
const pendingByPool = new Map<string, string[]>()

/** Use every eligible sentence once before cycling through the same pool again. */
export function selectSessionSentences<T extends { id: string }>(pool: T[], count: number, scope: string): T[] {
  const limit = Math.min(Math.max(count, 0), pool.length)
  if (limit === 0) return []
  const byId = new Map(pool.map((item) => [item.id, item]))
  const cacheKey = JSON.stringify([scope, pool.map(({ id }) => id).sort()])
  const pending = (pendingByPool.get(cacheKey) ?? []).filter((id) => byId.has(id))
  const chosen: string[] = []
  while (chosen.length < limit) {
    if (pending.length === 0) {
      // A boundary may occur inside an activity; do not duplicate a sentence
      // in that same activity even when a new cycle starts.
      pending.push(...shuffle(pool.map(({ id }) => id).filter((id) => !chosen.includes(id))))
    }
    const id = pending.shift()
    if (id && !chosen.includes(id)) chosen.push(id)
  }
  pendingByPool.set(cacheKey, pending)
  return chosen.map((id) => byId.get(id)!)
}

export function buildSentencePlans(sentences: SentenceDefinition[], pictograms: Pictogram[], compatibility: ActionCompatibility[], settings: SentenceBuilderSettings, scenesOnly = false, preview = false): SentencePlan[] {
  const pick = <T extends { id: string }>(pool: T[], count: number, scope: string) =>
    preview ? pool.slice(0, Math.max(0, count)) : selectSessionSentences(pool, count, scope)
  const bank = builderChoices(pictograms, compatibility, settings)
  const byId = new Map([...pictograms, commaPictogram].map((item) => [item.id, item]))
  const actions = new Map(bank.actions.map((action) => [action.id, action]))
  const savedPlans: SentencePlan[] = []
  for (const sentence of sentences.filter((item) => item.clauses && (!scenesOnly || item.sceneImage))) {
    const clauses = sentence.clauses!
    if (clauses.length !== settings.clauseCount || clauses.some((clause) => clause.subjectIds.length !== settings.subjectCount || clause.complementIds.length !== settings.complementCount)) continue
    const valid = clauses.every((clause) => {
      const rule = bank.rules.find(({ actionId }) => actionId === clause.actionId)
      return rule && clause.subjectIds.every((id) => byId.has(id) && (!rule.allowedSubjectIds || rule.allowedSubjectIds.includes(id))) && clause.complementIds.every((id) => byId.has(id) && rule.allowedComplementIds.includes(id))
    })
    if (!valid) continue
    const subjects = clauses.map(() => 0), complements = clauses.map(() => 0)
    const layout = sentenceLayout(settings)
    const parts = layout.map(({ role,clause }) => {
      const source = clauses[clause]
      if (role === 'subject') return byId.get(source.subjectIds[subjects[clause]++])
      if (role === 'action') { const action = byId.get(source.actionId); return action ? actionForSubjects(action,settings.subjectCount) : undefined }
      if (role === 'complement') return byId.get(source.complementIds[complements[clause]++])
      return byId.get(role === 'conjunction' ? 'y' : role === 'comma' ? 'coma' : 'punto')
    })
    if (parts.every(Boolean)) savedPlans.push({ id:sentence.id,sentence,parts:parts as Pictogram[],roles:layout.map(({ role }) => role),audioId:sentence.audioId,sceneImage:sentence.sceneImage })
  }
  const templates = sentences.filter((sentence) => {
    if (sentence.clauses || (scenesOnly && (settings.subjectCount !== 1 || settings.clauseCount !== 1))) return false

    const rule = bank.rules.find(({ actionId }) => actionId === sentence.actionId)
    return rule && actions.has(sentence.actionId) && bank.subjects.some(({ id }) => id === sentence.subjectId) &&
      sentence.complementIds.length === settings.complementCount && new Set(sentence.complementIds).size === settings.complementCount &&
      (!rule.allowedSubjectIds || rule.allowedSubjectIds.includes(sentence.subjectId)) &&
      sentence.complementIds.every((id) => byId.has(id) && rule.allowedComplementIds.includes(id)) &&
      (!scenesOnly || Boolean(sentence.sceneImage)) &&
      bank.subjects.filter(({ id }) => !rule.allowedSubjectIds || rule.allowedSubjectIds.includes(id)).length >= settings.subjectCount
  })
  // The catalog stores up to two complements. Build bounded templates for three from the same compatibility rules.
  if (settings.complementCount === 3 && !scenesOnly) {
    bank.rules.forEach((rule) => {
      const complements = rule.allowedComplementIds.filter((id) => byId.has(id))
      if (complements.length < 3) return
      bank.subjects.filter(({ id }) => !rule.allowedSubjectIds || rule.allowedSubjectIds.includes(id)).forEach((subject, index) => {
        templates.push({ id: `triple-${subject.id}-${rule.actionId}`, subjectId: subject.id, actionId: rule.actionId, complementIds: rotate(complements, index).slice(0, 3), availableFromUnit: 1 })
      })
    })
  }
  if (!templates.length || !byId.has('punto') || ((settings.subjectCount === 2 || settings.complementCount > 1 || settings.clauseCount > 1) && !byId.has('y'))) return pick(savedPlans, settings.roundCount, 'saved-only')
  const ordered = pick(templates, Math.max(0, settings.roundCount - savedPlans.length), 'generated-' + JSON.stringify([settings.subjectCount, settings.complementCount, settings.clauseCount]))
  const layout = sentenceLayout(settings)
  const generated = Array.from({ length: Math.min(settings.roundCount, ordered.length) }, (_, roundIndex): SentencePlan | undefined => {
    const first = ordered[roundIndex]
    const clauses = [first]
    if (settings.clauseCount === 2) {
      const second = templates.find((candidate) => candidate.id !== first.id && candidate.actionId !== first.actionId) ?? templates.find((candidate) => candidate.id !== first.id)
      if (!second) return undefined
      clauses.push(second)
    }
    const subjects = clauses.map((clause, index) => {
      const rule = bank.rules.find(({ actionId }) => actionId === clause.actionId)!
      const others = rotate(bank.subjects.filter(({ id }) => id !== clause.subjectId && (!rule.allowedSubjectIds || rule.allowedSubjectIds.includes(id))), roundIndex + index)
      return [byId.get(clause.subjectId)!, ...others].slice(0, settings.subjectCount)
    })
    const subjectIndices = clauses.map(() => 0)
    const complementIndices = clauses.map(() => 0)
    const parts = layout.map(({ role, clause }) => {
      const template = clauses[clause]
      if (role === 'subject') return subjects[clause][subjectIndices[clause]++]
      if (role === 'action') return actions.get(template.actionId)
      if (role === 'complement') return byId.get(template.complementIds[complementIndices[clause]++])
      return byId.get(role === 'conjunction' ? 'y' : role === 'comma' ? 'coma' : 'punto')
    })
    if (!parts.every(Boolean)) return undefined
    const single = settings.subjectCount === 1 && settings.clauseCount === 1
    const sentence = { ...first, audioId: single ? first.audioId : undefined, sceneImage: single ? first.sceneImage : undefined }
    return { id: `plan-${roundIndex}-${clauses.map(({ id }) => id).join('-')}`, sentence, parts: parts as Pictogram[], roles: layout.map(({ role }) => role), audioId: sentence.audioId, sceneImage: sentence.sceneImage }
  }).filter((plan): plan is SentencePlan => Boolean(plan))
  return [...pick(savedPlans, settings.roundCount, 'saved-scenes'), ...generated].slice(0, settings.roundCount)
}
