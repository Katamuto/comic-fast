# 04 · Dónde y cómo se añaden los recursos

«Recurso» = cualquier cosa que el usuario puede arrastrar al lienzo o aplicar: globos, viñetas, plantillas de página, tramas, texturas, degradados, textos, fuentes y tamaños de página.
**Todo vive en archivos de código con listas de datos**; no hay base de datos ni carpeta de recursos externa (todavía). Añadir un recurso = añadir una línea a una lista.

## Mapa rápido

| Recurso | Lista donde se define | Qué más tocar |
|---|---|---|
| Globo de texto | `src/lib/resources/registry.ts` → `balloons` | nada |
| Plantilla de página (cuadrícula) | `registry.ts` → `panels` (`layoutItem`) | nada |
| Plantilla de página en diagonal | `registry.ts` → `panels` (`diagLayout`) | nada |
| Viñeta suelta rectangular | `registry.ts` → `panels` (`singlePanel`) | nada |
| Viñeta con forma (polígono/elipse) | `registry.ts` → `panels` (`shapePanel`) | nada |
| Texto / onomatopeya | `registry.ts` → `texts` (`textItem`, `sfx`) | nada |
| Degradado predefinido | `src/lib/render/paint.ts` → `GRADIENT_PRESETS` | nada |
| Trama nueva | **copiar un SVG a `src/assets/patterns/`** (ver abajo) | nada |
| Textura de imagen (tileable) | **copiar la imagen a `src/assets/textures/`** (ver abajo) | nada |
| Textura procedural nueva | `render/patterns.ts` (`PROCEDURAL`) + `render/textures.ts` | `PaintFill.svelte` |
| Nombre traducido de una carpeta/archivo | **`names.json` dentro de la carpeta** (ver abajo) | nada |
| Fuente | **copiar el archivo a `src/assets/fonts/`** (ver abajo) | nada |
| Imagen incluida / VFX / silueta | **copiar a `src/assets/resources/<Categoría>/`** (ver abajo) | nada |
| Tamaño de página habitual | `src/lib/model/units.ts` → `COMMON_SIZES` (diálogo) y `model/defaults.ts` → `PAGE_PRESETS` (submenú) | nada |
| Icono de la barra lateral | `components/Icon.svelte` → `ICONS` | `Toolbar.svelte` |

La pestaña, la miniatura, el arrastrar-y-soltar y el «soltar dentro de una viñeta» se generan solos a partir de la lista.

## Cómo es un ítem del registro

```ts
interface ResourceItem {
  id: string;                      // único dentro de su pestaña
  label: string;                   // texto bajo la miniatura
  group?: string;                  // subtítulo dentro de la pestaña («Formas», «Onomatopeyas»…)
  build(ctx): ObjectInit[];        // devuelve los objetos que se añaden a la página
  layer?(): LayerInit;             // opcional: permite soltarlo DENTRO de una viñeta como capa
}
```

`ctx` trae `pageW`, `pageH` y el punto `cx, cy` donde se colocará. **Usa proporciones del tamaño de página** (`ctx.pageW * 0.4`) en vez de píxeles fijos
y así el recurso queda bien en cualquier tamaño de página. La miniatura se dibuja con el mismo `build` sobre una página de 300 × 450.

## Recetas

### Un globo
`registry.ts`, lista `balloons`:
```ts
balloonItem({
  id: 'radio',                 // único
  label: 'Radio',
  hr: 0.45,                    // alto = ancho × 0.45
  wide: 320,                   // ancho (sobre 1000 de ancho de página)
  tail: [0, 0],                // punta de la cola (fracción del tamaño); [0,0] = sin cola
  over: { style: 'caption', text: 'Por la radio…', fill: '#e8f5e9', italic: true }
}),
```
`style` es uno de `speech | thought | shout | whisper | caption`. `tail` son fracciones del ancho/alto del globo hacia la punta de la cola.
`over` acepta cualquier propiedad de `BalloonObj`. Para un **estilo de forma nuevo** (p. ej. un globo irregular de bordes planos y dentados, que ya viene como ejemplo: «Dentado») sigue la guía paso a paso de [10 · Diseñar globos nuevos](10-globos.md).

### Una plantilla de página
```ts
layoutItem('l-mia', 'Mi plantilla', [
  { h: 1, cols: [1, 2] },   // fila 1: alto relativo 1, dos columnas (1/3 y 2/3)
  { h: 2, cols: [1] }       // fila 2: el doble de alta, una columna
]),
```
En diagonal: `diagLayout('l-diag4', 'Diagonal × 4', 4, 0.12)` (nº de viñetas y cuánto se inclina el corte).

