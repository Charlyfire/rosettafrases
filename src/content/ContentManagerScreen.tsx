import { useRef, useState } from 'react'
import { ActivityHeader } from '../components/ActivityHeader'
import type {
  ContentCategory,
  LocalContentRecord,
  Pictogram,
} from '../domain/content'
import {
  createLocalContentId,
  slugifyContentLabel,
} from './localContentRepository'

import type { ActionCompatibility, LocalSceneRecord } from '../domain/sentence'
import { ScenePanel } from './ScenePanel'
import { CompatibilityPanel } from './CompatibilityPanel'
import { useBlobUrl as useObjectUrl } from './useBlobUrl'
import { BackupConflictError, createResourceBankBackup, importResourceBankBackup, saveBankWord, deleteBankWord, type BankContext } from './resourceBankRepository'

interface ContentManagerScreenProps {
  pictograms:Pictogram[]
  localScenes:LocalSceneRecord[]
  localRules:ActionCompatibility[]
  compatibility:ActionCompatibility[]
  baseCompatibility:ActionCompatibility[]
  bundledPictograms: Pictogram[]
  localRecords: LocalContentRecord[]
  onBack: () => void
  onChanged: () => Promise<void>
}

const categoryOptions: Array<{ value: ContentCategory; label: string }> = [
  { value: 'global-word', label: 'Palabra global' },
  { value: 'noun', label: 'Sustantivo' },
  { value: 'food', label: 'Alimento' },
  { value: 'drink', label: 'Bebida' },
  { value: 'subject', label: 'Sujeto' },
  { value: 'action', label: 'Acción' },
  { value: 'complement', label: 'Complemento' },
  { value: 'toy', label: 'Juguete' },
  { value: 'character', label: 'Personaje' },
]

function LocalContentCard({
  record,
  onEdit,
  onDelete,
}: {
  record: LocalContentRecord
  onEdit: () => void
  onDelete: () => void
}) {
  const imageUrl = useObjectUrl(record.imageBlob)
  const audioUrl = useObjectUrl(record.audioBlob)
  const pluralUrl = useObjectUrl(record.pluralAudioBlob)
  return (
    <article className="local-content-card">
      <div className="local-content-card__image">
        {imageUrl && <img src={imageUrl} alt={record.label} />}
      </div>
      <div className="local-content-card__body">
        <span className="source-badge">Añadido</span>
        <h3>{record.label}</h3>
        <p>
          {record.initialSound ? `Vocal ${record.initialSound.toUpperCase()} · ` : ''}
          Desde la Unidad {record.availableFromUnit}
        </p>
        {audioUrl && <audio controls preload="none" src={audioUrl} aria-label={`Audio de ${record.label}`} />}
        {record.pluralLabel && <p>Plural: {record.pluralLabel}</p>}
        {pluralUrl && <audio controls preload="none" src={pluralUrl} aria-label={`Audio plural de ${record.label}`} />}
        <div className="local-content-card__actions">
          <button className="button button--compact" type="button" onClick={onEdit}>Editar</button>
          <button className="button button--compact button--danger" type="button" onClick={onDelete}>Eliminar</button>
        </div>
      </div>
    </article>
  )
}

interface EditorProps {
  record?: LocalContentRecord
  allPictograms: Pictogram[]
  context:BankContext
  onCancel: () => void
  onSaved: () => Promise<void>
}

