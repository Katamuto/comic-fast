CARPETA DE IMÁGENES INCLUIDAS EN COMIC FAST
===========================================

Todo lo que pongas aquí aparece solo en la pestaña «Incluidas» del panel de
recursos. No hay que escribir código ni registrar nada: guarda los archivos y
reinicia «npm run dev» (o vuelve a compilar).

ESTRUCTURA
  resources/<Categoría>/archivo.png
  resources/<Categoría>/<Subcategoría>/archivo.png

  Ejemplo:
    resources/01-Paisajes/Exteriores/montaña.png
    resources/01-Paisajes/Interiores/sala.png
    resources/02-Vehículos/Por fuera/auto-rojo.png
    resources/03-VFX/Explosiones/boom-1.png
    resources/04-Siluetas/gato.tint.svg

  * Las categorías y subcategorías son desplegables en la app.
  * Un número y guion delante («01-», «02-») solo sirve para ORDENAR y no se muestra.
  * Los guiones y guiones bajos del nombre se muestran como espacios.
  * Los archivos que están sueltos en esta carpeta (fuera de una categoría) se ignoran.

FORMATOS: png, webp, jpg, gif, avif, svg.
  * VFX y recortes: PNG o WebP con fondo transparente.
  * Siluetas y formas: SVG con viewBox (es lo más liviano y escala sin perder calidad).
  * Para que se vean nítidas al ampliar, un PNG de 1000–2000 px por lado suele bastar.
    Cuantas más imágenes y más pesadas, más pesa la aplicación: optimízalas (squoosh.app).

SILUETAS QUE SE PUEDEN RECOLOREAR
  Agrega «.tint» antes de la extensión:  gato.tint.svg  /  rayo.tint.png
  Esas imágenes entran con el filtro «Teñir de un color» ya activado; el color se
  cambia en el Inspector (Filtros de imagen → Teñir). Funciona con CUALQUIER imagen con
  transparencia: «.tint» solo hace que arranque teñida. La carpeta «Ejemplos» trae algunas.

La carpeta «Ejemplos» es solo de muestra: bórrala cuando quieras.


NOMBRES EN VARIOS IDIOMAS (opcional)
  Por defecto las categorías y subcategorías se ven con el nombre de su carpeta. Para traducirlas,
  pon un archivo «names.json» DENTRO de esa carpeta:

    resources/01-Paisajes/names.json
    {
      "name": { "es": "Paisajes", "en": "Landscapes", "ja": "風景" },
      "items": {
        "montaña": { "es": "Montaña", "en": "Mountain", "ja": "山" }
      }
    }

  * «name» = nombre de la carpeta; «items» = nombres de archivos (clave = nombre del archivo sin
    extensión ni «.tint»). Los dos son opcionales.
  * Idioma de la persona → si falta, su idioma base («pt-BR» → «pt») → inglés → nombre de la carpeta.
  * El buscador encuentra la imagen por cualquiera de sus nombres, en cualquier idioma.
  * Las subcarpetas tienen su propio names.json.
