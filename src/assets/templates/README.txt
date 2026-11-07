PLANTILLAS DE PROYECTO  (Archivo → Nuevo desde plantilla…)
===========================================================

Cada archivo «.cfast» de esta carpeta es una plantilla. Aparecen solas en el diálogo
«Nuevo desde plantilla». Reinicia «npm run dev» (o compila de nuevo) tras añadirlas.

  * Una plantilla es un proyecto normal: crea el tuyo en Comic Fast (tamaño de página,
    página de estilo, páginas con viñetas, exclusiones de estilo/numeración, parámetros
    globales…), guárdalo con «Guardar como…» y copia el .cfast aquí.
  * Al usarla se abre como proyecto SIN GUARDAR: «Guardar» pedirá un nombre y no toca
    la plantilla.
  * Mejor sin imágenes: pesan en la aplicación y la vista previa no las muestra.

NOMBRES EN VARIOS IDIOMAS (opcional) — «names.json»:

  { "items": { "comic": { "es": "Cómic", "en": "Comic" } } }

  La clave es el nombre del archivo sin extensión. Si falta el idioma se usa el inglés
  y, si tampoco está, el nombre del archivo.

Las incluidas (comic, storyboard, manhwa) se generaron con un script a partir de las
funciones del propio código; son solo esqueletos para empezar. Sus textos de ejemplo
están en español.
