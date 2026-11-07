# 02 · Recorrido del código

## Mapa de carpetas

```
src/
  main.ts                    Arranque: monta App.svelte en #app
  App.svelte                 Disposición general (rejilla: menú, páginas, lienzo+herramientas, recursos, estado)
  app.css                    Colores (variables CSS), tema claro/oscuro
  assets/                    logo.png (grande) y logo-sm.png (barra de menú y de estado)
  lib/
    model/                   DATOS y lógica pura  ← lo más importante
      types.ts                 Todos los tipos del documento
      defaults.ts              Fábricas: panel(), balloon(), polyPanel(), imageLayer()…
      store.svelte.ts          `editor`: estado + todas las operaciones (con deshacer)
      history.ts               Deshacer/rehacer (patrón Command)
      geometry.ts              Rotaciones, redimensionar (puro)
      panelGeometry.ts         Polígonos, elipses, vértices, capas (puro)
      scale.ts                 Cambiar tamaño de página, clonar páginas, imágenes usadas
    render/                  Cálculos de dibujo (puros)
      balloon.ts               Forma de los globos
      patterns.ts              Catálogo de tramas/texturas, trazados de líneas de velocidad
      textures.ts              Ruido (feTurbulence) y celdas Voronoi
      paint.ts                 Degradados y rellenos
      panelShape.ts            Silueta SVG de una viñeta
      textLayout.ts, objectText.ts, fonts.svelte.ts   Texto
    components/              Interfaz Svelte
      PageContent.svelte       ★ EL ÚNICO renderizador de una página
      ObjectView.svelte        Elige la vista según `obj.type`
      objects/                 PanelView, LayerView, PaintFill, GradientDefs, BalloonView, TextView, ImageView, PatternView
      Canvas.svelte            Interacción con el lienzo (ratón, tiradores, zoom, soltar archivos)
      Toolbar.svelte + Icon    Barra lateral de herramientas
      Inspector.svelte         Propiedades del objeto seleccionado
      LayersPanel.svelte       Capas de la viñeta seleccionada
      fields/                  Campos reutilizables (número, color, rango, relleno, degradado)
      MenuBar, PageList, ResourcePanel, ResourcePreview, StatusBar, AboutDialog
    resources/registry.ts    Lo que aparece en las pestañas del panel derecho (como datos)
    app/actions.ts           Comandos: alimentan menús, atajos y barra lateral
    io/                      Archivos: cfast (proyecto), pdf, render/exporters (PNG, PDF, CBZ), platform (Tauri o web)
src-tauri/                   Rust: ventana + plugins (casi no se toca)
docs/                        Estas guías
```

## El modelo de datos

```
ComicDoc
  └─ pages: Page[]
       ├─ background: string
       └─ objects: PageObject[]            ← el orden del arreglo ES el orden de capas (último = encima)
            ├─ PanelObj      viñeta: forma (rect/ellipse/poly) + relleno + borde + layers[]
            │     └─ layers: PanelLayer[]  imagen | trama/textura | degradado (de abajo hacia arriba)
            ├─ ImageObj      imagen suelta
            ├─ BalloonObj    globo (diálogo, pensamiento, grito, susurro, narración)
            ├─ TextObj       texto / onomatopeya
            └─ PatternObj    trama o textura suelta
```

Detalles que conviene saber:

- Unidades: 1 unidad = 1 px a 150 dpi. La página EE.UU. mide 994 × 1538.
- Todo objeto tiene `x, y, w, h, rotation` (giro alrededor de su centro).
- **Viñeta poligonal:** `points` son *fracciones* (0 a 1) de la caja. Así, al redimensionar, la forma se escala sola. La caja siempre envuelve a los puntos
  (`normalizePoly` en `panelGeometry.ts` la reajusta al mover un vértice).
- **Capas:** `x, y` son el desplazamiento del centro de la capa respecto al centro de la viñeta. Las imágenes guardan `scale` (px de página por px de imagen).
- **Relleno (`Fill`):** `string` (color) o `Gradient` (lineal/radial).

## Cómo fluye un cambio (ejemplo: arrastrar una viñeta)