### Una forma de viñeta
```ts
shapePanel('s-arrow', 'Flecha', 0.6, 0.26, [
  { x: 0, y: 0.25 }, { x: 0.6, y: 0.25 }, { x: 0.6, y: 0 }, { x: 1, y: 0.5 },
  { x: 0.6, y: 1 }, { x: 0.6, y: 0.75 }, { x: 0, y: 0.75 }
]),
```
`0.6, 0.26` = ancho y alto como fracción de la página. Los puntos son fracciones (0–1) de esa caja, en orden alrededor de la forma.
Una elipse: `shapePanel('s-oval', 'Óvalo', 0.5, 0.3, 'ellipse')`.
Para dibujar los puntos más fácil: un papel cuadriculado, o crea la viñeta en la app, edita sus vértices y copia los `points` desde un archivo `.cfast` (es un ZIP con `project.json`).

### Un texto / onomatopeya
```ts
textItem(sfx('sfx-bam', '¡BAM!', '#43a047')),
```
O completo con `textItem({ id, label, group, w, h, over: { text, fontFamily, fontSize, color, outline, outlineWidth, align } })`.

### Un degradado
`render/paint.ts`:
```ts
{ id: 'ocean', label: 'Océano', gradient: lin('#00c6ff', '#0072ff') },        // lineal, 90° (arriba→abajo)
{ id: 'dawn',  label: 'Amanecer', gradient: lin('#ff9a9e', '#fad0c4', 45) },  // 45°
{ id: 'moon',  label: 'Luna', gradient: rad('#ffffff', '#0b1030', 0.7, 0.3) } // radial, centro en (70 %, 30 %)
```
Aparece en la pestaña **Degradados** (suelto y como capa) y no hace falta nada más.

### Una trama nueva (la forma fácil: un SVG, sin código)
1. Dibuja un SVG con `viewBox` (Inkscape, Figma, a mano…).
2. Guárdalo en **`src/assets/patterns/`** con el código al comienzo del nombre:
   - `t_Ondas.svg` → **tileable** (`t`): se repite como mosaico dentro de su rectángulo;
   - `n_Explosión.svg` → **no tileable** (`n`): una sola figura que llena el rectángulo;
   - `Ondas.svg` (sin código) → tileable.
   El código **no se muestra**: el nombre visible es el resto («Ondas»).
3. Reinicia `npm run dev` (o vuelve a compilar): sale sola en la pestaña **Tramas**, con miniatura.

Reglas del dibujo (también están en `src/assets/patterns/README.txt`):
- En un mosaico, el tamaño del `viewBox` es el tamaño del mosaico a escala 1 (unidades de página; la página mide ~1000 × 1500). Debe encajar con sus vecinos: lo que sale por un borde entra por el opuesto.
- Usa `currentColor` (o no pongas `fill`) para que el **color** se pueda cambiar en el Inspector; los colores fijos del archivo se respetan.
- La **escala** siempre queda confinada al rectángulo: en mosaicos cambia el tamaño del mosaico; en figuras 1 = llena el rectángulo, menos = se encoge centrada, más = se amplía y se recorta. `preserveAspectRatio="none"` en el `<svg>` estira la figura a todo el rectángulo.
- Se ignoran `<script>`, `<foreignObject>` y los atributos `on…`.
- El nombre sin código es lo que se guarda en el proyecto (`kind`). **No lo cambies** si ya hay proyectos que lo usan (si falta, esa trama no se dibuja).

Las tramas que trae la app (`dots`, `dotsLarge`, `linesDiag`, `linesHoriz`, `crosshatch`, `grid`, `speedRadial`, `speedHoriz`) son archivos de esa carpeta: edítalas o bórralas. Se traducen con las claves `pattern.<nombre>` de `src/locales/*.json`.

### Una textura de imagen (tileable)
Copia imágenes que encajen al repetirse (png, webp, jpg, gif, avif, svg) a **`src/assets/textures/`**. Salen en la pestaña **Texturas**, junto a las procedurales (Grano, Nubes, Vetas, Manchas, Celdas, Grietas). Solo tienen escala y opacidad; a escala 1 miden lo que mide la imagen en píxeles. Se repiten dentro de su rectángulo. `papel.svg` es un ejemplo.

Las procedurales tienen **color con transparencia**, **Intensidad** (cuánto cubren) y **Variar** (otra semilla).

### Nombres en varios idiomas (`names.json`)
Una carpeta de recursos puede llevar un `names.json` con los nombres traducidos; si falta el archivo o el idioma, se usa el nombre de la carpeta/archivo:

