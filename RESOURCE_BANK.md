# Banco local de recursos

El banco se utiliza desde el navegador donde está abierta Rosetta. No necesita una
cuenta ni subir los archivos a Netlify. Los contenidos no se sincronizan solos:
usa Exportar copia e Importar copia para otro ordenador, perfil o navegador.

## 1. Tarjetas de palabras

Abre Banco de contenidos → Tarjetas de palabras → Añadir contenido. Cada tarjeta
necesita nombre, PNG, MP3 y al menos una categoría. Elige la unidad y, si procede,
la vocal inicial para las actividades fonológicas.

Para un personaje que formará oraciones, marca Sujeto; también Personaje si quieres
usarlo en los grupos de personajes. Para un alimento que se añadirá a una oración,
marca Alimento y Complemento. Para un verbo marca Acción. Puedes añadir su forma
plural escrita y un MP3 plural; sin esa forma no se ofrece un verbo nuevo con dos
sujetos. Las tarjetas nuevas se pueden editar y eliminar desde su tarjeta.

Las tarjetas incluidas siguen en el banco general de la aplicación. Esta pantalla
edita las tarjetas locales añadidas por el docente, no los archivos de GitHub.

## 2. Compatibilidades de verbos

Selecciona un verbo en Compatibilidades. Marca sus complementos válidos y si admite
frases sin complemento. Por defecto se permiten todos los sujetos, incluidos los
que añadas más adelante; puedes limitar esa selección.

Las relaciones incluidas se conservan como base. Cambiarlas crea una configuración
local. Restaurar configuración incluida recupera esa base. Para un verbo nuevo,
Eliminar configuración local lo deja sin configurar hasta que vuelvas a guardarlo.
No se permite eliminar una tarjeta o relación si deja escenas locales inválidas.

## 3. Escenas con frases y audios

En Escenas y frases elige Añadir escena. Define:

- Nombre de la escena e imagen PNG.
- Uno o dos sujetos que comparten verbo en cada frase.
- De cero a tres complementos por verbo.
- Una o dos frases enlazadas, con igual número de sujetos y complementos en ambas.
- Las tarjetas exactas de cada posición, compatibles con el verbo elegido.
- MP3 de toda la oración, si lo tienes, y unidad de disponibilidad.

La vista previa muestra el texto con comas, «y» y punto. Comprueba que la imagen y
la grabación representan esa misma oración. Si el verbo no está configurado,
puedes ir a Compatibilidades y volver: el formulario de escena conserva el borrador.

Las escenas locales tienen prioridad en el juego de escenas para la estructura
seleccionada. También se aprovechan en dictados y ordenar frase con sus piezas y,
cuando existe, su audio completo. Las escenas compuestas conservan exactamente los
sujetos y las frases elegidos; no se añaden personajes a una escena incluida.

## Copias y recuperación

Exportar copia descarga un JSON que incluye todos los archivos locales, las escenas
y las compatibilidades. No incluye otra copia de los recursos que ya vienen con
Rosetta. Guarda el archivo fuera del navegador.

Importar copia valida el contenido y todas las referencias antes de guardarlo. Las
coincidencias requieren confirmación; los recursos no incluidos se conservan.
Un error de validación deja el banco como estaba. Se admiten las copias antiguas
con solo tarjetas, y la actualización del almacenamiento conserva esas tarjetas.

El formato actual es la versión 2. Los cambios locales se aplican a los juegos en
el mismo navegador después de guardar. No provocan despliegues de Netlify.
