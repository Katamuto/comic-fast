# 01 · Conceptos: las tecnologías del proyecto

Cada sección termina con **dónde se ve en este proyecto**.

## 1. El mapa general

```
Tu código TypeScript + Svelte  ──(Vite lo empaqueta)──►  HTML + JS + CSS
                                                              │
                         ┌────────────────────────────────────┤
                         ▼                                    ▼
                  Navegador (npm run dev)         Tauri: ventana nativa (Rust) que
                  http://localhost:1420           muestra ese mismo HTML (npm run tauri dev)
```

| Pieza | Qué es | Analogía en juegos |
|---|---|---|
| **TypeScript** | JavaScript con tipos (el compilador te avisa de errores antes de ejecutar) | GDScript con tipado estático (`var x: int`) |
| **Svelte 5** | Biblioteca para construir interfaz: describes *cómo se ve* según los datos y se actualiza sola | Nodos de UI de Godot conectados por señales, pero automático |
| **Vite** | Servidor de desarrollo + empaquetador (`npm run dev`, `npm run build`) | El "exportar proyecto" + recarga en caliente del editor |
| **Tauri 2** | Empaqueta la web como app de escritorio usando el WebView del sistema (instalador pequeño) | El *export template* del motor |
| **npm / package.json** | Gestor de dependencias y scripts | `pip` + `requirements.txt` + un Makefile pequeño |
| **Vitest** | Ejecuta las pruebas (`*.test.ts`) | `pytest` |

## 2. TypeScript en 10 minutos

```ts
// Tipos básicos
let n: number = 3;            // no hay int/float: todo es number
let s: string = 'hola';
let ok: boolean = true;
let lista: number[] = [1, 2, 3];
let punto: { x: number; y: number } = { x: 1, y: 2 };   // como un dict con forma fija

// interface = "struct" (solo describe la forma)
interface Box { x: number; y: number; w: number; h: number }

// Unión de tipos: "una de estas cosas". Es la herramienta más importante del proyecto.
type Fill = string | Gradient;                  // un color o un degradado
type PageObject = PanelObj | ImageObj | BalloonObj;   // cada uno tiene `type: 'panel' | 'image' | ...`

// "Discriminated union": el campo `type` dice cuál es, y TypeScript lo sabe dentro del if
function describe(o: PageObject) {
  if (o.type === 'balloon') return o.text;   // aquí TS sabe que `o` es BalloonObj
  return o.type;
}

// Parámetros opcionales y valores por defecto
function f(a: number, b = 10, c?: string) {}

// Funciones flecha (lambdas)
const doble = (x: number) => x * 2;

// Desestructurar (como el "unpacking" de Python)
const { x, y } = punto;
const copia = { ...punto, x: 5 };     // copia con un campo cambiado (muy usado aquí)
const nueva = [...lista, 4];

// `?.` y `??`: acceso seguro y valor por defecto
const largo = maybe?.texto?.length ?? 0;

// import / export (módulos). `import type` solo importa tipos y desaparece al compilar.
import { editor } from './store.svelte';
import type { Box } from './types';
```

Diferencias que sorprenden viniendo de Python/C:

- `===` compara sin conversiones (usa siempre `===`, nunca `==`).
- Los objetos y arrays se pasan **por referencia**. Para copiar: `structuredClone(x)` (copia profunda) o `{ ...x }` (superficial).
- `undefined` y `null` existen los dos; `strict` en `tsconfig.json` te obliga a tratarlos.
- No hay enteros: `Math.round`, `Math.floor`… son la forma de redondear.

**Dónde se ve:** `src/lib/model/types.ts` es todo el modelo en tipos. Léelo primero.

## 3. Svelte 5: componentes y *runes*

Un archivo `.svelte` mezcla tres cosas: lógica (`<script>`), estructura (HTML/SVG) y estilo (`<style>`, solo afecta a ese componente).

```svelte
<script lang="ts">
  let { label, value, onchange } = $props();     // parámetros del componente (como @export)
  let abierto = $state(false);                   // estado local: si cambia, la vista se actualiza
  const doble = $derived(value * 2);             // valor calculado: se recalcula solo
  $effect(() => { console.log(value); });        // efecto secundario cuando cambia algo que lee
</script>

<button onclick={() => (abierto = !abierto)}>{label}: {doble}</button>

{#if abierto}
  <ul>
    {#each [1, 2, 3] as n (n)}   <!-- (n) = clave, para reutilizar elementos -->
      <li>{n}</li>
    {/each}
  </ul>
{/if}
```

