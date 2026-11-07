# 03 · Recetas

Pasos concretos para los cambios más habituales. Después de cada cambio: `npm run check` (tipos) y `npm test`.

---

## Añadir un globo nuevo
**Archivo:** `src/lib/resources/registry.ts`, lista `balloons`.

```ts
balloonItem({
  id: 'speech-big',            // único
  label: 'Diálogo grande',
  hr: 0.7,                     // alto = ancho × 0.7
  wide: 380,                   // ancho (sobre una página de 1000 de ancho)
  tail: [-0.2, 0.9],           // punta de la cola, relativa al tamaño del globo
  over: { style: 'speech', text: '¡Mira!', fontSize: 40 }
}),
```
Aparece solo en la pestaña **Globos**, con su miniatura.

## Añadir una trama o textura nueva
1. `types.ts`: añade el nombre a `PatternKind` (p. ej. `'waves'`).
2. `render/patterns.ts`: añádela a `PATTERNS` (o a `TEXTURES`). Si es de mosaico, dale tamaño en `tileSize`.
3. `components/objects/PaintFill.svelte`: añade su dibujo (una rama `{:else if kind === 'waves'}` dentro del `<pattern>`).
Aparece sola en las pestañas, en el Inspector y en el selector de capas.

## Añadir un degradado predefinido
`render/paint.ts`, lista `GRADIENT_PRESETS`:
```ts
{ id: 'ocean', label: 'Océano', gradient: lin('#00c6ff', '#0072ff') },
```

## Añadir una plantilla de página
`registry.ts`, lista `panels`: `layoutItem('l-mia', 'Mi plantilla', [{ h: 1, cols: [1, 2] }, { h: 2, cols: [1] }])`.
Cada fila tiene un alto relativo (`h`) y anchos relativos de columnas (`cols`).

## Añadir una forma de viñeta (polígono)
`registry.ts`, justo después de `shapePanel('s-hex', …)`:
```ts
shapePanel('s-arrow', 'Flecha', 0.6, 0.26, [
  { x: 0, y: 0.25 }, { x: 0.6, y: 0.25 }, { x: 0.6, y: 0 }, { x: 1, y: 0.5 },
  { x: 0.6, y: 1 }, { x: 0.6, y: 0.75 }, { x: 0, y: 0.75 }
]),
```
Los puntos son fracciones (0–1) de la caja.

## Añadir un comando con atajo (y botón en la barra lateral)
1. `app/actions.ts`: añade a `actions`:
   ```ts
   { id: 'edit.selectNone', label: 'Deseleccionar', keys: ['Mod+Shift+A'], run: () => editor.select([]) },
   ```
2. Para el menú: añade `'edit.selectNone'` a `entries` de un menú en `menus`.
3. Para la barra lateral: en `Toolbar.svelte`, añade `['edit.selectNone', 'polygon']` a `TOOLS`
   (el segundo valor es el nombre de un icono de `Icon.svelte`; añade uno nuevo allí si hace falta).

## Añadir un icono
`components/Icon.svelte`: añade una entrada a `ICONS` con el marcado SVG (viewBox 24×24, trazo `currentColor`).

## Añadir una propiedad a un objeto (ejemplo: `opacity` a las viñetas)
1. `model/types.ts`: `opacity: number;` en `PanelObj`.
2. `model/defaults.ts`: valor por defecto en `panel()` (`opacity: 1`).
3. `io/cfast.ts`: **sube `FORMAT_VERSION`** y en `migrate()` pon `o.opacity = 1` a las viñetas antiguas.
4. `components/objects/PanelView.svelte`: úsala (`<g opacity={obj.opacity}>`).
5. `components/Inspector.svelte`: añade un `<RangeField … onchange={(v) => set({ opacity: v }, 'opacity')} />`.
6. Si es una medida en píxeles, añádela a `SCALED_KEYS` en `model/scale.ts` para que cambie con el tamaño de página.

## Añadir un tipo de objeto nuevo (ejemplo: una flecha)
1. `types.ts`: interfaz `ArrowObj extends Base`, añádela a la unión `PageObject` y a `OBJECT_LABELS`.
2. `defaults.ts`: fábrica `arrow()`.
3. `components/objects/ArrowView.svelte` (con `<svelte:options namespace="svg" />`) y una rama en `ObjectView.svelte`.
4. `Inspector.svelte`: una rama `{:else if o.type === 'arrow'}` con sus campos.
5. `registry.ts`: un ítem en alguna pestaña que construya el objeto.
6. Subir `FORMAT_VERSION` solo si cambias objetos existentes (los tipos nuevos no rompen proyectos viejos).

## Añadir una operación con deshacer
En `store.svelte.ts`, dentro de la clase `Editor`:
```ts
flipHorizontal(): void {
  const ids = [...this.selection];
  // lo más simple: expresarlo como un patch (se deshace solo)
  for (const id of ids) {
    const o = this.find(id);
    if (o) this.patch([id], { x: this.doc.pageW - o.x - o.w });
  }
}
```
Si necesitas algo más complejo, usa `this.history.run({ label, redo, undo })` (ejemplos: `addObjects`, `reorder`).

## Añadir un tamaño de página
`model/defaults.ts`, lista `PAGE_PRESETS`: aparece sola en el menú Página.

## Cambiar colores de la interfaz
`src/app.css`: variables `--panel`, `--accent`, `--sel`… (claro y oscuro).

## Cambiar el logo
Sustituye `src/assets/logo.png` (grande, Acerca de) y `logo-sm.png` (alto ~96 px, barra de menú y de estado) por tus PNG con fondo transparente.

## Cambiar la versión
`package.json` (`version`), `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`. La interfaz lee la de `package.json`.

## Dónde mirar cuando…

| Síntoma | Mira |
|---|---|
| Algo no se dibuja | La vista en `components/objects/`; los `id` SVG (¿llevan `scope`?) |
| Algo se dibuja en el lienzo pero no al exportar | `io/render.ts` (recursos externos al SVG: imágenes y fuentes se incrustan ahí) |
| Un gesto no se deshace | ¿pasa por `editor.patch` o por `live()` + `commit()`? |
| Un diálogo/archivo no funciona en escritorio | `src-tauri/capabilities/default.json` (permisos) y `io/platform.ts` |
| Una imagen o fuente no carga en escritorio | `security.csp` en `src-tauri/tauri.conf.json` |
| Abrir un proyecto viejo falla | `migrate()` en `io/cfast.ts` |

## Recetas añadidas en la 0.4

- **Nueva propiedad opcional de un objeto** (como `locked`, `tailCurve`): añádela con `?` en `types.ts`, úsala en el renderizado con un valor por defecto (`o.tailCurve ?? 0`) y edítala con `set({ campo: v }, 'campo')` en `Inspector.svelte`. Al ser opcional, los proyectos viejos siguen abriendo sin migración.
- **Nuevo ajuste rápido de filtro**: añade una línea a `FX_PRESETS` en `src/lib/render/imageFx.ts`.
- **Nuevo tamaño de la interfaz**: añade el número a `UI_SCALES` en `src/lib/app/appearance.svelte.ts`.
- **Colores del tema**: variables al inicio de `src/app.css` (`:root` = claro, `:root[data-theme='dark']` = oscuro; mantén ambos bloques sincronizados con el `@media`).
