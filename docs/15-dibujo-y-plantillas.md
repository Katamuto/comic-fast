# 15 · Dibujar, tableta gráfica y plantillas (0.12)

## Crear un dibujo desde cero
Archivo → **Nuevo dibujo…** (o el botón en la pestaña Recursos → Imágenes). Eliges tamaño (cuadrado, horizontal, vertical, como la página o el que quieras, hasta 8192 px) y fondo (transparente, blanco o un color). Se abre el editor de imágenes con el lienzo en blanco. Al terminar:
- **Guardar**: crea un recurso nuevo en Recursos.
- **Guardar y colocar en la página**: además lo pone en la página actual.

## Herramientas del editor de imágenes
Pincel, goma, **bote de pintura** (tolerancia y «contiguo», como la varita; respeta la selección y tapa 1 px de halo), **gota** (difumina lo que pasas por encima), **dedo** (arrastra y mezcla la pintura), cuentagotas, selecciones, recorte y Color a alfa.
- La **fuerza** de gota y dedo es ajustable. Con la selección activa, solo se toca lo seleccionado.
- **Puntas de pincel**: el pincel y la goma admiten puntas de imagen. Incluidas: Suave, Tiza, Carboncillo, Aerosol, Plano, Salpicado, Cuadrado y Estrella, más el «Redondo» incorporado. Se leen de `src/assets/brushes/` (ver su README): un PNG con transparencia por punta, y `names.json` con nombres en varios idiomas y ajustes (`spacing`, `angleJitter`).

## Tableta gráfica
Funciona con cualquier lápiz que el sistema entregue como puntero «pen» (Wacom, pantallas con lápiz, iPad con Apple Pencil, Surface…). Panel «Tableta gráfica» en las opciones del pincel, goma, gota y dedo:
- **La presión controla el grosor** (casilla) + deslizador del **mínimo** (el rango va de ese valor al 100 %).
- **La presión controla la opacidad** (en gota y dedo, la fuerza) + su deslizador de mínimo.
- Los ajustes se recuerdan entre sesiones. Con ratón o dedo no cambian nada.
- Limitación: en Linux, WebKitGTK puede entregar el lápiz como ratón (sin presión), según el controlador. Es una limitación del sistema, no de la app; en Windows (WebView2), macOS y la web con Chrome/Edge/Safari suele ir bien.

## Plantillas de proyecto
Archivo → **Nuevo desde plantilla…**. Incluye:
- **Cómic**: portada (sin estilo ni número) y dos páginas numeradas 1 y 2 con cabecera y número en la página de estilo.
- **Storyboard**: A4 horizontal, 6 planos 16:9 por página con una línea de notas bajo cada uno y «Pág. {n} / {total}».
- **Manhwa / webtoon**: tira vertical 800 × 2400 con viñetas sin borde y globos de ejemplo.

Se abre como proyecto sin guardar (Guardar pide nombre; la plantilla no se toca). Las plantillas son archivos `.cfast` normales en `src/assets/templates/` (ver su README): para añadir una, crea tu proyecto, «Guardar como…» y copia el archivo ahí. Mejor sin imágenes. Los textos de ejemplo están en español.