Los *runes* (`$state`, `$derived`, `$effect`, `$props`) son lo que distingue Svelte 5:

| Rune | Equivalente mental |
|---|---|
| `$state(x)` | Variable "observable". Asignarla o mutar sus campos repinta lo que dependa de ella. Los objetos/arrays son *proxies* profundos. |
| `$state.raw(x)` | Igual pero **solo** reacciona si reemplazas el valor entero (más barato; se usa para las imágenes cargadas). |
| `$derived(expr)` / `$derived.by(() => …)` | Valor calculado con caché. Como una *property* con getter. |
| `$effect(() => …)` | Se ejecuta cuando cambian las cosas que lee. Para sincronizar con el exterior (título de ventana, listeners). |
| `$props()` | Recibe los parámetros del componente padre. |
| `$state.snapshot(x)` | Copia plana de un proxy (para guardar en el historial o serializar). |

Atajos de plantilla que verás: `onclick={fn}` (evento), `class:activo={cond}` (clase condicional), `style:left="{x}px"`,
`bind:this={elemento}` (referencia al nodo DOM), `{#snippet}` (no se usa aquí).

**SVG:** el lienzo es SVG (dibujo vectorial declarativo: `<rect>`, `<path>`, `<image>`, `<g transform>`…).
Un componente cuyo elemento raíz es SVG necesita `<svelte:options namespace="svg" />` arriba (ya está en todos los de `components/objects/`).

**Archivos `.svelte.ts`:** los runes también funcionan en `.ts` si el nombre termina en `.svelte.ts`. Por eso `store.svelte.ts`
puede tener estado reactivo fuera de un componente.

**Dónde se ve:** `Inspector.svelte` (formularios), `Toolbar.svelte` (lista → botones), `components/objects/PanelView.svelte` (SVG).

## 4. Vite

- `npm run dev` arranca un servidor con recarga instantánea al guardar (puerto 1420).
- `npm run build` genera la carpeta `dist/` optimizada.
- `vite.config.ts` es su configuración. Aquí solo hace dos cosas: activar el plugin de Svelte e inyectar `__APP_VERSION__` (leída de `package.json`).
- Importar un archivo que no es código funciona: `import logo from '../../assets/logo.png'` te da la URL final.
  Con sufijo `?url` (fuentes) también.

## 5. Tauri 2

- Una app Tauri = **ventana nativa** + **tu web dentro**. La parte Rust (`src-tauri/`) casi no se toca: abre la ventana y registra *plugins*.
- Para acceder al sistema (diálogos de archivo, leer/escribir archivos) se usan plugins JS:
  `@tauri-apps/plugin-dialog` y `@tauri-apps/plugin-fs`. Los usa `src/lib/io/platform.ts`, que además tiene alternativas para el navegador.
- **Permisos:** Tauri 2 bloquea todo por defecto. `src-tauri/capabilities/default.json` lista lo permitido.
  Si añades una función del sistema nueva y "no hace nada", casi seguro falta un permiso aquí.
- **CSP** (`tauri.conf.json` → `security.csp`): reglas de qué recursos puede cargar la web. Si una imagen o fuente nueva no carga, revisa esto.
- `dragDropEnabled: false` en la ventana: así el arrastrar-y-soltar HTML funciona también en Windows.
- Comandos: `npm run tauri dev` (ventana nativa con recarga), `npm run tauri build` (instalador).

## 6. El patrón Command (deshacer/rehacer)

Cada operación del usuario es un objeto con `redo()` y `undo()`. El historial guarda la lista y se mueve por ella.
Es la misma idea que un sistema de *undo* en un editor de niveles. Mira `src/lib/model/history.ts` (corto y con pruebas).

- Operación puntual → `editor.patch(ids, cambios)`.
- Gesto continuo (arrastrar) → mientras se arrastra `editor.live(...)` (sin historial) y al soltar `editor.commit(...)` (un solo comando).

## 7. Pruebas

`*.test.ts` junto al código. `npm test` las ejecuta con Vitest. Solo se prueba la **lógica pura** (geometría, historial, formato de archivo, texturas…);
la interfaz se prueba a mano. Una buena costumbre: si escribes una función de cálculo nueva, escribe su prueba en el archivo `.test.ts` más cercano.