1. `Canvas.svelte → onPointerDown`: detecta qué hay bajo el puntero (`data-oid` en el SVG), guarda los valores iniciales (`snapshotOf`) y crea un objeto `drag`.
2. `onPointerMove`: calcula el desplazamiento y llama `editor.live(id, { x, y })` → cambia el dato, **sin historial**.
3. Svelte nota que el dato cambió y repinta (`ObjectView` → `PanelView`…). Tú no llamas a ningún "redraw".
4. `onPointerUp`: `finishPatchDrag` compara antes/después y llama `editor.commit('Mover', cambios)` → **un** comando de deshacer.

Las ediciones desde formularios (Inspector) usan `editor.patch(ids, cambios, claveDeFusión)`: varios cambios seguidos del mismo campo se fusionan en uno (ventana de 800 ms).

## Un solo renderizador

`PageContent.svelte` dibuja el fondo y cada objeto. Lo usan: el lienzo (con `interactive`), las miniaturas de página (`PageSvg`), las miniaturas
del panel de recursos (`ResourcePreview`) y la exportación (`io/render.ts` monta `PageSvg` fuera de pantalla, serializa el SVG y lo pasa a un canvas).
**Lo que ves es lo que se exporta.** Si añades algo que se dibuja, añádelo en una vista de `components/objects/` y saldrá en todos lados.

Cada vista recibe un `scope` (prefijo) para que los `id` internos de SVG (`clipPath`, `pattern`, `filter`, gradientes) no choquen entre lienzo, miniaturas y exportación.

## Viñetas: forma, capas y vértices

- `PanelView.svelte`: calcula la silueta (`panelPath`), la usa como `clipPath`, pinta el relleno, cada capa (`LayerView`) y por último el borde
  (un trazo doble recortado a la forma = borde de grosor exacto hacia dentro).
- `LayerView.svelte`: imagen (`<image>` con transform), trama/textura (`PaintFill`, dentro de un cuadrado girable que cubre la viñeta) o degradado.
- Edición en el lienzo (`Canvas.svelte`):
  - Puntos azules = vértices (`data-handle="v:N"`). Arrastrar → `editor.live(id, panelWithPoints(...))`.
  - Doble clic en un borde → `editor.insertVertex`; doble clic en un vértice → `editor.removeVertex`.
  - **Modo editar imagen** (`editor.layerMode`, doble clic en la viñeta o tecla Intro): marco naranja con esquinas (escalar) y círculo (girar); arrastrar el cuerpo mueve la imagen.
    Alt + arrastrar mueve la capa activa sin entrar al modo.

## Recursos (panel derecho)

`resources/registry.ts` define cada pestaña como una lista de `ResourceItem { id, label, group?, build(ctx), layer? }`.
`build` devuelve los objetos que se añaden a la página; `layer` (opcional) permite soltarlo **dentro** de una viñeta como capa.
El mismo `build` dibuja la miniatura, así que lo que ves en la pestaña es lo que obtienes.

## Acciones: menús, atajos y barra lateral

`app/actions.ts` tiene una lista de acciones `{ id, label, keys, run, enabled, checked }`.
Los menús (`menus`), el manejador de teclado (`handleKeydown`) y la barra lateral (`Toolbar.svelte`) leen **esa misma lista**:
defines un comando una vez y aparece en los tres sitios.

## Archivos y formato `.cfast`

Un ZIP con `project.json` (documento) y `assets/<id>.<ext>` (imágenes sin recomprimir). `FORMAT_VERSION` está en `io/cfast.ts`.
Al abrir, `migrate()` convierte versiones antiguas (la v1 → v2 convirtió la imagen de la viñeta en una capa). Al cambiar el modelo:
sube la versión y añade un paso en `migrate()`; así los proyectos viejos siguen abriendo.

## Pruebas

| Archivo | Cubre |
|---|---|
| `model/history.test.ts` | Deshacer/rehacer y fusión |
| `model/geometry.test.ts` | Rotación, redimensionar, recorte |
| `model/panelGeometry.test.ts` | Polígonos, vértices, capas |
| `render/render.test.ts` | Texto, globos, tramas, degradados, texturas |
| `io/io.test.ts` | PDF, escala, formato `.cfast`, migración |
