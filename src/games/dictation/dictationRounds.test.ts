import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility, SentenceDefinition } from '../../domain/sentence'
import { buildDictationRounds } from './dictationRounds'
const item = (id: string, role: 'subject' | 'action' | 'complement' | 'conjunction' | 'punctuation'): Pictogram => ({ id, label: id, image: `${id}.png`, audioIds: [id], categories: [role], tags: [], availableFromUnit: 1 })
const content = [item('papa','subject'),item('mama','subject'),item('sofia','subject'),item('come','action'),item('bebe','action'),item('canta','action'),item('arroz','complement'),item('agua','complement'),item('leche','complement'),item('y','conjunction'),item('punto','punctuation')]
const sentence: SentenceDefinition = { id: 'papa-come-arroz', subjectId:'papa',actionId:'come',complementIds:['arroz'],availableFromUnit:1 }
const rules: ActionCompatibility[] = [{ actionId:'come',allowedComplementIds:['arroz','agua','leche'],allowWithoutComplement:true },{ actionId:'bebe',allowedComplementIds:['agua','leche'] }]
const settings = { subjectCount:1 as const,complementCount:1 as const,clauseCount:1 as const,roundCount:3 }

describe('dictado con la estructura común', () => {
 it('crea pasos por rol y siempre exige colocar el punto', () => {
  const [round]=buildDictationRounds([sentence],content,rules,settings)
  expect(round.parts.map(({id})=>id)).toEqual(['papa','come','arroz','punto'])
  for (const step of round.steps) {
   expect(step.options.filter(({id})=>id===step.correctId)).toHaveLength(1)
   expect(step.options).toHaveLength(step.role==='punctuation'?1:3)
  }
 })
 it('coordina complementos con y, sin confundirlos con frases', () => {
  const [round]=buildDictationRounds([{...sentence,complementIds:['arroz','agua']}],content,rules,{...settings,complementCount:2})
  expect(round.parts.map(({id})=>id)).toEqual(['papa','come','arroz','y','agua','punto'])
 })
 it('rechaza un componente inexistente', () => {
  expect(buildDictationRounds([{...sentence,subjectId:'missing'}],content,rules,settings)).toEqual([])
 })
 it('no ofrece dos sujetos que no puedan compartir verbo', () => {
  expect(buildDictationRounds([sentence],content,[{...rules[0],allowedSubjectIds:['papa']}],{...settings,subjectCount:2})).toEqual([])
 })
})
