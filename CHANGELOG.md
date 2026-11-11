# Cambios

## 0.14.0

**Nuevo**
- **Cuadrícula relativa a la página** con columnas y subdivisiones ajustables (Vista → Cuadrícula…); el imán usa la subdivisión.
- **Viñetas**: cortar con una línea (modo «Cortar», Mayús = ángulos de 15°, con separación), dividir en N×M, y **operaciones booleanas** (unir, intersección, diferencia, excluir). Viñeta de nube y «Viñeta: bordes de nube».
- **Globos**: enlazar seleccionando varios (barra, menú Edición, clic derecho; cola al siguiente o cuerpos fundidos), tirador de **ancho de cola** en el lienzo, nuevo globo **redondo de sierra** (largo y ancho de picos), **meter en viñeta** a propósito (se recorta a la viñeta y la acompaña).
- **Texto con formato por partes**: negrita, cursiva, subrayado, tachado, color y fuente sobre la selección (Inspector y Ctrl+B/I/U).
- Panel de imágenes importadas: **filtros** (en uso / sin usar, aseguradas, forma, búsqueda, orden).
- Los desplegables ya no se salen de la pantalla (lista propia con scroll).

**Arreglado**
- El recurso «Globos fusionados» ahora sí viene fusionado; los recursos pueden enlazar sus propios objetos.


## 0.13.0

**Nuevo**
- **Globos**: 5 estilos nuevos (cuadrado redondeado, nube suave de arcos, óvalo irregular, óvalo con esquinas, impacto de puntas irregulares).
- **El texto sigue el contorno** del globo (ya no se encaja en un rectángulo) con **margen** ajustable entre texto y borde.
- **Origen de la cola movible** dentro del globo (tirador de borde punteado; «Origen al centro» en el Inspector).
- **Globos encadenados** (Inspector → Encadenar): la cola apunta a otro globo o los cuerpos se funden en una sola silueta.
- **Reflejar** imágenes (horizontal y vertical), también en capas de viñetas.
- **Degradados** en el relleno de títulos y onomatopeyas; títulos y onomatopeyas ya no se ven afectados por el tamaño de texto global.
- Recursos de degradados de puntos; «Nuevo desde plantilla» en la pantalla de inicio.
- Fuentes **Noto Sans JP / KR / SC Black** (OFL, subconjuntos; carga diferida: solo se descargan si se usan).
- La exportación solo incrusta las fuentes que la página usa.

**Pendiente**: cursivas y fuentes «turbias» (Creepster, East Sea Dokdo, Liu Jian Mao Cao…): no se pudieron descargar; ver `src/assets/fonts/README.txt`.


## 0.12.0

**Nuevo**
- **Nuevo dibujo**: el editor de imágenes puede crear un lienzo en blanco (transparente, blanco o de color) y guardarlo como recurso o colocarlo en la página.
- Herramientas: **bote de pintura**, **gota** (difuminar) y **dedo** (esparcir).
- **Puntas de pincel** desde `src/assets/brushes/` (8 incluidas) para pincel y goma.
- **Tableta gráfica**: la presión controla el grosor y/o la opacidad, con casilla y rango mínimo para cada una.
- **Plantillas de proyecto** (`src/assets/templates/*.cfast`): Cómic (portada + 2 páginas con numeración), Storyboard y Manhwa/webtoon. Archivo → Nuevo desde plantilla…

## 0.11.0

**Nuevo**
- **Editor de imágenes** (pinceles, goma, selección rectángulo/libre/varita, recorte, transparencia, Color a alfa); guarda un recurso nuevo.
- **Reorganizar páginas** en una cuadrícula arrastrable.
- **Excluir páginas** del estilo y/o de la numeración (independientes).
- **Distribuidor** de imágenes y cuadros de texto.
- **Parámetros globales** (tamaño de texto, grosor de viñetas y globos) y **tamaño de texto forzado** con marco rojo si no cabe.
- **Texto justificado**.
- Guardar siempre un recurso aunque no se use; vistas previas redimensionables y lista en Recursos y Páginas; carrusel de páginas en móvil vertical.
- Mensaje con barra de progreso al exportar (PDF, etc.); corrector ortográfico del navegador con idioma del texto.

- **Abrir `.cfast` con doble clic** en el escritorio (asociación de archivo, una sola ventana) y **arrastrando** el archivo a la ventana (web y escritorio).

- **Excluir una página de los parámetros globales** (independiente de estilo y numeración).

**Mejorado**
- Rendimiento con muchos elementos e imágenes HD (versiones reducidas, miniatura diferida).
- Al redimensionar una viñeta, sus imágenes se redimensionan con ella (Alt = solo el marco).

