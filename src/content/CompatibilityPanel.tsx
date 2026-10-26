import { useState } from 'react'
import type { Pictogram } from '../domain/content'
import type { ActionCompatibility } from '../domain/sentence'
import { hasRole } from './resourceBank'
import { deleteLocalRule, saveLocalRule, type BankContext } from './resourceBankRepository'

interface Props { pictograms:Pictogram[]; rules:ActionCompatibility[]; localRules:ActionCompatibility[]; context:BankContext; onChanged:()=>Promise<void> }
export function CompatibilityPanel({pictograms,rules,localRules,context,onChanged}:Props) {
  const [actionId,setActionId]=useState('')
  const [draft,setDraft]=useState<ActionCompatibility>()
  const [search,setSearch]=useState('')
  const [message,setMessage]=useState('')
  const [saving,setSaving]=useState(false)
  const actions=pictograms.filter((item)=>hasRole(item,'action'))
  const complements=pictograms.filter((item)=>hasRole(item,'complement'))
  const subjects=pictograms.filter((item)=>hasRole(item,'subject'))
  const choose=(id:string)=>{
    setActionId(id);setMessage('');setSearch('')
    const rule=rules.find((item)=>item.actionId===id)
    setDraft(id ? {...rule,actionId:id,allowedComplementIds:[...(rule?.allowedComplementIds ?? [])],allowedSubjectIds:rule?.allowedSubjectIds ? [...rule.allowedSubjectIds] : undefined,allowWithoutComplement:rule?.allowWithoutComplement ?? false} : undefined)
  }
  const toggle=(id:string,field:'allowedComplementIds'|'allowedSubjectIds')=>setDraft((current)=>current ? {...current,[field]:(current[field] ?? []).includes(id) ? current[field]!.filter((value)=>value!==id) : [...(current[field] ?? []),id]} : current)
  const run=async(reset=false)=>{
    if (!draft || saving) return
    setSaving(true);setMessage('')
    try {
      if (reset) await deleteLocalRule(actionId,context)
      else await saveLocalRule(draft,context)
      await onChanged();setMessage(reset ? 'Compatibilidad local eliminada. Se recuperan los valores incluidos, si existen.' : 'Compatibilidades guardadas. Ya se aplican a las actividades.')
      if(reset){setDraft(undefined);setActionId('')}
    } catch(e){setMessage(e instanceof Error ? e.message : 'No se pudo guardar la compatibilidad.')}
    finally{setSaving(false)}
  }
  return <section className="resource-panel" aria-label="Compatibilidades de verbos">
    <h2>Compatibilidades de verbos</h2>
    <p>Elige qué complementos admite cada verbo. Las tarjetas nuevas no se incorporan a las oraciones hasta configurar estas relaciones.</p>
    <label className="select-field"><span>Verbo</span><select aria-label="Verbo" value={actionId} onChange={(event)=>choose(event.target.value)}><option value="">Selecciona un verbo</option>{actions.map((item)=><option key={item.id} value={item.id}>{item.label}{rules.some((rule)=>rule.actionId===item.id) ? '' : ' · Sin configurar'}</option>)}</select></label>
    {draft && <form onSubmit={(event)=>{event.preventDefault();void run()}} className="resource-form">
      <label className="resource-check"><input type="checkbox" checked={Boolean(draft.allowWithoutComplement)} onChange={(event)=>setDraft({...draft,allowWithoutComplement:event.target.checked})}/>Permitir frases sin complemento</label>
      <fieldset><legend>Complementos compatibles ({draft.allowedComplementIds.length})</legend>
        <label className="text-field"><span>Buscar complemento</span><input value={search} onChange={(event)=>setSearch(event.target.value)} /></label>
        <div className="resource-choice-grid">{complements.filter((item)=>item.label.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).map((item)=><label className="resource-check" key={item.id}><input type="checkbox" checked={draft.allowedComplementIds.includes(item.id)} onChange={()=>toggle(item.id,'allowedComplementIds')}/>{item.label}</label>)}</div>
        {!complements.length && <p>Añade primero tarjetas con la categoría Complemento.</p>}
      </fieldset>
      <label className="resource-check"><input type="checkbox" checked={draft.allowedSubjectIds===undefined} onChange={(event)=>setDraft({...draft,allowedSubjectIds:event.target.checked ? undefined : []})}/>Permitir todos los sujetos, incluidos los que añadas después</label>
      {draft.allowedSubjectIds!==undefined && <fieldset><legend>Sujetos permitidos</legend><div className="resource-choice-grid">{subjects.map((item)=><label className="resource-check" key={item.id}><input type="checkbox" checked={draft.allowedSubjectIds!.includes(item.id)} onChange={()=>toggle(item.id,'allowedSubjectIds')}/>{item.label}</label>)}</div></fieldset>}
      <div className="button-row"><button className="button button--primary" type="submit" disabled={saving}>Guardar compatibilidades</button>{localRules.some((rule)=>rule.actionId===actionId) && <button className="button" type="button" disabled={saving} onClick={()=>{if(window.confirm('¿Quitar esta configuración local? Se conservará la compatibilidad incluida, si existe.'))void run(true)}}>{context.rules.some((rule)=>rule.actionId===actionId) ? 'Restaurar configuración incluida' : 'Eliminar configuración local'}</button>}</div>
    </form>}
    {message && <p role="status" className="manager-message">{message}</p>}
  </section>
}
