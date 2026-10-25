import { access, readFile, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const projectRoot = process.cwd()
const publicRoot = path.join(projectRoot, 'public')
const contentRoot = path.join(publicRoot, 'content')
const assetsRoot = path.join(publicRoot, 'assets')

const readJson = async (fileName) => JSON.parse(
  await readFile(path.join(contentRoot, fileName), 'utf8'),
)

const [mainContent, constructionContent, sentenceCatalog, rosettaSequence, activities] = await Promise.all([
  readJson('pictograms.json'),
  readJson('construction-content.json'),
  readJson('sentences.json'),
  readJson('rosetta-sequence.json'),
  readJson('activities.json'),
])

const pictograms = [...mainContent.pictograms, ...constructionContent.pictograms]
const audio = [...mainContent.audio, ...constructionContent.audio]
const errors = []
const warnings = []

const duplicates = (items) => {
  const seen = new Set()
  const repeated = new Set()
  for (const item of items) {
    if (seen.has(item.id)) repeated.add(item.id)
    seen.add(item.id)
  }
  return [...repeated]
}

for (const id of duplicates(pictograms)) errors.push(`ID de pictograma duplicado: ${id}`)
for (const id of duplicates(audio)) errors.push(`ID de audio duplicado: ${id}`)
for (const id of duplicates(sentenceCatalog.sentences)) errors.push(`ID de frase duplicado: ${id}`)
for (const id of duplicates(activities.activities)) errors.push(`ID de actividad duplicado: ${id}`)

const pictogramIds = new Set(pictograms.map(({ id }) => id))
const audioIds = new Set(audio.map(({ id }) => id))
const unitIds = new Set(rosettaSequence.units.map(({ id }) => id))

for (const pictogram of pictograms) {
  if (!pictogram.label?.trim()) errors.push(`Pictograma sin nombre: ${pictogram.id}`)
  if (!Array.isArray(pictogram.categories) || pictogram.categories.length === 0) {
    errors.push(`Pictograma sin categorías: ${pictogram.id}`)
  }
  if (!unitIds.has(pictogram.availableFromUnit)) {
    errors.push(`Unidad inexistente en ${pictogram.id}: ${pictogram.availableFromUnit}`)
  }
  for (const audioId of pictogram.audioIds ?? []) {
    if (!audioIds.has(audioId)) errors.push(`Audio no definido en ${pictogram.id}: ${audioId}`)
  }
}

for (const sentence of sentenceCatalog.sentences) {
  const referenced = [sentence.subjectId, sentence.actionId, ...(sentence.complementIds ?? [])]
  for (const id of referenced) {
    if (!pictogramIds.has(id)) errors.push(`La frase ${sentence.id} referencia un pictograma inexistente: ${id}`)
  }
  if (sentence.audioId && !audioIds.has(sentence.audioId)) {
    warnings.push(`La frase ${sentence.id} no tiene un audio completo definido: ${sentence.audioId}`)
  }
}

for (const compatibility of sentenceCatalog.actionCompatibility) {
  if (!pictogramIds.has(compatibility.actionId)) {
    errors.push(`Compatibilidad para acción inexistente: ${compatibility.actionId}`)
  }
  for (const id of compatibility.allowedSubjectIds ?? []) {
    if (!pictogramIds.has(id)) errors.push(`Sujeto compatible inexistente en ${compatibility.actionId}: ${id}`)
  }
  for (const id of compatibility.allowedComplementIds ?? []) {
    if (!pictogramIds.has(id)) errors.push(`Complemento compatible inexistente en ${compatibility.actionId}: ${id}`)
  }
}

const assetReferences = [
  ...pictograms.map(({ id, image }) => ({ owner: `pictograma ${id}`, file: image, kind: 'PNG' })),
  ...audio.map(({ id, file }) => ({ owner: `audio ${id}`, file, kind: 'MP3' })),
  ...sentenceCatalog.sentences
    .filter(({ sceneImage }) => Boolean(sceneImage))
    .map(({ id, sceneImage }) => ({ owner: `escena ${id}`, file: sceneImage, kind: 'PNG' })),
]

for (const reference of assetReferences) {
  const absolutePath = path.resolve(assetsRoot, reference.file)
  if (!absolutePath.startsWith(`${assetsRoot}${path.sep}`)) {
    errors.push(`Ruta fuera de assets en ${reference.owner}: ${reference.file}`)
    continue
  }
  try {
    await access(absolutePath, constants.R_OK)
    const fileStat = await stat(absolutePath)
    if (reference.kind === 'MP3' && fileStat.size < 3_000) {
      warnings.push(`Audio muy pequeño; conviene escucharlo (${fileStat.size} bytes): ${reference.file}`)
    }
  } catch {
    warnings.push(`${reference.kind} ausente para ${reference.owner}: public/assets/${reference.file}`)
  }
}

console.log(`Banco: ${pictograms.length} pictogramas, ${audio.length} audios, ${sentenceCatalog.sentences.length} escenas/frases base.`)
if (warnings.length > 0) {
  console.log(`\nAvisos (${warnings.length}):`)
  warnings.forEach((warning) => console.log(`- ${warning}`))
}
if (errors.length > 0) {
  console.error(`\nErrores (${errors.length}):`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log('\nValidación estructural correcta: no hay errores bloqueantes.')
}