**Corregido**
- Soltar imágenes desde el sistema en la versión compilada para Linux (sin verificar compilado).

## 0.10.0

**Nuevo**
- **Soltar imágenes** desde el sistema en cualquier parte de la ventana (se añaden a Recursos; sobre la página, además se colocan o rellenan la viñeta).
- **Degradado reflejado** (color 1 en el centro, color 2 a los lados).
- **Degradado de puntos** (trama de medios tonos): forma círculo / cuadrado / rombo / X, tamaño y distancia en cada extremo con interpolación, y color en los puntos o en el fondo. Disponible en viñetas, globos y capas de degradado.
- **Deformar texto** (arco, onda, inflar, perspectiva) y **Distorsión** ondulada para cualquier objeto.
- Botón **Instalar** en la barra superior del móvil (solo si la app no está instalada).

**Corregido**
- Arrastrar recursos del panel a la página: ahora se hace con el puntero (ratón, lápiz y dedo con pulsación larga) en vez del arrastrar-y-soltar de HTML5, que fallaba en la web y no funciona con el dedo.

## 0.9.0

**Nuevo**
- **Texto vertical** en globos y textos (casilla «Texto vertical» en el Inspector): columnas de arriba abajo, de derecha a izquierda, para japonés, chino y coreano. La alineación pasa a ser Arriba/Centro/Abajo. Ver `docs/12-movil-y-vertical.md`.
- **Interfaz para móviles**, solo en teléfonos (el escritorio no cambia): barra superior con menú, deshacer/rehacer y pantalla completa; herramientas grandes; paneles Páginas / Recursos / Propiedades; menú lateral; también en horizontal. Para probarla en un PC: `?ui=mobile`.
- **Gestos táctiles** en el lienzo: pellizco para el zoom, dos dedos para desplazar, un dedo sobre el fondo desplaza; tiradores más grandes en pantallas táctiles.
- **Pantalla completa** (Ver → Pantalla completa, Ctrl/⌘+Mayús+F) en la web, en móvil y en PC.
- Web app **instalable** (manifest e iconos): «Añadir a pantalla de inicio» la abre sin barra del navegador (única vía a pantalla completa en iPhone).

**Cambios**
- La interfaz usa `100dvh` y se desactiva «tirar para recargar» en móviles.

## 0.8.0

**Nuevo**
- **Página de estilo**: una página extra, en blanco, cuyo contenido se copia en todas las páginas (márgenes, encabezados, pies, marcos). Se activa con el botón de la barra de herramientas (o Ctrl/⌘+Mayús+Y). Una referencia no editable representa el contenido de cada página; los elementos se suben o bajan por encima o debajo de ella. Texto con `{n}` (número de página) y `{total}`; recurso «Número de página». Se guarda en el proyecto y sale en las exportaciones.
- **Modos de fusión** en viñetas, imágenes, tramas, texturas y degradados.
- **Fuentes propias**: Archivo → Fuentes del proyecto… (TTF, OTF, WOFF, WOFF2), con aviso de que la persona es responsable de las licencias; se guardan dentro del proyecto y se incrustan al exportar. Cláusula nueva en el EULA.
- **Menús contextuales** en la lista de páginas (nueva/eliminar página) y en las imágenes importadas (quitar del proyecto); ningún otro menú del navegador sale ya en la interfaz (los campos de texto conservan el suyo).
- **Quitar una imagen importada** (clic derecho) y un icono en las imágenes que no se usan en el cómic (no se guardan).
- Globo **Dentado** (lados rectos con dientes irregulares) y guía detallada para diseñar globos nuevos: `docs/10-globos.md`.
- Leyenda «© 2026 Comic Fast. Todos los derechos reservados.» en la barra de estado, el splash y Acerca de.

**Cambios**
- Los SVG de tramas dibujados en Inkscape ya cambian de color en el Inspector: el negro explícito pasa a `currentColor`.
- Un objeto que queda por completo fuera de la página (al soltarlo, arrastrarlo, redimensionarlo o girarlo) se elimina; Ctrl+Z lo recupera.
- Fondo y borde de las viñetas se pintan con color + opacidad por separado (`fill`/`fill-opacity`).
- Se quitan las menciones a otros programas de los textos de la interfaz.
- Flujo de compilación de escritorio reescrito (`.github/workflows/build.yml`): dependencias oficiales de Tauri 2 en Linux, `npm ci` si hay package-lock, solo los formatos útiles (exe, dmg, deb, AppImage), artifacts siempre, firma ad-hoc en macOS.

## 0.7.0

