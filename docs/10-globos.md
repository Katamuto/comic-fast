# 10 · Diseñar globos nuevos (formas y estilos)

Un globo tiene dos partes que conviene separar:

| Parte | Qué es | Dónde vive |
|---|---|---|
| **Forma** (estilo) | El contorno: óvalo, nube, explosión, dentado… Es un *trazado SVG calculado por código* a partir del tamaño del globo. | `src/lib/render/balloon.ts` |
| **Plantilla** (recurso) | Una tarjeta de la pestaña Globos que inserta un globo con un estilo, tamaño, fuente, colores y texto de ejemplo. | `src/lib/resources/registry.ts` |

Hoy las formas **no se leen de archivos SVG** (a diferencia de las tramas): se programan. La buena noticia es que una forma nueva son ~30 líneas y hay un ejemplo real y completo, el globo **Dentado** (lados rectos con dientes irregulares), que puedes copiar y modificar. Esta guía lo explica paso a paso.

> Si solo quieres otro **aspecto** de un globo que ya existe (otro color, otra fuente, más grande, sin cola…), no necesitas forma nueva: es una *plantilla* nueva (Receta 1).

---

## 1. Cómo se dibuja un globo (lo imprescindible)

`balloonGeometry(globo)` recibe el tamaño (`w`, `h`), el grosor del borde (`strokeWidth`), la posición de la cola (`tailX`, `tailY`, relativa al centro) y el `style`, y devuelve:

```ts
{
  d: string,          // el contorno, como atributo `d` de un <path> SVG
  dots: Dot[],        // circulitos extra (solo el globo de pensamiento los usa)
  tip: {x, y},        // punta de la cola
  hasTail: boolean,   // ¿hay cola? (activa el tirador de la cola en el lienzo)
  textBox: Box,       // rectángulo interior donde se coloca el texto
  dashed: boolean     // borde discontinuo (susurro)
}
```

Reglas del sistema de coordenadas:

- El origen (0, 0) es la **esquina superior izquierda** de la caja del globo; la caja mide `w × h`.
- El borde se dibuja **centrado** sobre el trazado, así que la mitad del grosor sale hacia fuera. Por eso se usa `inset = strokeWidth / 2`: el trazado debe quedarse al menos `inset` dentro de la caja para que el borde no se corte.
- Redondea los números (`f(n)`, ya definido en el archivo) para que el SVG no se llene de decimales.
- El relleno y el borde (color, degradado, grosor, transparencia) los pone el Inspector: tu forma **solo da el contorno**.

El texto se ajusta solo al `textBox` (reduce el tamaño de letra si no cabe). Hazlo un poco más pequeño que el globo para que quede margen respecto a las puntas o curvas.

---

## 2. Receta 1 · Una plantilla nueva (sin programar formas)

En `registry.ts`, lista `balloons`:

```ts
balloonItem({
  id: 'speech-big',            // identificador único (también para la traducción)
  label: 'Diálogo grande',     // nombre en español si falta la traducción
  hr: 0.55,                    // alto = ancho × hr
  wide: 420,                   // ancho en unidades de página (por defecto 300)
  tail: [-0.25, 0.9],          // punta de la cola: fracciones del ancho/alto desde el centro; [0, 0] = sin cola
  over: { style: 'speech', text: '¡Hola!', fontFamily: 'Bangers', fontSize: 40, fill: '#fff3b0' }
}),
```

`over` acepta cualquier propiedad de globo (`style`, `text`, `fontFamily`, `fontSize`, `bold`, `italic`, `align`, `fill`, `stroke`, `strokeWidth`, `tailWidth`, `tailCurve`). Para el nombre traducido añade `"res.balloons.speech-big"` a cada `src/locales/*.json`.

---

## 3. Receta 2 · Una forma nueva (ejemplo: el globo Dentado)

Es exactamente lo que se hizo para el globo **Dentado**. Los pasos son siempre los mismos:

### Paso 1 — Declarar el estilo (`src/lib/model/types.ts`)

```ts
export type BalloonStyle = 'speech' | 'thought' | 'shout' | 'whisper' | 'caption' | 'jagged';
```

### Paso 2 — Escribir la función del contorno (`render/balloon.ts`)

