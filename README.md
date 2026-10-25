# Rosetta Digital

Aplicación educativa funcional. Están implementados **Bits**, **Escucha y
encuentra**, **Sonido inicial**, **Busca otra que empiece igual**, **Intruso**,
**Dictado secuenciado**, **Construye tu oración**, **Clasificar por vocal**,
**Dictado completo**, **Ordenar frase** y **Construir frase a partir de imagen**.

## Recursos que debes añadir

- PNG: `public/assets/images/`
- MP3 de palabras: `public/assets/audio/words/`

Los nombres requeridos están declarados en `public/content/pictograms.json`. Se
usan nombres de archivo sin tildes y en minúsculas; por ejemplo:

```text
public/assets/images/abeja.png
public/assets/images/ensaladilla-rusa.png
public/assets/audio/words/abeja.mp3
public/assets/audio/words/ensaladilla-rusa.mp3
```

Si tus archivos actuales tienen otros nombres, es válido cambiar la propiedad
`image` o `file` correspondiente en el JSON. No es necesario modificar React.

## Ejecutar

```bash
npm install
npm run dev
```

Vite mostrará la dirección local, normalmente `http://localhost:5173`.

Para probar la versión compilada y el modo offline:

```bash
npm run build
npm run preview
```

Abre la dirección indicada una vez con conexión, espera a que cargue y después
activa el modo sin conexión en las herramientas del navegador o desconecta la red.

## Comprobaciones

```bash
npm run validate:content
npm test
npm run build
```

También puedes ejecutar las tres comprobaciones seguidas:

```bash
npm run check
```

El validador revisa IDs duplicados, relaciones entre frases y pictogramas,
unidades, referencias de audio y la existencia de los PNG/MP3. Los recursos
ausentes se muestran como avisos para que el proyecto pueda seguir probándose
mientras se completa el banco.

Consulta `ARCHITECTURE.md` para el diseño del banco, los modelos, la navegación,
la estrategia offline y las decisiones pedagógicas pendientes.

## Añadir contenidos desde la aplicación

En la pantalla inicial, abre **Banco de contenidos**. Desde allí se puede añadir,
editar o eliminar contenido local y exportar/importar una copia de seguridad. Cada
entrada necesita un PNG, un MP3, un nombre, al menos una categoría y una unidad de
disponibilidad. Para que aparezca en Bits debe tener asignada una vocal inicial
compatible con la unidad seleccionada.

Los contenidos locales también aparecen automáticamente en Reconocer cuando su
unidad y sonido inicial son compatibles con la configuración elegida.

## Actividades de Reconocer

- **Escucha y encuentra** reproduce una palabra y ofrece entre 2 y 6 pictogramas.
- **Sonido inicial** comparte un único motor para cuatro variantes: «¿Por qué
  empieza?», «Busca las palabras», «¿Empiezan igual?» y «Escucha cómo empieza».
- **Busca otra que empiece igual** presenta una palabra modelo y pide localizar
  otra con el mismo sonido inicial. La unidad limita las vocales disponibles.
- **Intruso** presenta varias imágenes con un sonido inicial común y una única
  diferente. Puede mostrar u ocultar la vocal de apoyo.

Las actividades fonológicas permiten seleccionar una o varias vocales. La unidad
Rosetta sigue actuando como límite y desactiva las vocales todavía no trabajadas.

La configuración de las actividades permite mostrar u ocultar los nombres escritos.
En tareas de escucha o conciencia fonológica conviene ocultarlos para que la lectura
no revele la respuesta; el docente puede mostrarlos cuando ese apoyo sea pertinente.

## Actividad de Construir

**Dictado secuenciado** reproduce cada elemento de una frase por separado. El niño
selecciona primero el personaje, después la acción y, cuando existe, el complemento.
También coloca personalmente la conjunción **y** y el **punto final** cuando la
estructura los requiere; nunca aparecen ya resueltos en la plancha.
Al completar la estructura se muestra la escena proporcionada y puede repetirse el
audio de la frase completa.

La configuración permite escoger estructuras simples, dos complementos coordinados
y dos estructuras largas: una segunda acción con su complemento o una segunda
oración completa después de **y**. El punto final y la conjunción son pictogramas
propios. Al leer la oración se escucha la conjunción, pero nunca la palabra «punto».