- **Menú contextual propio** al hacer clic derecho en el lienzo: Cortar, Copiar, Pegar, Duplicar y Eliminar (las mismas acciones del menú Edición, con sus atajos). Selecciona lo que hay bajo el puntero. En la app de escritorio ya no sale el menú del navegador (Recargar, Inspeccionar…); los campos de texto conservan el suyo.
- Nueva acción **Cortar** (Ctrl/⌘+X) en el menú Edición.
- **Obtener versión de escritorio** (solo web): botón arriba que abre una ventana con las descargas listadas en `descargas/descargas.json` (nombre en varios idiomas, archivo e icono en la misma carpeta). Sin opciones disponibles no aparece; las opciones cuyo archivo aún no está subido se ocultan solas. Ver `docs/09-descargas.md`.
- La compilación de escritorio descarta `descargas/`, `avisos.json` y `_headers` del paquete.

## 0.6.0

**Corregido**
- Barra lateral de herramientas sin iconos (desde 0.5.0): al traducir, la variable del bucle chocó con la función `t()` y el nombre del icono quedaba vacío. Se añade una prueba que impide ese choque.

**Cambios**
- Las pestañas de recursos muestran un icono (con el nombre como ayuda al pasar el ratón).
- **Transparencia (alfa)** en todos los selectores de color (viñetas, globos, tramas, texturas, degradados, borde, texto) y en el tinte de imagen, donde el color se mezcla con la imagen en vez de taparla. Se guarda como `#rrggbbaa`: compatible con proyectos anteriores.
- **Degradados con guías en el lienzo**: dos puntos arrastrables. Lineal: inicio y final. Radial: centro y radio. Casilla para ocultarlas y botón «Restablecer guías». `Gradient.p1/p2` opcionales (si faltan, manda el ángulo/centro de siempre).
- **Tramas = SVG en `src/assets/patterns/`** con código de nombre `t_` (tileable) / `n_` (no tileable); las ocho tramas de antes pasan a ser archivos de esa carpeta (los proyectos antiguos las siguen encontrando). La escala queda confinada al rectángulo. `PatternKind` ahora es texto libre.
- **Texturas de imagen** en `src/assets/textures/` (mosaico, solo escala) junto a las procedurales. Las procedurales admiten transparencia, **Intensidad** (`amount`) y hay dos nuevas: Vetas y Manchas.
- **Nombres traducibles**: `names.json` dentro de cualquier carpeta de `resources/`, `patterns/` o `textures/`; sin él, se usa el nombre de la carpeta o del archivo. El buscador entiende todos los idiomas.
- **Campanita de avisos** (solo web): lee `avisos.json` de la raíz del sitio y muestra su mensaje, en varios idiomas. Ver `docs/08-avisos.md`.

## 0.5.0

**Corregido**
- El botón de donar no aparecía en la versión web: la URL solo existía en un `.env.production` local (ignorado por git), así que solo el build de escritorio la tenía. Ahora vive en `src/site.config.ts` (versionado) y sirve para web y escritorio; `VITE_DONATE_URL` queda como sustitución opcional.

**Eliminado**
- Todo lo relacionado con anuncios (`AdSlot`, `ads.ts`, variables y documentación). Solo queda la opción de donar.

**Nuevo**
- **Multilenguaje**: español, inglés, japonés, coreano, francés, chino (simplificado) y portugués. Botón de globo junto al tema; idioma del sistema por defecto, inglés si no está disponible; la elección se recuerda.
- Añadir un idioma = soltar archivos: `src/locales/<código>.json` (interfaz), `src/locales/guide/<código>.md` (guía) y `src/assets/eula/<código>.md` (EULA). Ver `docs/07-idiomas.md`.
- Guía de usuario (Ayuda → Guía de usuario, F1) con índice por secciones, en cada idioma.
- Ventana de EULA (Ayuda → Términos de servicio): se muestra en el primer inicio con botón «Aceptar». Texto provisional.
- «Acerca de»: «Creado por Camilo Sierra» y aviso de uso de herramientas de IA.

**Cambios internos**
- Módulo `src/lib/i18n` (núcleo puro y probado + parte reactiva). Los textos de la interfaz ya no están en el código: se piden con `t('clave')`.
- Errores traducibles (`TKError`), etiquetas de recursos con clave y texto de reserva en español.
- Pruebas de completitud de idiomas: mismas claves y marcadores `{…}` que el español; todas las claves usadas en el código existen.

## 0.4.0

**Corregido**
- Escritorio: la ventana ignoraba el botón de cerrar. Faltaban los permisos `core:window:allow-close` y `allow-destroy` en `src-tauri/capabilities/default.json`. Se añade además Archivo → Salir.