La idea del dentado: rectángulo cuya línea base queda `depth` hacia dentro; sobre cada lado se reparten dientes (un punto exterior entre dos puntos de la base) con altura y posición algo irregulares, pero **calculadas con una función estable** (no `Math.random`), para que el mismo globo salga igual siempre, al guardar, exportar y deshacer.

```ts
function hash01(n: number): number {            // «aleatorio» estable 0…1
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function jaggedPath(w: number, h: number, inset: number, depth: number): string {
  const a = inset + depth;                       // la base queda depth dentro; las puntas llegan a inset
  const corners = [ {x:a,y:a}, {x:w-a,y:a}, {x:w-a,y:h-a}, {x:a,y:h-a} ];
  const normals = [ {x:0,y:-1}, {x:1,y:0}, {x:0,y:1}, {x:-1,y:0} ];   // hacia fuera de cada lado
  let d = `M ${f(corners[0].x)} ${f(corners[0].y)} `;
  for (let k = 0; k < 4; k++) {                  // 4 lados
    const p0 = corners[k], p1 = corners[(k + 1) % 4], nrm = normals[k];
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const n = Math.max(2, Math.round(len / (depth * 1.9)));            // cuántos dientes
    const ux = (p1.x - p0.x) / len, uy = (p1.y - p0.y) / len;          // dirección del lado
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, seg = len / n;
      const mid = { x: p0.x + (p1.x - p0.x) * ((t0 + t1) / 2), y: p0.y + (p1.y - p0.y) * ((t0 + t1) / 2) };
      const out = depth * (0.6 + 0.4 * hash01(k * 100 + i));           // altura irregular
      const slide = (hash01(k * 100 + i + 50) - 0.5) * seg * 0.35;     // desplazamiento a lo largo del lado
      d += `L ${f(mid.x + nrm.x * out + ux * slide)} ${f(mid.y + nrm.y * out + uy * slide)} `;  // la punta
      d += `L ${f(p0.x + (p1.x - p0.x) * t1)} ${f(p0.y + (p1.y - p0.y) * t1)} `;                 // vuelve a la base
    }
  }
  return d + 'Z';
}
```

Comandos de trazado que necesitas: `M x y` (empezar), `L x y` (línea recta), `Q cx cy x y` (curva con un punto de control), `C …` (curva con dos), `A rx ry 0 largo sentido x y` (arco), `Z` (cerrar). Para unos **bordes planos y dentados** bastan `M`, `L` y `Z`; para bordes redondeados u ondulados usa `Q` o `A` (mira `cloudPath` para arcos y la cola curva de `speech` para `Q`).

### Paso 3 — Conectarla en `balloonGeometry`

Antes del `// speech / whisper` final, un bloque `if` para el estilo:

```ts
if (o.style === 'jagged') {
  const depth = clampN(Math.min(w, h) * 0.07, 6, 28);   // altura de los dientes según el tamaño
  return {
    d: jaggedPath(w, h, inset, depth),
    dots: [],
    tip,
    hasTail: false,                                      // sin cola
    textBox: { x: w * 0.12, y: h * 0.17, w: w * 0.76, h: h * 0.66 },
    dashed: false
  };
}
```

Si tu forma **sí** lleva cola, mira cómo lo hace `speech` (calcula dos puntos de la base sobre el contorno, y `L` o `Q` hasta `tip`) y pon `hasTail: true`; y añade tu estilo a la condición de `tailFrame()` si quieres el tirador de curvatura.

### Paso 4 — Que aparezca en el Inspector

`src/lib/components/Inspector.svelte`:

```ts
const BALLOON_STYLES = ['speech', 'thought', 'shout', 'whisper', 'caption', 'jagged'] as const;
```

### Paso 5 — Ponerla en los recursos (la tarjeta de la pestaña Globos)

`registry.ts`, dentro de `balloons`:

```ts
balloonItem({ id: 'jagged', label: 'Dentado', hr: 0.6, tail: [0, 0], wide: 320,
              over: { style: 'jagged', text: '¡Alerta!', bold: true } }),
```

### Paso 6 — Traducir

En cada `src/locales/*.json`: `"balloon.style.jagged"` (nombre en el desplegable del Inspector) y `"res.balloons.jagged"` (nombre de la tarjeta).

### Paso 7 — Probar

Añade una prueba en `src/lib/render/v08.test.ts` (hay una para el dentado): que el trazado no se sale de la caja y que `balloonGeometry` devuelve lo esperado. Ejecuta `npm test`.

