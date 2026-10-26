import { useState } from 'react'
import type { Pictogram } from '../domain/content'
import type { ActionCompatibility, LocalSceneRecord, SentenceClauseDefinition } from '../domain/sentence'
import { actionForSubjects } from '../games/sentences/sentenceStructure'
import { formatSentence } from '../utils/sentenceAudio'
import { hasRole } from './resourceBank'
import { deleteLocalScene, saveLocalScene, type BankContext } from './resourceBankRepository'
import { useBlobUrl } from './useBlobUrl'

interface Props { scenes:LocalSceneRecord[]; pictograms:Pictogram[]; rules:ActionCompatibility[]; context:BankContext; onChanged:()=>Promise<void> }
const emptyClause=():SentenceClauseDefinition=>({subjectIds:[''],actionId:'',complementIds:['']})
function preview(clauses:SentenceClauseDefinition[],pictograms:Pictogram[]) {
  const parts:Pictogram[]=[]
  const token=(label:string,id=label):Pictogram=>({id,label,image:'',audioIds:[],categories:[],tags:[],availableFromUnit:1})
  const word=(id:string)=>pictograms.find((item)=>item.id===id) ?? token('…')
  clauses.forEach((clause,index)=>{
    if(index)parts.push(token('y'))
    clause.subjectIds.forEach((id,i)=>{if(i)parts.push(token('y'));parts.push(word(id))})
    parts.push(actionForSubjects(word(clause.actionId),clause.subjectIds.length))
    clause.complementIds.forEach((id,i)=>{if(i)parts.push(i===clause.complementIds.length-1 ? token('y') : token(',','coma'));parts.push(word(id))})
  })
  parts.push(token('.','punto'));return formatSentence(parts)
}
function SceneCard({scene,pictograms,onEdit,onDelete}:{scene:LocalSceneRecord;pictograms:Pictogram[];onEdit:()=>void;onDelete:()=>void}) {
  const image=useBlobUrl(scene.imageBlob),audio=useBlobUrl(scene.audioBlob)
  return <article className="resource-scene-card"><img src={image} alt={scene.label}/><div><h3>{scene.label}</h3><p>{preview(scene.clauses,pictograms)}</p>{audio ? <audio controls src={audio} aria-label={`Audio de ${scene.label}`}/> : <p>Sin grabación completa: dictado oral del docente.</p>}<div className="button-row"><button type="button" className="button button--compact" onClick={onEdit}>Editar escena</button><button type="button" className="button button--compact" onClick={onDelete}>Eliminar escena</button></div></div></article>
}
function SceneEditor({record,pictograms,rules,context,onSaved,onCancel}:{record?:LocalSceneRecord;pictograms:Pictogram[];rules:ActionCompatibility[];context:BankContext;onSaved:()=>Promise<void>;onCancel:()=>void}) {
  const [label,setLabel]=useState(record?.label ?? '')
  const [clauses,setClauses]=useState<SentenceClauseDefinition[]>(record?.clauses.map((clause)=>({...clause,subjectIds:[...clause.subjectIds],complementIds:[...clause.complementIds]})) ?? [emptyClause()])
  const [unit,setUnit]=useState(record?.availableFromUnit ?? 1)
  const [imageFile,setImageFile]=useState<File>(),[audioFile,setAudioFile]=useState<File>()
  const [removeAudio,setRemoveAudio]=useState(false)
  const [saving,setSaving]=useState(false),[error,setError]=useState('')
  const image=useBlobUrl(imageFile ?? record?.imageBlob),audio=useBlobUrl(removeAudio ? undefined : audioFile ?? record?.audioBlob)
  const resize=(subjects:number,complements:number,count:number)=>setClauses((current)=>Array.from({length:count},(_,i)=>({subjectIds:Array.from({length:subjects},(_,s)=>current[i]?.subjectIds[s] ?? ''),actionId:current[i]?.actionId ?? '',complementIds:Array.from({length:complements},(_,c)=>current[i]?.complementIds[c] ?? '')})))
  const change=(index:number,patch:Partial<SentenceClauseDefinition>)=>setClauses((current)=>current.map((clause,i)=>i===index ? {...clause,...patch} : clause))
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();if(saving)return;setSaving(true);setError('')
    try {
      const imageBlob=imageFile ?? record?.imageBlob
      if(!imageBlob)throw new Error('Selecciona una imagen PNG para la escena.')
      const sound=removeAudio ? undefined : audioFile ?? record?.audioBlob
      const now=new Date().toISOString()
      await saveLocalScene({id:record?.id ?? `local-scene-${crypto.randomUUID()}`,label:label.trim(),clauses,imageBlob,imageFileName:imageFile?.name ?? record?.imageFileName ?? 'escena.png',audioBlob:sound,audioFileName:removeAudio ? undefined : audioFile?.name ?? record?.audioFileName,availableFromUnit:unit,createdAt:record?.createdAt ?? now,updatedAt:now},context)
      await onSaved()
    }catch(e){setError(e instanceof Error ? e.message : 'No se pudo guardar la escena.')}
    finally{setSaving(false)}
  }
  return <form className="resource-form content-editor" onSubmit={(event)=>void submit(event)}>
    <h3>{record ? 'Editar escena' : 'Añadir escena'}</h3>
    <label className="text-field"><span>Nombre de la escena</span><input value={label} onChange={(event)=>setLabel(event.target.value)} required/></label>
    <div className="form-row">
      <label className="select-field"><span>Sujetos por frase</span><select aria-label="Sujetos por frase" value={clauses[0].subjectIds.length} onChange={(event)=>resize(Number(event.target.value),clauses[0].complementIds.length,clauses.length)}><option value={1}>1</option><option value={2}>2</option></select></label>
      <label className="select-field"><span>Complementos por verbo</span><select aria-label="Complementos por verbo" value={clauses[0].complementIds.length} onChange={(event)=>resize(clauses[0].subjectIds.length,Number(event.target.value),clauses.length)}>{[0,1,2,3].map((value)=><option key={value} value={value}>{value}</option>)}</select></label>
      <label className="select-field"><span>Frases enlazadas</span><select aria-label="Frases enlazadas" value={clauses.length} onChange={(event)=>resize(clauses[0].subjectIds.length,clauses[0].complementIds.length,Number(event.target.value))}><option value={1}>1</option><option value={2}>2</option></select></label>
    </div>
    {clauses.map((clause,index)=>{
      const rule=rules.find(({actionId})=>actionId===clause.actionId)
      return <fieldset key={index}><legend>Frase {index+1}</legend><div className="resource-clause">
        {clause.subjectIds.map((id,i)=><label className="select-field" key={`s-${i}`}><span>Sujeto {i+1}</span><select aria-label={`Sujeto ${i+1}`} value={id} onChange={(event)=>change(index,{subjectIds:clause.subjectIds.map((value,s)=>s===i ? event.target.value : value)})}><option value="">Selecciona un personaje</option>{pictograms.filter((item)=>hasRole(item,'subject')).map((item)=><option key={item.id} value={item.id} disabled={clause.subjectIds.some((value,s)=>s!==i&&value===item.id)}>{item.label}</option>)}</select></label>)}
        <label className="select-field"><span>Verbo</span><select aria-label="Verbo" value={clause.actionId} onChange={(event)=>{const next=rules.find((item)=>item.actionId===event.target.value);change(index,{actionId:event.target.value,complementIds:clause.complementIds.map((id)=>next?.allowedComplementIds.includes(id) ? id : '')})}}><option value="">Selecciona un verbo</option>{pictograms.filter((item)=>hasRole(item,'action')).map((item)=><option key={item.id} value={item.id}>{actionForSubjects(item,clause.subjectIds.length).label}</option>)}</select></label>
        {clause.complementIds.map((id,i)=><label className="select-field" key={`c-${i}`}><span>Complemento {i+1}</span><select aria-label={`Complemento ${i+1}`} value={id} onChange={(event)=>change(index,{complementIds:clause.complementIds.map((value,c)=>c===i ? event.target.value : value)})}><option value="">Selecciona un complemento</option>{pictograms.filter((item)=>hasRole(item,'complement')&&rule?.allowedComplementIds.includes(item.id)).map((item)=><option key={item.id} value={item.id} disabled={clause.complementIds.some((value,c)=>c!==i&&value===item.id)}>{item.label}</option>)}</select></label>)}
      </div>{clause.actionId&&!rule&&<p>Configura este verbo en Compatibilidades antes de guardar la escena. Puedes cambiar de apartado sin perder este formulario.</p>}</fieldset>
    })}
    <p className="resource-sentence-preview" aria-live="polite">{preview(clauses,pictograms)}</p>
    <div className="file-fields"><label className="file-field"><span>Imagen PNG de la escena</span><input type="file" accept="image/png,.png" onChange={(event)=>setImageFile(event.target.files?.[0])}/></label><label className="file-field"><span>Audio MP3 de la oración completa (opcional)</span><input type="file" accept="audio/mpeg,.mp3" onChange={(event)=>{setAudioFile(event.target.files?.[0]);setRemoveAudio(false)}}/></label></div>
    {image&&<img className="resource-scene-preview" src={image} alt={label||'Vista previa de la escena'}/>} {audio&&<audio controls src={audio} aria-label="Audio completo de la escena"/>}
    {(record?.audioBlob||audioFile)&&<label className="resource-check"><input type="checkbox" checked={removeAudio} onChange={(event)=>setRemoveAudio(event.target.checked)}/>Usar esta escena sin grabación completa</label>}
    <label className="select-field"><span>Disponible desde la unidad</span><select value={unit} onChange={(event)=>setUnit(Number(event.target.value))}>{Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <div className="button-row"><button type="button" className="button" onClick={onCancel}>Cancelar escena</button><button type="submit" className="button button--primary" disabled={saving}>Guardar escena</button></div>
  </form>
}
export function ScenePanel({scenes,pictograms,rules,context,onChanged}:Props) {
  const [editing,setEditing]=useState<LocalSceneRecord>(),[open,setOpen]=useState(false),[message,setMessage]=useState('')
  const close=()=>{setOpen(false);setEditing(undefined)}
  return <section className="resource-panel" aria-label="Escenas y frases"><div className="section-heading"><div><h2>Escenas y frases</h2><p>Relaciona la imagen y su grabación con las tarjetas que debe colocar el alumno.</p></div><button type="button" className="button button--primary" onClick={()=>{setEditing(undefined);setOpen(true)}}>Añadir escena</button></div>
    {open&&<SceneEditor key={editing?.id ?? 'new'} record={editing} pictograms={pictograms} rules={rules} context={context} onCancel={close} onSaved={async()=>{await onChanged();close();setMessage('Escena guardada. Ya aparece en las actividades con su estructura.')}}/>}
    {message&&<p role="status" className="manager-message">{message}</p>}
    {!scenes.length&&!open&&<p className="empty-state">Todavía no has añadido escenas. Las escenas incluidas en la aplicación siguen disponibles en los juegos.</p>}
    <div className="resource-scene-grid">{scenes.map((scene)=><SceneCard key={scene.id} scene={scene} pictograms={pictograms} onEdit={()=>{setEditing(scene);setOpen(true)}} onDelete={()=>{if(!window.confirm(`¿Eliminar la escena «${scene.label}»?`))return;void deleteLocalScene(scene.id).then(onChanged).catch((e)=>setMessage(e instanceof Error ? e.message : 'No se pudo eliminar.'))}}/>)}</div>
  </section>
}
