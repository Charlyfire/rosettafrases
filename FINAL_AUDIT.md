# Revisión final de Rosetta Digital

Revisión realizada sobre la aplicación compilada, con viewport PDI de 1280 × 720,
validación del banco central y pruebas automatizadas.

## Actividades

| Bloque | Actividad | Estado comprobado |
|---|---|---|
| Presentar | Bits | Configuración común por contenido; selección de vocales; 5, 6 o todas; orden; avance; duración; audio; nombre y vocal de referencia; controles estables. |
| Reconocer | Escucha y encuentra | Categoría; 2, 3, 4 o 6 opciones; unidad; distractores; audio; segundo intento; palabras visibles u ocultas. |
| Reconocer | Sonido inicial | Las cuatro variantes comparten motor; progresión U5–U10; vocales seleccionables; consignas aportadas; visto/cruz; feedback de error y avance automático. |
| Reconocer | Busca otra que empiece igual | Modelo, opciones, una o varias vocales, apoyo visual opcional y segundo intento. |
| Reconocer | Intruso | Vocales objetivo, 3, 4 o 6 opciones, dos niveles de apoyo, segundo intento y feedback positivo. |
| Construir | Dictado secuenciado | Sujeto, acción conjugada, complemento opcional, `y` y punto interactivos; audio por selección y lectura compacta. |
| Construir | Clasificar por vocal | Mínimo de dos vocales, 4, 6 u 8 imágenes, arrastre y alternativa por toque, consigna inicial aportada. |
| Construir | Construye tu oración | Cinco estructuras; banco completo en dos o tres filas; compatibilidades; audio por selección; `y` y punto colocados por el alumno. |
| Construir | Dictado completo | Estructuras simples y las dos coordinadas; MP3 completo prioritario; dictado oral docente cuando no existe; no sintetiza ni concatena una frase inexistente. |
| Construir | Ordenar frase | Piezas correctas desordenadas, toque y arrastre, opciones compactas y botón de lectura al finalizar. |
| Construir | Frase a partir de imagen | Solo utiliza escenas y piezas registradas; muestra escena, plancha y distractores compatibles. |

## Requisitos transversales comprobados

- Fuente `Escolar2` incorporada a la aplicación y precargada offline.
- Control para mostrar u ocultar palabras en todas las actividades.
- Todos los pictogramas seleccionados en actividades de oración reproducen su MP3.
- Todas las estructuras de oración incluyen el pictograma de punto; `y` y punto son
  elecciones del alumno cuando corresponden.
- La lectura completa añade el audio de punto incluso cuando utiliza un MP3 de frase.
- Celebración común de acierto, sin bloquear la interacción y respetando
  `prefers-reduced-motion`.
- Ninguna pantalla de juego revisada genera scroll a 1280 × 720.
- Recursos locales, sin síntesis de voz ni dependencia de servicios online.

## Contenido pendiente para cuatro escenas

El PNG de escena y el MP3 completo existen, pero faltan las siguientes piezas
individuales. No se han sustituido por otras palabras porque cambiaría el contenido
educativo aportado.

- `Mamá come piña`: pictograma y audio individual de **piña**.
- `Mamá lee un libro`: pictograma y audio individual de **un libro**.
- `Papá cocina espaguetis`: decidir si el pictograma singular existente puede
  reutilizarse con la forma **espaguetis**, o aportar el pictograma plural.
- `Poncho juega a la pelota`: pictograma y audio individual de **pelota**.

Las otras siete escenas están completamente registradas y utilizables.