---

## 4. Receta 3 · Pasar un dibujo (Inkscape) a una forma

Si prefieres **dibujar** la forma:

1. En Inkscape dibuja el contorno con un lienzo de, por ejemplo, **100 × 60** y conviértelo en un único trazado (*Trazado → Objeto a trazado*, Mayús+Ctrl+C). Con segmentos rectos es lo más sencillo; con curvas, mira la nota de abajo.
2. Abre el editor XML (Ctrl+Mayús+X) y copia los puntos del atributo `d`.
3. Conviértelos a **fracciones** (divide cada x entre 100 y cada y entre 60) y guárdalos en una lista. La forma se estira con el globo:

```ts
const MI_FORMA: [number, number][] = [[0.05, 0.1], [0.5, 0.0], [0.95, 0.1], [1.0, 0.9], [0.5, 1.0], [0.0, 0.8]];

function fixedPath(points: [number, number][], w: number, h: number, inset: number): string {
  const iw = w - 2 * inset, ih = h - 2 * inset;         // espacio útil dentro del borde
  return points.map(([x, y], i) => `${i ? 'L' : 'M'} ${f(inset + x * iw)} ${f(inset + y * ih)}`).join(' ') + ' Z';
}
```

4. Úsala en un bloque `if (o.style === 'mi-forma')` igual que en el paso 3.

Con curvas de Inkscape (comandos `c`, `s`, `q`, `a`…) las coordenadas relativas son incómodas: en Inkscape, *Preferencias → Entrada/Salida → Salida SVG → Datos de trazado → Formato: Absoluto* hace que `d` use solo letras mayúsculas (`M`, `C`, `L`…) con coordenadas absolutas, que se escalan igual que los puntos de la lista (cada pareja x, y de un `C` es un punto).

---

## 5. Trucos y comprobaciones

- **Tamaños muy distintos:** el globo se puede estirar mucho. Calcula tamaños relativos (`Math.min(w, h) * 0.07`) y ponles límites (`clampN`), como hace el dentado, o los dientes se volverán enormes o diminutos.
- **No uses `Math.random()`:** haría que la forma cambie en cada dibujo. Usa una función estable como `hash01(índice)`; si quieres variantes, añade un parámetro (por ejemplo la `seed` que ya usan las tramas).
- **Texto:** si la forma tiene puntas hacia dentro, achica `textBox` (el dentado usa 76 % × 66 %).
- **Proyectos antiguos:** nunca cambies el id de un estilo existente (`speech`, `shout`…): los proyectos guardados lo usan. Un estilo desconocido se dibuja como diálogo.
- **Ver el resultado rápido:** `npm run dev`, arrastra la tarjeta a la página y mueve las esquinas: la forma se recalcula en vivo.

## 6. Estilos nuevos, texto por contorno, origen de cola y encadenado (0.13)

- **Estilos como polígonos** (`render/balloonShapes.ts`): `rounded`, `scallop`, `blob`, `angular` e `impact` se generan como listas de puntos deterministas. Una cola se pega con `cutPolygon` (recorta un tramo del contorno y lo sustituye por la punta). `impact` no lleva cola (como `shout`).
- **Texto por contorno** (`render/contourText.ts`): `balloonGeometry` devuelve `contour` (polígono). `fitContourText` busca el menor número de líneas que quepan, usando el ancho real de cada franja menos `textMargin`. Los estilos sin `contour` (narración, dentado, grito, impacto) usan `textBox`.
- **Origen de la cola**: `tailOx/tailOy` (relativos al centro). La cola sale por donde el rayo origen→punta cruza el contorno.
- **Encadenado** (`model/balloonLinks.ts`): `link: { to, mode }`. `tail` calcula la punta sobre la elipse del otro globo; `merge` dibuja los globos del grupo en tres pasadas (borde doble, relleno, texto) para que el borde rodee solo la silueta unida.

## Resumen de archivos

| Qué quieres | Tocas |
|---|---|
| Otra plantilla de un globo existente | `registry.ts` (+ `locales/*.json` para el nombre) |
| Una forma nueva | `types.ts` (`BalloonStyle`), `render/balloon.ts` (función + bloque `if`), `Inspector.svelte` (`BALLOON_STYLES`), `registry.ts`, `locales/*.json`, una prueba |
