# Arquitectura de Rosetta Digital

## Criterios

La aplicación es un único producto con un banco de contenidos común y módulos de
actividad independientes. Los módulos no conocen listas de vocabulario: reciben
una selección de pictogramas preparada por selectores del dominio.

La progresión se interpreta de forma acumulativa: un contenido con
`availableFromUnit: 6` puede utilizarse en las unidades 6 a 10. El archivo de
secuencia determina además qué vocales están habilitadas en cada unidad.

## Estructura

```text
public/
  assets/
    images/                 PNG proporcionados
    audio/
      words/                MP3 de palabras proporcionados
  content/
    pictograms.json         pictogramas y catálogo de audios
    construction-content.json  recursos lingüísticos para Construir
    activities.json         registro de módulos y disponibilidad
    rosetta-sequence.json   progresión por unidad
    sentences.json          frases cerradas y compatibilidades
src/
  app/                      navegación raíz y estilos globales
  components/               controles táctiles comunes
  content/                  repositorio, resolución y selectores del banco
  domain/                   contratos TypeScript del dominio educativo
  games/
    bits/                   módulo Presentar: Bits
    recognition/            motor y pantallas comunes de Reconocer
    dictation/               módulo Construir: Dictado secuenciado
    sentence-builder/        módulo Construir: elección libre compatible
    vowel-sort/              módulo Construir: clasificación fonológica
    sentence-games/          motor común: dictado completo, orden y escena
```

Al añadir los siguientes módulos, cada uno tendrá su carpeta bajo `src/games` y
consumirá los mismos tipos, repositorio y componentes compartidos. Las frases y
compatibilidades se incorporarán como datos centrales, no como lógica dentro de
un juego.

## Modelos

- `Pictogram`: identidad única, rótulo, PNG, audios asociados, categorías
  múltiples, etiquetas, sonido inicial, unidad mínima y metadatos gramaticales.
- `AudioResource`: identidad, tipo, ruta reemplazable y transcripción opcional de
  control. El texto no se usa para sintetizar voz.
- `ActivityDefinition`: registro del módulo, fase Presentar/Reconocer/Construir,
  estado habilitado y unidad mínima.
- `RosettaUnit`: foco de la unidad y sonidos iniciales disponibles.
- `SentenceDefinition`: referencias por ID a sujeto, acción y complementos; escena
  y audio opcionales. No duplica pictogramas.
- `ActionCompatibility`: lista explícita de complementos y, si hace falta, sujetos
  compatibles para impedir combinaciones absurdas.

Las interfaces completas están en `src/domain`. El campo `grammatical.displayForm`
permite conservar un PNG llamado por el infinitivo y mostrar o usar la forma
conjugada sin duplicar la acción.

## Carga de PNG y MP3

El navegador no puede enumerar carpetas de forma portable. Por ello, el JSON es el
manifiesto explícito y verificable: cada pictograma contiene la ruta de su imagen y
referencias por ID a sus audios. `contentRepository.ts` carga los JSON al inicio y
resuelve las rutas bajo `/assets`.

Sustituir un archivo manteniendo el mismo nombre no exige tocar código ni JSON.
Añadir un contenido nuevo exige añadir su entrada al JSON, lo cual evita aceptar
por accidente un archivo mal nombrado. `npm run validate:content` compara el banco,
sus relaciones y los archivos locales para señalar recursos ausentes o sospechosos.

## Navegación

```text
Inicio docente (Presentar / Reconocer / Construir)
  → Configuración de Bits
    → Presentación táctil sin scroll
      → Fin / repetir
      → Volver a configuración
  → Configuración de Escucha y encuentra
    → Rondas de selección táctil por audio
      → Fin / repetir
  → Configuración de Sonido inicial
    → Rondas de selección por vocal inicial
      → Fin / repetir
  → Configuración de Busca otra que empiece igual
    → Palabra modelo → selección de otra con el mismo sonido
      → Fin / repetir
  → Configuración de Intruso
    → Grupo con sonido común → localizar el diferente
      → Fin / repetir
  → Configuración de Dictado secuenciado
    → Personaje → acción → uno o dos complementos → punto final
      → Escena y audio de frase completa
      → Siguiente frase / fin
  → Configuración de Construye tu oración
    → Sujeto → acción compatible → cláusulas y complementos según la estructura → punto final
      → Escuchar frase / crear otra
  → Configuración de Clasificar por vocal
    → Seleccionar o arrastrar pictograma → zona de vocal
      → Fin / repetir
  → Dictado completo / Ordenar frase / Construir desde escena
    → Plancha común → selección o arrastre ordenado → punto final
      → Siguiente frase / fin
```

## Motor de Construir

El Dictado secuenciado consume únicamente `sentences.json`. Cada paso ofrece el
elemento correcto y distractores del mismo rol gramatical, sin duplicados. Las
frases pueden tener dos elementos —sujeto y acción—, incorporar un complemento o
coordinar dos complementos mediante «y». Todas las modalidades añaden el
pictograma de punto final y su audio.
La conjunción y el punto son pasos interactivos: el alumno debe seleccionarlos y
colocarlos igual que los demás elementos de la oración.
Las acciones reutilizan el PNG nombrado en infinitivo, pero el rótulo y el audio
corresponden a la tercera persona del singular.

`SentenceStructureBoard` reproduce la plancha metodológica con una marca roja de
inicio, una marca verde de final y una guía horizontal. Se comparte entre Dictado
secuenciado y Construye tu oración para evitar diferencias visuales entre juegos.
El constructor puede mostrar el banco completo en dos o tres filas. Las opciones
que no figuran en la compatibilidad de la acción se ven y pueden escucharse, pero
no se colocan en la plancha.