function ContentEditor({ record, allPictograms, context, onCancel, onSaved }: EditorProps) {
  const [label, setLabel] = useState(record?.label ?? '')
  const [initialSound, setInitialSound] = useState<'' | 'a' | 'e' | 'i' | 'o' | 'u'>(
    record?.initialSound ?? '',
  )
  const [availableFromUnit, setAvailableFromUnit] = useState(record?.availableFromUnit ?? 6)
  const [categories, setCategories] = useState<ContentCategory[]>(record?.categories ?? [])
  const [imageFile, setImageFile] = useState<File>()
  const [audioFile, setAudioFile] = useState<File>()
  const [pluralLabel,setPluralLabel] = useState(record?.pluralLabel ?? '')
  const [pluralFile,setPluralFile] = useState<File>()
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const imageUrl = useObjectUrl(imageFile ?? record?.imageBlob)
  const audioUrl = useObjectUrl(audioFile ?? record?.audioBlob)

  const toggleCategory = (category: ContentCategory) => {
    setCategories((current) => current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category])
  }

  const validateFile = (file: File, kind: 'image' | 'audio') => {
    if (kind === 'image' && file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
      throw new Error('La imagen debe ser un archivo PNG.')
    }
    if (kind === 'audio' && file.type !== 'audio/mpeg' && !file.name.toLowerCase().endsWith('.mp3')) {
      throw new Error('El audio debe ser un archivo MP3.')
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(undefined)
    const cleanLabel = label.trim()
    const imageBlob = imageFile ?? record?.imageBlob
    const audioBlob = audioFile ?? record?.audioBlob
    try {
      if (!cleanLabel) throw new Error('Escribe el nombre del contenido.')
      if (!imageBlob) throw new Error('Selecciona un pictograma PNG.')
      if (!audioBlob) throw new Error('Selecciona un audio MP3.')
      if (categories.length === 0) throw new Error('Selecciona al menos una categoría.')
      if (imageFile) validateFile(imageFile, 'image')
      if (audioFile) validateFile(audioFile, 'audio')
      if (pluralFile) validateFile(pluralFile,'audio')

      const normalizedLabel = slugifyContentLabel(cleanLabel)
      const duplicate = allPictograms.find((item) =>
        item.id !== (record?.overrideId ?? record?.id) && slugifyContentLabel(item.label) === normalizedLabel,
      )
      if (duplicate) throw new Error(`Ya existe un contenido llamado «${duplicate.label}».`)

      const newId = record?.id ?? createLocalContentId(cleanLabel)
      if (!record && allPictograms.some((item) => item.id === newId)) {
        throw new Error('Ya existe un contenido con ese identificador.')
      }

      setSaving(true)
      await saveBankWord({
        id: newId,
        overrideId:record?.overrideId,
        pluralLabel:categories.includes('action') ? pluralLabel : undefined,
        pluralAudioBlob:categories.includes('action') ? pluralFile ?? record?.pluralAudioBlob : undefined,
        pluralAudioFileName:categories.includes('action') ? pluralFile?.name ?? record?.pluralAudioFileName : undefined,
        label: cleanLabel,
        imageBlob,
        imageFileName: imageFile?.name ?? record!.imageFileName,
        audioBlob,
        audioFileName: audioFile?.name ?? record!.audioFileName,
        categories,
        initialSound: initialSound || undefined,
        availableFromUnit,
        createdAt: record?.createdAt,
      },context)
      await onSaved()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el contenido.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="content-editor" aria-labelledby="content-editor-title">
      <div className="content-editor__heading">
        <div>
          <span className="eyebrow">Banco local</span>
          <h2 id="content-editor-title">{record ? 'Editar contenido' : 'Añadir contenido'}</h2>
        </div>
        <button className="button button--compact" type="button" onClick={onCancel}>Cerrar</button>
      </div>
      <form className="content-editor__form" onSubmit={handleSubmit}>
        <div className="content-editor__fields">
          <label className="text-field">
            <span>Nombre</span>
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Nombre del contenido" />
          </label>

          <div className="form-row">
            <label className="select-field">
              <span>Sonido inicial</span>
              <select value={initialSound} onChange={(event) => setInitialSound(event.target.value as typeof initialSound)}>
                <option value="">Sin asignar</option>
                {['a', 'e', 'i', 'o', 'u'].map((vowel) => <option key={vowel} value={vowel}>{vowel.toUpperCase()}</option>)}
              </select>
            </label>
            <label className="select-field">
              <span>Disponible desde</span>
              <select value={availableFromUnit} onChange={(event) => setAvailableFromUnit(Number(event.target.value))}>
                {Array.from({ length: 10 }, (_, index) => index + 1).map((unit) => (
                  <option key={unit} value={unit}>Unidad {unit}</option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="category-fieldset">
            <legend>Categorías</legend>
            <div className="category-options">
              {categoryOptions.map((option) => (
                <label key={option.value} className={categories.includes(option.value) ? 'check-chip check-chip--selected' : 'check-chip'}>
                  <input
                    type="checkbox"
                    checked={categories.includes(option.value)}
                    onChange={() => toggleCategory(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <p>Para formar oraciones, marca Sujeto, Acción o Complemento. Puedes añadir también categorías como Alimento, Bebida o Personaje.</p>

          {categories.includes('action') && <fieldset><legend>Forma plural del verbo (opcional)</legend>
            <label className="text-field"><span>Verbo en plural</span><input value={pluralLabel} onChange={(event)=>setPluralLabel(event.target.value)} placeholder="Por ejemplo: saltan" /></label>
            <label className="file-field"><span>Audio MP3 del verbo en plural</span><input type="file" aria-label="Audio MP3 del verbo en plural" accept="audio/mpeg,.mp3" onChange={(event)=>setPluralFile(event.target.files?.[0])}/><small>{pluralFile?.name ?? record?.pluralAudioFileName ?? 'Sin grabación plural'}</small></label>
            <p>La forma plural permite usar este verbo con dos sujetos. Configura después sus compatibilidades.</p>
          </fieldset>}
          <div className="file-fields">
            <label className="file-field">
              <span>Pictograma PNG</span>
              <input type="file" aria-label="Pictograma PNG" accept="image/png,.png" onChange={(event) => setImageFile(event.target.files?.[0])} />
              <small>{imageFile?.name ?? record?.imageFileName ?? 'Ningún archivo seleccionado'}</small>
            </label>
            <label className="file-field">
              <span>Audio MP3</span>
              <input type="file" aria-label="Audio MP3" accept="audio/mpeg,.mp3" onChange={(event) => setAudioFile(event.target.files?.[0])} />
              <small>{audioFile?.name ?? record?.audioFileName ?? 'Ningún archivo seleccionado'}</small>
            </label>
          </div>
        </div>

        <aside className="content-preview" aria-label="Previsualización">
          <span>Previsualización</span>
          <div className="content-preview__image">
            {imageUrl ? <img src={imageUrl} alt={label || 'Pictograma seleccionado'} /> : <p>Selecciona un PNG</p>}
          </div>
          <strong>{label || 'Nombre'}</strong>
          {audioUrl ? <audio controls src={audioUrl} /> : <p className="content-preview__audio">Selecciona un MP3</p>}
        </aside>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="content-editor__footer">
          <button className="button" type="button" onClick={onCancel}>Cancelar</button>
          <button className="button button--primary" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar contenido'}
          </button>
        </div>
      </form>
    </section>
  )
}

export function ContentManagerScreen({
  bundledPictograms,
  pictograms,
  localScenes,
  localRules,
  compatibility,
  baseCompatibility,
  localRecords,
  onBack,
  onChanged,
}: ContentManagerScreenProps) {
  const [editorRecord, setEditorRecord] = useState<LocalContentRecord>()
  const [editorOpen, setEditorOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const importInputRef = useRef<HTMLInputElement>(null)

  const [importRevision,setImportRevision] = useState(0)
  const [section,setSection] = useState<'words'|'scenes'|'rules'>('words')
  const context:BankContext = { pictograms:bundledPictograms,rules:baseCompatibility }
  const allPictograms = pictograms

  const closeEditor = () => {
    setEditorOpen(false)
    setEditorRecord(undefined)
  }

  const exportBackup = async () => {
    try {
      const backup = await createResourceBankBackup()
      const url = URL.createObjectURL(backup)
      const link = document.createElement('a')
      link.href=url;link.download=`rosetta-recursos-${new Date().toISOString().slice(0,10)}.json`;link.click()
      window.setTimeout(()=>URL.revokeObjectURL(url),1000)
      setMessage('Copia completa preparada: tarjetas, escenas, audios y compatibilidades.')
    } catch(reason) { setMessage(reason instanceof Error ? reason.message : 'No se pudo exportar la copia.') }
  }

  const handleImport = async (file?: File) => {
    if (!file) return
    try {
      let count:number
      try { count = await importResourceBankBackup(file,context) }
      catch(reason) {
        if (!(reason instanceof BackupConflictError)) throw reason
        if (!window.confirm(reason.message)) { setMessage('Importación cancelada. No se ha modificado el banco.');return }
        count = await importResourceBankBackup(file,context,true)
      }
      await onChanged()
      closeEditor()
      setImportRevision((value)=>value+1)
      setMessage(`Se han importado ${count} contenidos.`)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'No se pudo importar la copia.')
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  const handleDelete = async (record: LocalContentRecord) => {
    if (!window.confirm(`¿Eliminar «${record.label}» del banco local?`)) return
    try {
      await deleteBankWord(record.id,context)
      await onChanged()
      setMessage(`Se ha eliminado «${record.label}».`)
    } catch(reason) { setMessage(`No se puede eliminar «${record.label}»: ${reason instanceof Error ? reason.message : 'tiene referencias en el banco.'} Revisa sus escenas y compatibilidades.`) }
  }

  return (
    <main className="screen screen--scrollable content-manager-screen">
      <ActivityHeader title="Banco de contenidos" subtitle="Modo docente" onBack={onBack} />
      <section className="content-manager-summary">
        <div><strong>{bundledPictograms.length}</strong><span>contenidos incluidos</span></div>
        <div><strong>{localRecords.length+localScenes.length+localRules.length}</strong><span>{localRecords.length} tarjetas · {localScenes.length} escenas · {localRules.length} verbos configurados</span></div>
        <div className="content-manager-actions">
          <button className="button" type="button" onClick={() => void exportBackup()} disabled={localRecords.length+localScenes.length+localRules.length === 0}>Exportar copia</button>
          <button className="button" type="button" onClick={() => importInputRef.current?.click()}>Importar copia</button>
          <input
            ref={importInputRef}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleImport(event.target.files?.[0])}
          />
          <button className="button button--primary" type="button" onClick={() => { setSection('words'); setMessage(undefined); setEditorRecord(undefined); setEditorOpen(true) }}>
            Añadir contenido
          </button>
        </div>
      </section>

      {message && <p className="manager-message" role="status">{message}</p>}

      <p className="resource-local-note">Los recursos se guardan en este navegador. No se publican en Netlify. Exporta una copia para conservarlos o llevarlos a otra PDI.</p>
      <nav className="resource-sections" aria-label="Secciones del banco">
        <button type="button" aria-pressed={section==='words'} onClick={()=>{setSection('words');setMessage(undefined)}}>Tarjetas de palabras</button>
        <button type="button" aria-pressed={section==='scenes'} onClick={()=>{setSection('scenes');setMessage(undefined)}}>Escenas y frases</button>
        <button type="button" aria-pressed={section==='rules'} onClick={()=>{setSection('rules');setMessage(undefined)}}>Compatibilidades</button>
      </nav>
      <section className="resource-tab-panel" hidden={section!=='words'} aria-label="Tarjetas de palabras">
      {editorOpen && (
        <ContentEditor
          key={editorRecord?.id ?? 'new'}
          record={editorRecord}
          allPictograms={allPictograms}
          context={context}
          onCancel={closeEditor}
          onSaved={async () => {
            await onChanged()
            closeEditor()
            setMessage(editorRecord ? 'Contenido actualizado.' : 'Contenido añadido al banco.')
          }}
        />
      )}

      <section className="local-content-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Editables</span>
            <h2>Contenidos añadidos por ti</h2>
          </div>
        </div>
        {localRecords.length === 0 ? (
          <div className="empty-state">
            <h3>El banco local está vacío</h3>
            <p>Añade un PNG y su MP3 para incorporarlos a las actividades compatibles.</p>
          </div>
        ) : (
          <div className="local-content-grid">
            {localRecords.map((record) => (
              <LocalContentCard
                key={record.id}
                record={record}
                onEdit={() => { setEditorRecord(record); setEditorOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                onDelete={() => void handleDelete(record)}
              />
            ))}
          </div>
        )}
      </section>
      </section>
      <section className="resource-tab-panel" hidden={section!=='scenes'}><ScenePanel key={`scenes-${importRevision}`} scenes={localScenes} pictograms={pictograms} rules={compatibility} context={context} onChanged={onChanged}/></section>
      <section className="resource-tab-panel" hidden={section!=='rules'}><CompatibilityPanel key={`rules-${importRevision}`} pictograms={pictograms} rules={compatibility} localRules={localRules} context={context} onChanged={onChanged}/></section>
    </main>
  )
}
