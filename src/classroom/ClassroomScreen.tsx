import type { PupilDisplay } from './classroomRuntime'
import { useEffect, useState, type FormEvent } from 'react'
import type { ClassroomMode, Pupil } from './classroomRepository'
import { exportClassroom, importClassroom, normalizeInitial, normalizeName, readClassroom, removePupil, savePupil, setClassroomMode, setPupilDisplay } from './classroomRepository'

function PupilCard({ pupil, display }: { pupil: Pupil; display: PupilDisplay }) {
  const [imageUrl, setImageUrl] = useState<string>()
  useEffect(() => {
    if (!pupil.photo) { setImageUrl(undefined); return }
    const url = URL.createObjectURL(pupil.photo)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pupil.photo])
  return <div className="classroom-pupil-card">
    {display !== 'name' && imageUrl && <img src={imageUrl} alt="" className="classroom-photo" />}
    {(display !== 'photo' || !imageUrl) && <div className="classroom-name-line">
      <span className="classroom-name-box">{pupil.name}</span>
      {pupil.surnameInitial && <span className="classroom-initial">{pupil.surnameInitial}.</span>}
    </div>}
  </div>
}

export function ClassroomScreen({ onBack }: { onBack: () => void }) {
  const [pupils, setPupils] = useState<Pupil[]>([])
  const [mode, setMode] = useState<ClassroomMode>('rosetta')
  const [display, setDisplay] = useState<PupilDisplay>('both')
  const [name, setName] = useState('')
  const [initial, setInitial] = useState('')
  const [photo, setPhoto] = useState<File>()
  const [nameAudio, setNameAudio] = useState<File>()
  const [editing, setEditing] = useState<Pupil>()
  const [message, setMessage] = useState('')
  const reload = async () => {
    const state = await readClassroom()
    setPupils(state.pupils)
    setMode(state.mode)
    setDisplay(state.display)
  }
  useEffect(() => { void reload().catch(() => setMessage('No se pudo abrir el almacenamiento local del navegador.')) }, [])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    if (photo && (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 4 * 1024 * 1024)) {
      setMessage('La fotografía debe ser JPG, PNG o WebP y ocupar menos de 4 MB.')
      return
    }
    if (nameAudio && (!['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm'].includes(nameAudio.type) || nameAudio.size > 6 * 1024 * 1024)) {
      setMessage('La grabación debe ser MP3, WAV, OGG o WebM y ocupar menos de 6 MB.')
      return
    }
    try {
      await savePupil({ id: editing?.id ?? crypto.randomUUID(), name: normalizeName(name), surnameInitial: normalizeInitial(initial) || undefined, photo: photo ?? editing?.photo, nameAudio: nameAudio ?? editing?.nameAudio })
      setName(''); setInitial(''); setPhoto(undefined); setNameAudio(undefined); setEditing(undefined)
      const input = document.getElementById('classroom-photo-input') as HTMLInputElement | null
      if (input) input.value = ''
      const audioInput = document.getElementById('classroom-audio-input') as HTMLInputElement | null
      if (audioInput) audioInput.value = ''
      setMessage('Guardado únicamente en este navegador.')
      await reload()
    } catch { setMessage('No se pudo guardar el alumno en este dispositivo.') }
  }

  const startEdit = (pupil: Pupil) => { setEditing(pupil); setName(pupil.name); setInitial(pupil.surnameInitial ?? ''); setPhoto(undefined); setNameAudio(undefined) }
  const downloadBackup = async () => {
    try {
      const json = await exportClassroom()
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url; link.download = 'copia-privada-mi-clase.json'; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 3000)
      setMessage('Copia guardada en tus descargas. Contiene datos personales: consérvala en un lugar seguro.')
    } catch { setMessage('No se pudo exportar la copia local.') }
  }

  return <main className="screen classroom-screen">
    <header className="classroom-header"><h1>Mi clase</h1><button className="button" type="button" onClick={onBack}>Volver a Rosetta Digital</button></header>
    <p>Los nombres y las fotografías se guardan en este navegador, no en GitHub ni Netlify. No los introduzcas en el repositorio ni en archivos públicos.</p>
    <div className="classroom-toolbar">
      <label htmlFor="classroom-mode">Personajes de las actividades</label>
      <select id="classroom-mode" value={mode} onChange={async (event) => {
        const next = event.target.value as ClassroomMode
        try { await setClassroomMode(next); setMode(next) } catch { setMessage('No se pudo cambiar el modo.') }
      }}>
        <option value="rosetta">Familia Rosetta</option>
        <option value="class">Mi clase</option>
      </select>
      {mode === 'class' && <label htmlFor="classroom-display">Mostrar alumnos
        <select id="classroom-display" value={display} onChange={async (event) => {
          const next = event.target.value as PupilDisplay
          try { await setPupilDisplay(next); setDisplay(next) } catch { setMessage('No se pudo guardar la presentación.') }
        }}>
          <option value="photo">Solo fotografía</option>
          <option value="name">Solo nombre</option>
          <option value="both">Fotografía y nombre</option>
        </select>
      </label>}
    </div>
    {mode === 'class' && display === 'photo' && pupils.some((p) => !p.photo) && <p className="notice">Los alumnos sin fotografía no aparecerán en el modo «Solo fotografía».</p>}
    <section className="classroom-editor">
      <h2>{editing ? 'Editar alumno' : 'Añadir alumno'}</h2>
      <form onSubmit={(event) => void save(event)} className="classroom-form">
        <label>Nombre <input required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre" /></label>
        <label>Inicial del apellido (opcional) <input maxLength={2} value={initial} onChange={(event) => setInitial(event.target.value)} placeholder="Ej. M" /></label>
        <label>Fotografía (opcional) <input id="classroom-photo-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setPhoto(event.target.files?.[0])} /></label>
        <label>Grabación del nombre (opcional, para juegos de escucha) <input id="classroom-audio-input" type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/webm" onChange={(event) => setNameAudio(event.target.files?.[0])} /></label>
        <div className="button-row"><button type="submit" className="button button--primary">Guardar alumno</button>{editing && <button type="button" className="button" onClick={() => { setEditing(undefined); setName(''); setInitial(''); setPhoto(undefined); setNameAudio(undefined) }}>Cancelar edición</button>}</div>
      </form>
    </section>
    <section className="classroom-students">
      <h2>Alumnos ({pupils.length})</h2>
      <div className="classroom-grid">{pupils.map((pupil) => <div key={pupil.id} className="classroom-student">
        <PupilCard pupil={pupil} display={display} />
        <div className="button-row"><button className="button" type="button" onClick={() => startEdit(pupil)}>Editar</button><button className="button" type="button" onClick={async () => {
          if (!window.confirm('¿Eliminar este alumno de este dispositivo?')) return
          await removePupil(pupil.id); await reload()
        }}>Eliminar</button></div>
      </div>)}</div>
    </section>
    <section className="classroom-backups">
      <h2>Copias locales</h2>
      <p>Una copia exportada contiene los nombres y las fotografías. No la compartas públicamente. Importar sustituye los alumnos actuales.</p>
      <div className="button-row">
        <button className="button" type="button" onClick={() => void downloadBackup()}>Exportar copia al ordenador</button>
        <label className="button">Importar copia <input type="file" accept="application/json,.json" onChange={async (event) => {
          const file = event.target.files?.[0]
          if (!file) return
          if (!window.confirm('¿Sustituir los alumnos guardados en este dispositivo por los de la copia?')) return
          try { if (file.size > 8 * 1024 * 1024) throw new Error('Archivo demasiado grande'); await importClassroom(await file.text()); await reload(); setMessage('Copia importada en este dispositivo.') }
          catch { setMessage('No se pudo importar esta copia.') }
          event.target.value = ''
        }} /></label>
      </div>
    </section>
    <p role="status">{message}</p>
    <p className="classroom-privacy-note">La información pertenece a este navegador y perfil. Puede perderse si se borran los datos del sitio o se restablece la pizarra. No hay sincronización automática. Utiliza un perfil protegido y comprueba los permisos del centro para fotografías de menores.</p>
  </main>
}
