import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility, SentenceDefinition } from '../../domain/sentence'
import { buildSentencePlans } from './sentencePlans'
import { sentenceLayout, actionForSubjects, reconcileSelection } from './sentenceStructure'
const item = (id: string, role: 'subject' | 'action' | 'complement' | 'conjunction' | 'punctuation'): Pictogram => ({ id, label: id, image: `${id}.png`, audioIds: [`word-${id}`], categories: [role], tags: [], availableFromUnit: 1 })
const content = [item('mama','subject'), item('papa','subject'), item('sofia','subject'), item('come','action'), item('bebe','action'), item('pan','complement'), item('arroz','complement'), item('agua','complement'), item('y','conjunction'), item('punto','punctuation')]
const sentences: SentenceDefinition[] = [
 { id:'mama-come',subjectId:'mama',actionId:'come',complementIds:['pan'],availableFromUnit:1,audioId:'full-singular' },
 { id:'papa-bebe',subjectId:'papa',actionId:'bebe',complementIds:['agua'],availableFromUnit:1 },
]
const rules: ActionCompatibility[] = [{ actionId:'come',allowedComplementIds:['pan','arroz','agua'],allowWithoutComplement:true },{ actionId:'bebe',allowedComplementIds:['agua'],allowWithoutComplement:true }]
const settings = { subjectCount:1 as const,complementCount:1 as const,clauseCount:1 as const,roundCount:5 }

describe('significado de los tres controles docentes',()=>{
 it('dos sujetos comparten un único verbo plural y un único complemento',()=>{
  const [plan] = buildSentencePlans(sentences,content,rules,{...settings,subjectCount:2})
  expect(plan.parts.map(({label})=>label)).toEqual(['mama','y','papa','comen','pan','punto'])
  expect(plan.roles.filter((role)=>role==='action')).toHaveLength(1)
  expect(plan.audioId).toBeUndefined()
  expect(plan.parts[3].audioIds).toEqual(['word-comen'])
  expect(content.find(({id})=>id==='come')?.audioIds).toEqual(['word-come'])
 })
 it('dos frases contienen dos verbos y sus complementos, sin convertirlas en dos actividades',()=>{
  const [plan]=buildSentencePlans(sentences,content,rules,{...settings,clauseCount:2,roundCount:1})
  expect(plan.parts.map(({label})=>label)).toEqual(['mama','come','pan','y','papa','bebe','agua','punto'])
  expect(plan.roles.filter((role)=>role==='action')).toHaveLength(2)
  expect(plan.roles.filter((role)=>role==='punctuation')).toHaveLength(1)
 })
 it('combina dos sujetos en cada una de dos frases y mantiene todas las y',()=>{
  const [plan]=buildSentencePlans(sentences,content,rules,{...settings,subjectCount:2,clauseCount:2})
  expect(plan.roles.filter((role)=>role==='subject')).toHaveLength(4)
  expect(plan.roles.filter((role)=>role==='action')).toHaveLength(2)
  expect(plan.roles.filter((role)=>role==='conjunction')).toHaveLength(3)
  expect(plan.parts.filter((part)=>part.grammatical?.number==='plural').map(({label})=>label)).toEqual(['comen','beben'])
 })
 it('soporta tres complementos por verbo sin generar un catálogo de todas las combinaciones',()=>{
  const [plan]=buildSentencePlans(sentences,content,rules,{...settings,subjectCount:2,complementCount:3,clauseCount:2})
  expect(plan.roles.filter((role)=>role==='complement')).toHaveLength(6)
  expect(plan.roles.filter((role)=>role==='punctuation')).toHaveLength(1)
 })
 it('editar un sujeto coordinado conserva el verbo y los complementos válidos',()=>{
  const options={...settings,subjectCount:2 as const}
  const [plan]=buildSentencePlans(sentences,content,rules,options)
  const selection=[...plan.parts];selection[0]=content.find(({id})=>id==='sofia')!
  const next=reconcileSelection(selection,sentenceLayout(options),rules)
  expect(next.map((part)=>part?.id)).toEqual(['sofia','y','papa','come','pan','punto'])
 })
 it('nunca reutiliza la grabación singular para leer una forma plural',()=>{
  const action=content.find(({id})=>id==='bebe')!
  expect(actionForSubjects(action,2).label).toBe('beben')
  expect(actionForSubjects(action,2).audioIds).not.toContain('word-bebe')
 })
 it('no usa una plantilla cuyo sujeto esté excluido por el verbo',()=>{
  const restricted=[{...rules[0],allowedSubjectIds:['papa']},rules[1]]
  const plans=buildSentencePlans(sentences,content,restricted,settings)
  expect(plans.some((plan)=>plan.parts[0].id==='mama' && plan.parts[1].id==='come')).toBe(false)
 })

})
