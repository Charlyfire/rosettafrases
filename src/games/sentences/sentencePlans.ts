import type { SentenceBuilderSettings } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility, SentenceDefinition } from '../../domain/sentence'
import { sentenceLayout } from './sentenceStructure'
import { builderChoices } from '../sentence-builder/builderSession'
import { rotate } from '../../utils/collections'

export interface SentencePlan {
  id: string
  sentence: SentenceDefinition
  parts: Pictogram[]
  roles: ReturnType<typeof sentenceLayout>[number]['role'][]
  audioId?: string
  sceneImage?: string
}

export function buildSentencePlans(sentences: SentenceDefinition[], pictograms: Pictogram[], compatibility: ActionCompatibility[], settings: SentenceBuilderSettings, scenesOnly = false): SentencePlan[] {
  if (scenesOnly && (settings.subjectCount !== 1 || settings.clauseCount !== 1)) return []
  const bank = builderChoices(pictograms, compatibility, settings)
  const byId = new Map(pictograms.map((item) => [item.id, item]))
  const actions = new Map(bank.actions.map((action) => [action.id, action]))
  const templates = sentences.filter((sentence) => {
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
  if (!templates.length || !byId.has('punto') || ((settings.subjectCount === 2 || settings.complementCount > 1 || settings.clauseCount > 1) && !byId.has('y'))) return []
  const ordered = [...templates.filter(({ audioId }) => audioId), ...templates.filter(({ audioId }) => !audioId)]
  const layout = sentenceLayout(settings)
  return Array.from({ length: Math.min(settings.roundCount, ordered.length) }, (_, roundIndex): SentencePlan | undefined => {
    const first = ordered[roundIndex]
    const clauses = [first]
    if (settings.clauseCount === 2) {
      const second = ordered.find((candidate) => candidate.actionId !== first.actionId) ?? ordered.find((candidate) => candidate.id !== first.id)
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
      return byId.get(role === 'conjunction' ? 'y' : 'punto')
    })
    if (!parts.every(Boolean)) return undefined
    const single = settings.subjectCount === 1 && settings.clauseCount === 1
    const sentence = { ...first, audioId: single ? first.audioId : undefined, sceneImage: single ? first.sceneImage : undefined }
    return { id: `plan-${roundIndex}-${clauses.map(({ id }) => id).join('-')}`, sentence, parts: parts as Pictogram[], roles: layout.map(({ role }) => role), audioId: sentence.audioId, sceneImage: sentence.sceneImage }
  }).filter((plan): plan is SentencePlan => Boolean(plan))
}
