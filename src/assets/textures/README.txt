TEXTURAS DE IMAGEN  (pestaña «Texturas»)
========================================

Pon aquí imágenes TILEABLES (que encajan al repetirse sin costuras): png, webp, jpg,
gif, avif o svg. Aparecen solas en la pestaña «Texturas», junto a las procedurales.
Reinicia «npm run dev» (o compila de nuevo) tras añadirlas.

  * Se repiten como mosaico DENTRO de su rectángulo (nunca se salen de él).
  * Solo tienen escala (y opacidad): su tamaño a escala 1 es el de la imagen en píxeles.
    Una de 512 px mide 512 unidades de página (la página de cómic mide ~1000 × 1500).
  * El nombre del archivo es el nombre que se ve («papel.png» → «Papel»; guiones y guiones
    bajos se muestran como espacios).
  * Pesan en la aplicación: optimízalas (squoosh.app). 256–512 px por lado suele bastar.

NOMBRES EN VARIOS IDIOMAS (opcional)
  Crea «names.json» en esta carpeta:

    {
      "items": {
        "papel": { "es": "Papel", "en": "Paper", "ja": "紙" }
      }
    }

  La clave («papel») es el nombre del archivo sin extensión. Si falta el idioma de la
  persona se usa el inglés y, si tampoco está, el nombre del archivo.

«papel.svg» es solo un ejemplo: bórralo cuando quieras.
