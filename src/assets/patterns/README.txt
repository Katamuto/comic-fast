TRAMAS  (pestaña «Tramas»)
==========================

Cada SVG de esta carpeta es una trama. Guarda el archivo y reinicia «npm run dev»
(o compila de nuevo): aparece solo, con miniatura. No hay que escribir código.

CÓDIGO AL COMIENZO DEL NOMBRE (no se muestra en la interfaz)
  t_Puntos.svg      «t» = TILEABLE: es un mosaico que se repite dentro de su rectángulo.
  n_Rayos.svg       «n» = NO tileable: una sola figura que llena el rectángulo.
  Puntos.svg        sin código = tileable.
  El nombre que se ve es lo que va después del código («t_dots_large.svg» → «Dots large»).

CÓMO DIBUJARLOS
  * Usa viewBox. En un mosaico, el tamaño del viewBox es el tamaño del mosaico a escala 1
    (unidades de página; la página mide ~1000 × 1500). El mosaico debe encajar con sus
    vecinos: lo que sale por un borde entra por el opuesto (dibuja los trozos en las esquinas).
  * Para que el COLOR de la trama se pueda cambiar en el Inspector, usa «currentColor»
    en fill/stroke, o no pongas fill (se pinta con el color elegido). Si fijas colores
    en el archivo, esos se respetan.
  * En las no tileables, preserveAspectRatio del <svg> decide el ajuste (por defecto
    «xMidYMid slice» = cubrir; «none» = estirar a todo el rectángulo).
  * Escala: en mosaicos cambia el tamaño del mosaico; en figuras 1 = llena el rectángulo,
    menos = se encoge centrada, más = se amplía y se recorta. Siempre queda dentro del rectángulo.
  * No uses scripts, imágenes externas ni fuentes: se ignoran los scripts y no se exportarían.

NOMBRES EN VARIOS IDIOMAS (opcional): «names.json» en esta carpeta
    { "items": { "dots": { "es": "Puntos", "en": "Dots", "ja": "ドット" } } }
  La clave es el nombre sin código ni extensión («t_dots.svg» → "dots"). Las tramas que vienen
  con la app se traducen desde src/locales/*.json (claves pattern.<nombre>).

Las que vienen incluidas (dots, dotsLarge, linesDiag, linesHoriz, crosshatch, grid, speedRadial,
speedHoriz) pueden editarse o borrarse. Los proyectos antiguos las siguen encontrando por su nombre.
