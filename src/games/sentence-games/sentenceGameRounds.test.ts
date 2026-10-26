import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility, SentenceDefinition } from '../../domain/sentence'
import { buildSentenceGameRounds } from './sentenceGameRounds'
const item = (id:string,role:'subject'|'action'|'complement'|'conjunction'|'punctuation'):Pictogram=>({id,label:id,image:`${id}.png`,audioIds:[id],categories:[role],tags:[],availableFromUnit:1})
const content=[item('papa','subject'),item('mama','subject'),item('come','action'),item('bebe','action'),item('arroz','complement'),item('agua','complement'),item('pan','complement'),item('y','conjunction'),item('punto','punctuation')]
const sentence:SentenceDefinition={id:'papa-come',subjectId:'papa',actionId:'come',complementIds:['arroz'],sceneImage:'scene.png',audioId:'full',availableFromUnit:1}
const second:SentenceDefinition={...sentence,id:'mama-bebe',subjectId:'mama',actionId:'bebe',complementIds:['agua'],audioId:undefined,sceneImage:undefined}
const rules:ActionCompatibility[]=[{actionId:'come',allowedComplementIds:['arroz','pan']},{actionId:'bebe',allowedComplementIds:['agua']}]
const settings={subjectCount:1 as const,complementCount:1 as const,clauseCount:1 as const,roundCount:3}
describe('motor común de oraciones',()=>{
 it('incluye el punto como pieza obligatoria',()=>{
  const [round]=buildSentenceGameRounds([sentence],content,settings,'complete-dictation',rules)
  expect(round.parts.map(({id})=>id)).toEqual(['papa','come','arroz','punto'])
 })
 it('no inventa escenas ni añade sujetos que no aparecen en ellas',()=>{
  expect(buildSentenceGameRounds([second],content,settings,'scene-sentence',rules)).toEqual([])
  expect(buildSentenceGameRounds([sentence],content,{...settings,subjectCount:2},'scene-sentence',rules)).toEqual([])
 })
 it('ordena una bolsa desordenada y conserva todas las ocurrencias repetidas',()=>{
  const [round]=buildSentenceGameRounds([sentence,second],content,{...settings,subjectCount:2,clauseCount:2},'sentence-order',rules)
  expect(round.options.map(({id})=>id)).not.toEqual(round.parts.map(({id})=>id))
  expect(round.options.map(({id})=>id).sort()).toEqual(round.parts.map(({id})=>id).sort())
  expect(round.options.filter(({id})=>id==='y')).toHaveLength(3)
 })
 it('distingue sujetos coordinados de frases coordinadas y no usa un audio singular en plural',()=>{
  const [shared]=buildSentenceGameRounds([second],content,{...settings,subjectCount:2},'complete-dictation',rules)
  expect(shared.parts.map(({id})=>id)).toEqual(['mama','y','papa','bebe','agua','punto'])
  expect(shared.parts[3].label).toBe('beben')
  expect(shared.parts[3].audioIds).toEqual(['word-beben'])
  expect(shared.audioId).toBeUndefined()
  const [compound]=buildSentenceGameRounds([sentence,second],content,{...settings,clauseCount:2},'complete-dictation',rules)
  expect(compound.parts.map(({id})=>id)).toEqual(['papa','come','arroz','y','mama','bebe','agua','punto'])
  expect(compound.audioId).toBeUndefined()
 })
})
