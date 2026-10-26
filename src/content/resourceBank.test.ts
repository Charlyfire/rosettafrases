import { describe, expect, it } from 'vitest'
import type { LocalContentRecord, Pictogram } from '../domain/content'
import type { LocalSceneRecord } from '../domain/sentence'
import { validateBank } from './resourceBankRepository'
import { validateClauses, mergeCompatibility } from './resourceBank'
import { localRecordToRuntime } from './localContentRepository'
import { actionForSubjects } from '../games/sentences/sentenceStructure'
import { buildSentencePlans } from '../games/sentences/sentencePlans'
const image = new Blob(['png'],{type:'image/png'}),audio = new Blob(['mp3'],{type:'audio/mpeg'})
const item=(id:string,category:'subject'|'action'|'complement'|'conjunction'|'punctuation'):Pictogram=>({id,label:id,image:`${id}.png`,audioIds:[id],categories:[category],tags:[],availableFromUnit:1})
const pictograms=[item('mama','subject'),item('papa','subject'),item('come','action'),item('pan','complement'),item('y','conjunction'),item('punto','punctuation')]
const rules=[{actionId:'come',allowedComplementIds:['pan'],allowWithoutComplement:true}]
const context={pictograms,rules}
const word:LocalContentRecord={id:'local-fruta',label:'fruta',imageBlob:image,imageFileName:'fruta.png',audioBlob:audio,audioFileName:'fruta.mp3',categories:['noun','food','complement'],availableFromUnit:1,createdAt:'2026-10-26',updatedAt:'2026-10-26'}
const scene:LocalSceneRecord={id:'local-scene-1',label:'Mamá come fruta',clauses:[{subjectIds:['mama'],actionId:'come',complementIds:['local-fruta']}],imageBlob:image,imageFileName:'escena.png',audioBlob:audio,audioFileName:'escena.mp3',availableFromUnit:1,createdAt:'2026-10-26',updatedAt:'2026-10-26'}
describe('banco local de recursos',()=>{
 it('admite tarjetas nuevas, compatibilidades incluidas personalizadas y escenas enlazadas',()=>{
  expect(()=>validateBank({words:[word],scenes:[scene],rules:[{...rules[0],allowedComplementIds:['pan','local-fruta']}]},context)).not.toThrow()
 })
 it('rechaza recursos ausentes antes de modificar el banco',()=>{
  expect(()=>validateBank({words:[],scenes:[scene],rules:[{...rules[0],allowedComplementIds:['pan','local-fruta']}]},context)).toThrow(/no existe/)
 })
 it('no permite guardar una escena incompatible ni vaciar su compatibilidad activa',()=>{
  expect(()=>validateBank({words:[word],scenes:[scene],rules:[]},context)).toThrow(/no es compatible/)
 })
 it('conserva las otras reglas al personalizar un verbo',()=>{
  const merged=mergeCompatibility([...rules,{actionId:'bebe',allowedComplementIds:['agua']}],[{...rules[0],allowedComplementIds:['local-fruta']}])
  expect(merged).toHaveLength(2);expect(merged[0].allowedComplementIds).toEqual(['local-fruta'])
 })
 it('comprueba sujetos coordinados, complementos repetidos y estructuras iguales en las dos frases',()=>{
  expect(()=>validateClauses([{subjectIds:['mama','mama'],actionId:'come',complementIds:['pan']}],pictograms,rules)).toThrow(/No repitas/)
  expect(()=>validateClauses([{subjectIds:['mama'],actionId:'come',complementIds:['pan']},{subjectIds:['papa'],actionId:'come',complementIds:[]}],pictograms,rules)).toThrow(/misma cantidad/)
 })
 it('enlaza el plural grabado de un verbo local sin cambiar su audio singular',()=>{
  const local=localRecordToRuntime({...word,id:'local-salta',label:'salta',categories:['action'],pluralLabel:'saltan',pluralAudioBlob:audio,pluralAudioFileName:'saltan.mp3'})
  const plural=actionForSubjects(local.pictogram,2)
  expect(plural.label).toBe('saltan');expect(plural.audioIds).toEqual([local.pluralAudio!.id]);expect(plural.audioIds).not.toEqual(local.pictogram.audioIds)
  local.objectUrls.forEach((url)=>URL.revokeObjectURL(url))
 })
 it('usa exactamente la estructura, la escena y el audio de una escena local compleja',()=>{
  const source={id:'local-scene-complex',subjectId:'mama',actionId:'come',complementIds:['pan'],clauses:[{subjectIds:['mama','papa'],actionId:'come',complementIds:['pan']},{subjectIds:['papa','mama'],actionId:'come',complementIds:['pan']}],sceneImage:'blob:scene',audioId:'full-scene',availableFromUnit:1}
  const [plan]=buildSentencePlans([source],pictograms,rules,{subjectCount:2,clauseCount:2,complementCount:1,roundCount:5},true)
  expect(plan.parts.map(({label})=>label)).toEqual(['mama','y','papa','comen','pan','y','papa','y','mama','comen','pan','punto'])
  expect(plan.sceneImage).toBe('blob:scene');expect(plan.audioId).toBe('full-scene')
 })
})
