PUNTAS DE PINCEL  (editor de imágenes → pincel y borrador)
==========================================================

Cada imagen de esta carpeta es una PUNTA de pincel: png, webp, jpg, gif, avif o svg.
Aparecen solas en la lista de puntas del editor de imágenes (junto al «Redondo» incorporado).
Reinicia «npm run dev» (o compila de nuevo) tras añadirlas.

  * La forma la da la TRANSPARENCIA: lo opaco pinta, lo transparente no. Si la imagen no
    tiene transparencia, se usa su luminosidad (negro = pinta, blanco = no pinta).
  * Cuadradas y de 64–256 px por lado (se reducen a 128). Centradas.
  * El color y el tamaño los pone la persona; la punta solo aporta la forma.

NOMBRES Y AJUSTES (opcional) — «names.json»:

  {
    "items":    { "tiza": { "es": "Tiza", "en": "Chalk" } },
    "settings": { "tiza": { "spacing": 0.2, "angleJitter": 1 } }
  }

  spacing      separación entre sellos como fracción del tamaño (0.05–1; por defecto 0.15)
  angleJitter  giro aleatorio de la punta en cada sello (0 = ninguno, 1 = vuelta completa)
  La clave («tiza») es el nombre del archivo sin extensión.