Al completar la frase se presenta exclusivamente su escena y audio asociados. El
sistema de compatibilidades queda centralizado para futuros constructores de frase;
en este módulo no se crean combinaciones, por lo que no pueden aparecer resultados
absurdos.

`sentenceGenerator.ts` expande el catálogo combinando sujetos con las reglas de
`actionCompatibility`. Conserva primero las frases explícitas —con sus escenas y
audios completos— y elimina cualquier equivalente generado. Las frases nuevas sin
grabación completa reproducen secuencialmente los MP3 de sus componentes; nunca se
usa síntesis de voz.

## Motor de Reconocer

Los módulos comparten generadores de rondas, cuadrícula táctil, reproducción de
audio y feedback. Cada ronda contiene una única respuesta correcta y opciones sin
duplicados. En orden fijo la posición correcta rota; en aleatorio se barajan tanto
contenidos como posiciones.

En Sonido inicial no se muestran palabras escritas bajo los pictogramas, porque a
estas edades podrían convertir una tarea fonológica en una discriminación visual
de letras. La vocal objetivo se presenta con el PNG proporcionado (`letra a.png`,
etc.). Los fallos reciben una indicación oral amable, sin texto negativo ni cruces
sobre el pictograma; tras el segundo intento se repite la consigna. «¿Por qué
empieza?» reproduce primero «Escucha cómo empieza», y «¿Empiezan igual?» utiliza
la consigna grabada y botones visuales de visto y cruz en lugar de texto.

`vowel-sort` reutiliza esos metadatos fonológicos. Su motor equilibra las imágenes
entre las vocales activas y admite tanto arrastre como selección por toque seguida
de toque en el destino.

`VowelMultiSelect` centraliza la elección de una o varias vocales en los módulos
fonológicos. Nunca habilita sonidos que no figuren en la unidad Rosetta elegida.

`sentence-games` genera las opciones desde `SentenceDefinition` y los roles del
banco. Dictado completo prioriza entradas con audio de frase y no fabrica una
frase sonora concatenando palabras. Ordenar frase contiene solo las piezas
correctas, inicialmente desordenadas. El modo de escena filtra estrictamente las
frases que disponen de `sceneImage`.

`useAudioPlayer` ofrece reproducción individual, secuencial y secuencial compacta.
Esta última adelanta la transición dentro del silencio final de cada MP3 para que
la lectura construida resulte natural sin modificar la velocidad de la grabación.
`ConfettiBurst` concentra la celebración visual de los aciertos y respeta
`prefers-reduced-motion`; los motores no implementan efectos propios duplicados.

## Funcionamiento offline

`vite-plugin-pwa` genera el service worker durante `npm run build`. Precarga la
aplicación, los JSON y los PNG/MP3 presentes en `public/assets` en el momento de la
compilación. Para una prueba offline fiable hay que usar `npm run build` seguido de
`npm run preview`; el modo de desarrollo no representa el comportamiento final de
caché. Cada cambio de contenido requiere una nueva compilación para actualizar la
precaché del dispositivo.

## Banco local del docente

El modo docente permite añadir un PNG y un MP3 junto con su nombre, categorías,
sonido inicial y unidad mínima. Estos registros se guardan como blobs en IndexedDB
y se fusionan en memoria con `pictograms.json`; los juegos siguen consumiendo un
único `ContentBank` y no necesitan saber dónde se originó cada contenido.

Los contenidos incluidos llevan `source: bundled` y son de solo lectura. Los
añadidos llevan `source: local` y pueden editarse o eliminarse. Una copia exportada
contiene metadatos y archivos codificados en un JSON con versión de esquema, que
puede importarse en otra PDI. No existe sincronización entre dispositivos: borrar
los datos del navegador elimina el banco local si antes no se ha exportado.

## Riesgos y decisiones pendientes

1. La progresión fonológica por unidad se ha interpretado como acumulativa.
   Conviene confirmar este criterio antes de ampliar esas actividades.
2. `espagueti` aparece en el banco de vocal E y `espaguetis` en una frase. No se han
   unificado porque son contenidos lingüísticos distintos hasta que se confirme
   qué PNG y audio corresponden a cada forma.
3. `Mamá come piña`, `Mamá lee un libro` y `Poncho juega a la pelota` contienen
   elementos que no figuran todavía en los bancos aportados. Se conservarán como
   escenas completas, pero no deben descomponerse en pictogramas sin los recursos y
   datos correspondientes.
4. El autoplay de audio en navegador solo es fiable después de una interacción del
   usuario. El botón «Iniciar presentación» proporciona esa interacción; aun así,
   debe probarse en el Chrome/Edge concreto de la PDI.
5. Los controles del modo docente pueden necesitar scroll en pantallas pequeñas;
   las pantallas de actividad no tienen scroll. Esto separa deliberadamente
   configuración adulta y uso infantil.
6. No se ha asignado una progresión por unidades a las frases porque todavía no se
   ha proporcionado. El catálogo conserva `availableFromUnit` para aplicarla cuando
   se defina la secuencia pedagógica correspondiente.
7. La copia de `huevo frito.mp3` incluida en el proyecto ya se ha sustituido por
   una grabación reproducible. El archivo original de la carpeta de materiales
   continúa dañado y no debe copiarse de nuevo sobre la versión del proyecto.
8. Existen PNG y MP3 de cuatro escenas adicionales —Mamá come piña, Mamá lee un
   libro, Papá cocina espaguetis y Poncho juega a la pelota—, pero faltan los
   pictogramas individuales de `piña`, `libro`, `pelota` y una forma confirmada de
   `espaguetis`. No se incorporan al constructor de escena hasta poder descomponerlas
   sin inventar ni sustituir vocabulario.