**Nuevo**
- Interfaz más legible: todo el tamaño de la interfaz escala (A−/A+, Ver → Texto más grande/pequeño); por defecto 115 %. Mayor contraste en el texto secundario.
- Interruptor de tema claro/oscuro en la barra de menú (recuerda la elección; sin elegir sigue al sistema).
- Redimensionar con el imán de cuadrícula activo ajusta también los bordes.
- Bloqueo de objetos (`locked`): Ctrl+L, botón de la barra lateral y casilla del Inspector.
- Globos: `tailWidth` y `tailCurve` (grosor y curvatura de la cola) con tirador de curvatura en el lienzo.
- Tramas dentro de la viñeta: mando de giro/escala en el lienzo y rango de escala 0.2–8.
- Filtros de imagen (`fx`) para imágenes sueltas y capas: brillo, contraste, saturación, tono, sepia, desenfoque, invertir, teñir; ajustes rápidos.
- Pestaña «Incluidas»: imágenes de `src/assets/resources/` por categorías/subcategorías desplegables, buscador, silueta `.tint` recoloreable. Incluye ejemplos.
- Fuentes propias: cualquier `.woff2/.woff/.ttf/.otf` en `src/assets/fonts/` (el nombre del archivo define familia y estilo).
- Las categorías de las pestañas Viñetas/Texto también son plegables.
- Red de seguridad contra la pantalla en blanco (`public/boot-guard.js`).

**Cambios internos**
- Formato `.cfast` sin cambio de versión: `locked`, `fx`, `tailWidth`, `tailCurve` son campos opcionales.
- SVG importados: tamaño tomado del `viewBox`. `assetsInlineLimit: 0` y `data:`/`blob:` en `connect-src` para poder leer las imágenes incluidas.
- Interfaz en `rem` (1 rem = 13 px × escala).

## 0.3.0 — lista para publicar

**Nuevo**
- Tamaño de página personalizado (Página → Tamaño personalizado…): unidades px/mm/cm/in, 16 formatos predefinidos, intercambio vertical/horizontal, bloqueo de proporción y opción de escalar o no el contenido.
- Pantalla de bienvenida con logo grande, explicación y pasos iniciales (Ayuda → Bienvenida; casilla «No volver a mostrar»).
- Botón «♥ Apoyar» (barra de estado, menú Ayuda y bienvenida) con `VITE_DONATE_URL`.
- Anuncios opcionales **solo en la web** (`VITE_ADS_PLACEMENT`: bienvenida y/o columna izquierda ≥ 1280 px). Desactivados por defecto; el escritorio nunca los muestra.
- Despliegue: `base: './'`, metadatos y favicon, `public/_headers`, `.env.example`, flujos de GitHub Actions para Pages y para publicar instaladores de Windows/macOS/Linux.
- Guías 04 (recursos), 05 (publicar y compilar) y 06 (donativos y anuncios).

**Cambios internos**
- Plugin `tauri-plugin-opener` para abrir enlaces externos desde la app de escritorio.
- La exportación reduce sola la escala si la página es muy grande (máx. 9000 px por lado).
- Nuevo `model/units.ts` con pruebas.

## 0.2.0

**Corregido**
- Los menús desplegables ya se ven por encima del lienzo y de la lista de páginas.

**Nuevo**
- Barra lateral de herramientas junto al lienzo (orden de capas, duplicar, eliminar, deshacer/rehacer, zoom, cuadrícula, imán…).
- Viñetas redondas (elipse) y poligonales con vértices editables; plantillas de página en diagonal; formas predefinidas.
- Capas dentro de cada viñeta: varias imágenes, tramas, texturas y degradados a la vez.
- Imágenes dentro de la viñeta: giro, escala y movimiento en el lienzo, con campos numéricos en el Inspector.
- Degradados lineales y radiales (viñetas, globos y capas) y pestaña de degradados predefinidos.
- Texturas procedurales: grano, nubes, celdas (Voronoi) y grietas. Botón «Variar» para otra semilla.
- El logo «COMIC FAST» en la barra de menús, la barra de estado, el diálogo «Acerca de» y el README.
- Guías de estudio en `docs/` y una lista de recetas para modificar el proyecto.

**Cambios internos**
- Formato `.cfast` v2: la imagen de la viñeta pasa a ser una capa (`layers`); las viñetas tienen `shape` y `points`; las tramas tienen `seed`.
  Los proyectos v1 se migran automáticamente al abrirlos.
- Las pestañas del panel derecho pasan a varias filas (ahora son 7).

## 0.1.0
Primera versión: páginas, viñetas rectangulares, globos, texto, tramas, deshacer/rehacer, `.cfast`, exportar PNG/PDF/CBZ.
