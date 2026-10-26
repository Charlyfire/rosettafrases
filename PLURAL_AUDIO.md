# Grabaciones plurales incorporadas

Se conservan las grabaciones originales. No se usa síntesis de voz y nunca se
reproduce un verbo singular en una estructura con dos sujetos coordinados.
Se han incorporado y registrado las 15 grabaciones plurales siguientes:

| Singular | Grabación plural | ID de audio |
|---|---|---|
| barre | barren.mp3 | word-barren |
| besa | besan.mp3 | word-besan |
| bebe | beben.mp3 | word-beben |
| canta | cantan.mp3 | word-cantan |
| cocina | cocinan.mp3 | word-cocinan |
| come | comen.mp3 | word-comen |
| compra | compran.mp3 | word-compran |
| corre | corren.mp3 | word-corren |
| corta | cortan.mp3 | word-cortan |
| duerme | duermen.mp3 | word-duermen |
| juega | juegan.mp3 | word-juegan |
| lee | leen.mp3 | word-leen |
| nada | nadan.mp3 | word-nadan |
| patina | patinan.mp3 | word-patinan |
| pinta | pintan.mp3 | word-pintan |

Las grabaciones están en `public/assets/audio/words/` y cada una está registrada en el array `audio`
de `public/content/construction-content.json`. Por ejemplo:

```json
{
  "id": "word-beben",
  "kind": "word",
  "file": "audio/words/beben.mp3",
  "transcript": "beben"
}
```

No hay que duplicar las imágenes ni modificar React. El programa busca esos IDs
cuando la frase tiene dos sujetos. Ejecuta `npm run check` después de añadirlos.

Si una grabación se elimina o no está registrada, las tarjetas plurales muestran «Audio pendiente»;
el dictado secuenciado señala la palabra que debe leer el docente. La lectura
completa se desactiva si falta alguna palabra. Dictado completo sigue usando un
MP3 de la oración completa cuando lo hay y, en caso contrario, muestra la oración
al docente antes de ocultarla e iniciar la actividad. Añadir audios de palabras no
crea por sí solo un MP3 de una oración completa.

También se ha incorporado `empanadillas.mp3`. La tarjeta muestra «empanadillas»
y reproduce el nuevo audio; conserva su ID interno para mantener las compatibilidades.