```json
{
  "name":  { "es": "Paisajes", "en": "Landscapes", "ja": "風景" },
  "items": { "montaña": { "es": "Montaña", "en": "Mountain", "ja": "山" } }
}
```
- `resources/<Categoría>/names.json` y `resources/<Categoría>/<Sub>/names.json` (cada nivel tiene el suyo): `name` = la carpeta, `items` = los archivos (clave = nombre sin extensión ni `.tint`).
- `patterns/names.json` y `textures/names.json`: solo `items` (clave = nombre sin código ni extensión).
- Orden de búsqueda: idioma → idioma base (`pt-BR` → `pt`) → inglés → nombre de la carpeta/archivo. El buscador de «Incluidas» entiende los nombres de todos los idiomas.

### Una fuente (la forma fácil: sin código)
1. Consigue el archivo de la fuente: `.woff2`, `.woff`, `.ttf` u `.otf` (fonts.google.com → *Download*, o fontsource.org → *Download*).
2. Cópialo a **`src/assets/fonts/`**.
3. Reinicia `npm run dev` (o vuelve a compilar). La fuente sale sola en la lista del Inspector, y la exportación la incrusta.

**El nombre del archivo es la configuración:**

| Archivo | Resultado |
|---|---|
| `Patrick Hand.woff2` | familia «Patrick Hand», normal |
| `Patrick Hand Bold.woff2` | la misma familia, negrita |
| `Patrick Hand Italic.woff2` | cursiva |
| `Patrick Hand Bold Italic.woff2` | negrita cursiva |
| `PatrickHand-BoldItalic.ttf` | también vale el estilo de Google Fonts |

Si solo tienes la variante normal, la negrita o cursiva la simula el navegador. Comprueba la **licencia**: OFL y Apache permiten empaquetar la fuente; las fuentes comerciales normalmente no.

> **Por qué se te quedó en blanco antes.** El método anterior (instalar con `npm install @fontsource/...` y escribir un `import ... from '@fontsource/...woff2?url'` en `fonts.svelte.ts`) se rompe por completo si el paquete no está instalado o el nombre del archivo no existe: Vite no puede compilar el módulo y **toda la app falla**, no solo la fuente. Con la carpeta ya no existe ese riesgo: un archivo que falta simplemente no aparece, y uno dañado se ignora con un aviso en la consola.

### Un tamaño de página
`model/units.ts`, lista `COMMON_SIZES`: `{ id: 'a2', label: 'A2 (420 × 594 mm)', ...mm(420, 594) }` (usa `mm(…)`, `inch(…)` o `w`/`h` en píxeles).

## Imágenes incluidas con la app (pestaña «Incluidas»)

Todo lo que pongas en **`src/assets/resources/`** aparece solo en la pestaña **Incluidas**, ordenado por carpetas y con categorías desplegables. No se escribe código ni se registra nada: copias los archivos y reinicias `npm run dev`.

```
src/assets/resources/
  01-Paisajes/
    Exteriores/montaña.png        ← categoría «Paisajes», subcategoría «Exteriores»
    Interiores/sala.png
  02-Vehículos/
    Por fuera/auto-rojo.png
    Por dentro/tablero.png
  03-VFX/
    Explosiones/boom-1.png        ← PNG/WebP con fondo transparente
  04-Siluetas/
    gato.tint.svg                 ← silueta recoloreable (ver abajo)
```

Reglas:
- **Categoría** = carpeta de primer nivel; **subcategoría** = carpeta dentro de ella (más niveles se unen como «A › B»). Cada una se pliega y despliega, y la app recuerda cuáles dejaste abiertas.
- Un número y guion delante (`01-`, `02-`) **solo ordena** y no se muestra. `_` y `-` en los nombres se muestran como espacios.
- Un buscador filtra por categoría, subcategoría y nombre.
- Formatos: `png`, `webp`, `jpg`, `gif`, `avif`, `svg`.
- Clic en una imagen: se añade a la página o rellena la viñeta seleccionada. También se arrastra a una viñeta.
- Cada imagen usada se guarda **una sola vez** dentro del `.cfast`, aunque la uses diez veces.

