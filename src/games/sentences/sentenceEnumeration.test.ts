import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../../domain/content'
import { buildSentencePlans } from './sentencePlans'
import { buildSentenceGameRounds } from '../sentence-games/sentenceGameRounds'
import { buildDictationRounds } from '../dictation/dictationRounds'
import { sentenceLayout } from './sentenceStructure'
import { formatSentence, sentencePauses, sentenceWords } from '../../utils/sentenceAudio'
const item = (id:string, category:'subject'|'action'|'complement'|'conjunction'|'punctuation'):Pictogram=>({id,label:id,image:`${id}.png`,audioIds:[id],categories:[category],tags:[],availableFromUnit:1})
const content=[item('mamá','subject'),item('come','action'),item('verduras','complement'),item('pan','complement'),item('fruta','complement'),item('y','conjunction'),item('punto','punctuation')]
const rules=[{actionId:'come',allowedComplementIds:['verduras','pan','fruta']}]
const settings={subjectCount:1 as const,complementCount:3 as const,clauseCount:1 as const,roundCount:1}

describe('enumeración de complementos',()=>{
 it('usa coma antes del último enlace y en todos los juegos',()=>{
  const plans=[...buildSentencePlans([],content,rules,settings),...buildDictationRounds([],content,rules,settings),...buildSentenceGameRounds([],content,settings,'sentence-order',rules),...buildSentenceGameRounds([],content,settings,'complete-dictation',rules)]
  expect(plans).toHaveLength(4)
  for(const plan of plans){
   expect(plan.parts.map(({id})=>id)).toEqual(['mamá','come','verduras','coma','pan','y','fruta','punto'])
   expect(formatSentence(plan.parts)).toBe('mamá come verduras, pan y fruta.')
   expect(sentenceWords(plan.parts).map(({label})=>label)).toEqual(['mamá','come','verduras','pan','y','fruta'])
   expect(sentencePauses(plan.parts)).toEqual({2:240})
  }
 })
 it('con dos complementos conserva y, y no cambia las uniones entre sujetos o frases',()=>{
  const two=sentenceLayout({...settings,complementCount:2})
  expect(two.map(({role})=>role)).toEqual(['subject','action','complement','conjunction','complement','punctuation'])
  const full=sentenceLayout({...settings,subjectCount:2,clauseCount:2})
  expect(full.filter(({role})=>role==='comma')).toHaveLength(2)
  expect(full.filter(({role})=>role==='conjunction')).toHaveLength(5)
 })
})