Las actividades de oración utilizan una plancha común inspirada en el material
aportado: marca roja de inicio a la izquierda, marca verde de final a la derecha
y una guía horizontal. **Construye tu oración** se prepara con tres elecciones: sujetos dentro de cada
oración (1 o 2), complementos por sujeto (0 a 3) y frases de la sesión (1, 3, 5 o 10).
Con dos sujetos se construyen dos partes coordinadas, por ejemplo «Papá come arroz
y Mamá bebe agua». Los sujetos deben ser distintos. El alumno coloca también cada
«y» y el punto final.

La pantalla mantiene visibles los bancos de sujetos, acciones, complementos y
signos bajo una plancha de casillas con guía rosa. Los complementos se muestran en
páginas de 18 dibujos. Solo se pueden escoger piezas que permitan terminar la
estructura elegida; no se repite un complemento dentro de la misma parte. Se puede
reutilizar en la parte del segundo sujeto. Los pictogramas se incorporan mediante
toque o arrastre, sin reproducir su audio. Debajo de cada dibujo hay un botón
«Escuchar» independiente: lee la tarjeta sin colocarla ni avanzar la actividad. El control «Palabras» permite mostrar u
ocultar los nombres. Al completar la última frase se presenta el final de sesión,
con opciones de repetirla o volver al inicio.

La plancha superior muestra los dibujos ampliados y aprovecha el espacio de los
nombres cuando están ocultos. En el banco de complementos, **Ocultar complementos
incompatibles** está activado por defecto: primero se elige el verbo y después
se muestran únicamente sus complementos. Al desactivarlo se muestra todo el banco,
con las opciones incompatibles desactivadas. El filtro se actualiza al cambiar de
verbo o pasar al segundo sujeto, y vuelve a la primera página. Los verbos sin
complementos, como «corre», se trabajan eligiendo cero complementos en la configuración.

El botón **Escuchar frase** utiliza el audio completo cuando la combinación tiene
uno registrado. En las demás combinaciones reproduce los MP3 de las palabras con
una transición compacta que recorta parte del silencio final de cada archivo, sin
acelerar la voz, síntesis de voz ni servicios en línea.

Las frases válidas y sus compatibilidades están declaradas en
`public/content/sentences.json`. Los seis personajes disponen de PNG y MP3
individuales; los audios de las acciones y complementos también están enlazados.

El catálogo de Construir genera actualmente **14.004 estructuras compatibles** a
partir de los seis personajes, los quince verbos aportados y hasta dos complementos
distintos. Los 42 alimentos y los cuatro sustantivos adicionales de las carpetas
originales están incorporados al banco. `besa` se admite sin complemento, pero no
se inventan complementos de persona ni expresiones que requerirían una preposición
ausente, como «juega con…».

La interfaz utiliza la fuente escolar aportada `Escolar2`, incluida en
`public/assets/fonts/Escolar2.ttf` para que funcione también offline y sin depender
de las fuentes instaladas en Windows. Todas las actividades incluyen un control
docente para mostrar u ocultar las palabras escritas.

**Clasificar por vocal** utiliza el mismo banco y la progresión Rosetta. Permite
arrastrar cada pictograma a su zona o tocar primero el dibujo y después la vocal,
de modo que la actividad siga siendo manejable en una PDI con arrastre impreciso.
Al comenzar reproduce la consigna local «Coloca cada dibujo en su sitio».

**Dictado completo**, **Ordenar frase** y **Construir frase a partir de imagen**
comparten un motor de montaje sobre la misma plancha. Admiten toque y arrastre, y
el punto es siempre una pieza que debe colocar el alumno. Dictado completo usa el
MP3 de frase cuando existe; si falta, muestra «Dictado oral del docente» sin
concatenar los audios de las palabras. El juego de escenas solo utiliza entradas
con `sceneImage` registrado.

Cada ronda resuelta correctamente lanza una celebración de confeti desde ambos
laterales y la distribuye por toda la pantalla. El efecto no bloquea los controles
y se desactiva automáticamente cuando el sistema tiene activada la preferencia de
reducir movimiento.

La comprobación final actividad por actividad y los recursos todavía necesarios
para cuatro escenas se detallan en `FINAL_AUDIT.md`.