Consejos de peso (todo lo que pongas aumenta el tamaño de la app y de la web):
- Siluetas y formas → **SVG** (con `viewBox`): casi no pesan y escalan sin perder calidad.
- VFX y recortes → PNG/WebP con transparencia, 1000–2000 px por lado, optimizados (<https://squoosh.app>).
- Paisajes e interiores grandes → WebP o JPG, ~1600–2400 px de lado mayor.

### Siluetas y formas que se pueden recolorear
Cualquier imagen con transparencia (PNG o SVG) se puede **teñir de un color**: en el Inspector, *Filtros de imagen → Teñir de un color*. El filtro sustituye todos los colores por el elegido y conserva la transparencia. Para que una imagen empiece ya teñida (porque es una silueta), ponle **`.tint`** antes de la extensión: `gato.tint.svg`, `rayo.tint.png`. La carpeta `resources/Ejemplos/` trae seis de muestra (bórrala cuando quieras).

Para un SVG que se tiñe bien: formas rellenas (cualquier color, da igual: se reemplaza) y con `viewBox`; evita dibujar contornos con `fill="none"` si quieres que el contorno también se tiña (se tiñe todo lo que tenga opacidad).

### Filtros de imagen (para cualquier imagen)
Brillo, contraste, saturación, tono, sepia, desenfoque, invertir y teñir; más siete ajustes rápidos (blanco y negro, sepia, cómic vivo, desvaído, noir, negativo). Están en el Inspector al seleccionar una imagen suelta o una capa de imagen dentro de una viñeta. Son filtros SVG: no usan librerías, se ven igual al exportar, y los datos se guardan en el proyecto (`fx`).

## Paquetes de recursos externos (idea a futuro)

La arquitectura ya lo permite: `ResourceItem.build` es solo una función. Un paquete sería una carpeta con un `manifest.json` (lista de ítems declarativos: globos, formas con puntos, degradados) que se lee al iniciar y se vuelca en `TABS`. Eso permitiría **vender o compartir packs de recursos** sin recompilar. Si algún día lo quieres, el cambio se limita a `registry.ts` y un cargador en `io/`.

## Cómo probar un recurso nuevo
1. `npm run dev`, abre la pestaña correspondiente: ¿sale la miniatura? ¿se ve bien?
2. Arrástralo a una página pequeña (Página → Tamaño: «Tira horizontal») y a una grande: debe quedar proporcionado.
3. Si es capa, suéltalo dentro de una viñeta y mira el Inspector.
4. Expórtalo a PNG: lo que ves es lo que sale.
5. `npm run check` para tipos.

## Si algo sale mal (pantalla en blanco)

La app trae una red de seguridad: si a los 4 segundos no ha dibujado nada, muestra un aviso con el último error en vez de quedarse en blanco.

| Síntoma | Causa más probable | Solución |
|---|---|---|
| Blanco tras añadir una fuente por `import` en `fonts.svelte.ts` | El paquete no está instalado o el archivo no existe | Borra la línea que añadiste; usa la carpeta `src/assets/fonts/` |
| Blanco tras copiar un archivo a `assets/` | Un archivo de recursos con nombre extraño o corrupto | Quita lo último que copiaste y reinicia `npm run dev` |
| La fuente no aparece en el Inspector | Extensión no válida o nombre mal escrito | Revisa la tabla de nombres de arriba; ver la consola (F12) |
| La imagen no aparece en «Incluidas» | Está suelta en `resources/` (sin carpeta de categoría) o falta reiniciar `npm run dev` | Pásala a `resources/<Categoría>/` |
| Una silueta SVG sale enorme o diminuta | El SVG no tiene `viewBox` | Añade `viewBox="0 0 ancho alto"` a la etiqueta `<svg>` |

Para ver el error exacto en el navegador: **F12 → Consola**. En la app de escritorio, ejecuta `npm run tauri dev` y mira la terminal y el menú de inspección (clic derecho → *Inspeccionar*).


### Imágenes importadas: quitarlas y saber cuáles no se usan
En la pestaña de imágenes del panel de recursos, clic derecho sobre una imagen → **Quitar del proyecto** (si se usa en el cómic, se quitan también esos usos; **Ctrl+Z** lo recupera todo). Las imágenes que no se usan en ninguna página (ni en la página de estilo) muestran un icono ⃠ en la esquina: **no se guardan** con el proyecto.

### SVG propios de tramas: el negro toma el color de la trama
Los SVG que dibujas en Inkscape traen el negro escrito de forma explícita (`style="fill:#000000"`). Al cargarlos, todo lo que sea negro (o casi negro) en `fill` o `stroke` pasa a `currentColor`, y por eso el color de la trama se cambia en el Inspector. Los demás colores del archivo se respetan (si dibujas con colores fijos, se quedan fijos).

### Modos de fusión
Viñetas, imágenes, tramas y texturas (como objeto o como capa de viñeta) y degradados (capa) tienen un selector **Fusión** (Multiplicar, Trama/Screen, Superponer, Oscurecer, Aclarar, Sobreexponer/Subexponer color, Luz fuerte/suave, Diferencia, Exclusión, Tono, Saturación, Color, Luminosidad). Son los de CSS (`mix-blend-mode`, ver `render/blend.ts`); CSS no tiene «Dividir»: el más parecido es *Sobreexponer color*. En una capa de viñeta se mezcla con las capas de debajo y el fondo de la viñeta; en un objeto, con todo lo que hay debajo en la página.
