# 12 · Móvil, pantalla completa y texto vertical

## Interfaz móvil

Solo aparece en **teléfonos**; en PC y tabletas no cambia nada.

- **Detección** (`src/lib/app/device.ts`, función `isPhone`): pantalla táctil (`pointer: coarse`) **y** lado corto de la ventana ≤ 600 px. Girar el teléfono no cambia de interfaz.
- **Probarla en un PC**: añade `?ui=mobile` a la dirección (por ejemplo `http://localhost:1420/?ui=mobile`) y reduce la ventana, o usa las herramientas de desarrollo del navegador (modo dispositivo). `?ui=desktop` fuerza la de escritorio y `?ui=auto` vuelve a la detección normal. La elección se recuerda en el navegador.
- **Organización** (`src/lib/components/MobileApp.svelte`):
  - barra superior: menú (☰), nombre del archivo, deshacer, rehacer y pantalla completa;
  - el lienzo ocupa el resto;
  - tira de herramientas con botones grandes (las mismas acciones de siempre; en horizontal pasa a columna a la izquierda);
  - pestañas inferiores **Páginas · Recursos · Propiedades**: abren un panel que comparte pantalla con el lienzo (en horizontal, a la derecha). Reutilizan `PageList`, `ResourcePanel` e `Inspector`;
  - el menú ☰ es un cajón con los mismos menús de escritorio (Archivo, Edición, Página, Ver, Ayuda), idioma, descargas y avisos.
- **Gestos en el lienzo** (`Canvas.svelte`):
  - un dedo sobre un objeto lo mueve; los tiradores son más grandes (18 px en vez de 9);
  - un dedo sobre el fondo **desplaza** la vista; un toque sin mover deselecciona;
  - **dos dedos**: pellizco para el zoom y desplazamiento a la vez (`pinchStep` en `device.ts` calcula el cambio);
  - al poner el segundo dedo, un arrastre a medias se da por terminado tal como está.
- La altura usa `100dvh` (no cuenta la barra de direcciones del móvil) y `overscroll-behavior: none` evita que tirar hacia abajo recargue la página.
- No hay doble clic derecho en el móvil: las acciones salen de la tira de herramientas y del menú ☰. En Android, la pulsación larga sobre el lienzo abre el menú contextual.

## Instalar la app (botón «Instalar»)

En la barra superior del móvil, en el hueco junto al nombre del archivo, aparece un botón **Instalar** (`device.canInstall`, `app/device.svelte.ts`):
- En Chrome/Edge/Android usa el aviso `beforeinstallprompt`: el navegador solo lo emite cuando la app **se puede instalar** (es decir, no está instalada), así que el botón no sale si ya está instalada; tampoco sale cuando se abre desde el icono (modo *standalone*) ni justo después de instalar (`appinstalled`). Al pulsarlo se abre el cuadro de instalación del navegador, el mismo que el menú ⋮ → «Instalar app».
- En iPhone/iPad no existe ese aviso: el botón se muestra en Safari y explica los pasos (Compartir → Añadir a pantalla de inicio). Ya instalada no se muestra.
- Si el navegador no lo ofrece (p. ej. Firefox), el botón no aparece.

## Pantalla completa

- Menú **Ver → Pantalla completa** (Ctrl/⌘+Mayús+F) y botón en la barra superior del móvil. Funciona también en PC (solo en la versión web).
- Usa la API `requestFullscreen`. **iPhone no la ofrece** para páginas web: allí hay que usar Compartir → *Añadir a pantalla de inicio*; el botón avisa de ello.
- La web incluye `public/manifest.webmanifest` (`display: standalone`, iconos `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) y las metaetiquetas de Apple, así que al instalarla en la pantalla de inicio se abre sin barra del navegador. Una vez instalada, el botón de pantalla completa se oculta (ya lo está).
- No hay *service worker*: la app no funciona sin conexión. Se podría añadir más adelante (solo hace falta cuidar el caché de `/assets`).

## Texto vertical

Para japonés, chino y coreano. Es una propiedad más del texto: `vertical?: boolean` en `TextStyle` (`model/types.ts`), válida para globos y objetos de texto. Se activa en el Inspector con **Texto vertical**.

- El texto se coloca en **columnas**, de arriba abajo; la primera columna es la de la **derecha** y las siguientes van hacia la izquierda.
- La alineación pasa a significar **Arriba / Centro / Abajo** (posición a lo largo de la columna).
- Las columnas se parten por la **altura** de la caja (`wrapVertical` en `render/textLayout.ts`), y si no caben a lo ancho, el tamaño de letra baja (`fitTextVertical`), igual que en horizontal. El ancho de cada columna es 1,25 × el tamaño de letra.
- Dibujo: una etiqueta `<text writing-mode="vertical-rl">` por columna (`TextView.svelte`, `BalloonView.svelte`). El navegador gira las letras latinas y coloca los signos japoneses (、。「」ー) como corresponde. Sale igual en la exportación porque es el mismo renderizador SVG.
- Edición: el cuadro de texto superpuesto usa `writing-mode: vertical-rl`.
- **Fuente**: necesita una con caracteres CJK. Si la fuente elegida no los tiene, el navegador usa otra del sistema, pero para exportar de forma consistente conviene importar una fuente CJK propia (Archivo → Fuentes del proyecto…).
- Limitaciones conocidas: no hay *tate-chu-yoko* (números cortos en horizontal dentro de la columna) ni ajuste de prohibición de inicio/fin de línea (kinsoku). Los saltos de línea manuales se respetan.
- Se guarda en el `.cfast` sin cambiar de versión (campo opcional).
