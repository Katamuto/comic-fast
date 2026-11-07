# Guías de estudio de Comic Fast

Material para entender el proyecto rápido y poder cambiarlo por tu cuenta.
Está pensado para alguien que ya programa (Python, C, GDScript) pero es nuevo en tecnologías web/escritorio.

| Guía | Para qué sirve | Tiempo |
|---|---|---|
| [01 · Conceptos](01-conceptos.md) | Qué son TypeScript, Vite, Svelte 5 y Tauri, **explicados con equivalentes de GDScript/C/Python** | 30 min |
| [02 · Recorrido del código](02-recorrido.md) | Mapa de carpetas, cómo fluye un dato desde un clic hasta la pantalla, qué hace cada archivo | 45 min |
| [03 · Recetas](03-recetas.md) | Pasos exactos para los cambios más comunes (nuevo globo, nueva trama, nuevo atajo, nueva propiedad…) | consulta |
| [04 · Recursos](04-recursos.md) | Dónde y cómo añadir globos, plantillas, formas, tramas, texturas, degradados, **fuentes** (carpeta), **imágenes/siluetas** (carpeta) y tamaños; filtros; qué hacer si sale en blanco | consulta |
| [05 · Publicar](05-publicar.md) | Web (Cloudflare/GitHub Pages + dominio), ejecutable de escritorio, GitHub Actions, variables | consulta |
| [06 · Donativos](06-donativos.md) | Botón de donativo (`src/site.config.ts`) | consulta |
| [07 · Idiomas](07-idiomas.md) | Cómo funcionan las traducciones y cómo añadir un idioma, la guía o el EULA | consulta |
| [08 · Avisos](08-avisos.md) | La campanita de la versión web (`avisos.json`) | consulta |
| [09 · Descargas](09-descargas.md) | El botón «Obtener versión de escritorio» de la web (`descargas.json`) | consulta |
| [10 · Globos](10-globos.md) | Cómo diseñar formas de globo nuevas, paso a paso (ejemplo: Dentado) | receta |
| [11 · Estilo y fuentes](11-estilo-y-fuentes.md) | Página de estilo, fuentes propias, menús contextuales | consulta |
| [13 · Degradados y deformar](13-degradados-y-deformar.md) | Degradado reflejado y de puntos, deformar texto, distorsión, arrastrar recursos, soltar imágenes | consulta |
| [14 · Editor de imágenes y más](14-editor-de-imagenes-y-mas.md) | Editor de imágenes, reorganizar, distribuir, parámetros globales, justificado | consulta |
| [15 · Dibujar, tableta y plantillas](15-dibujo-y-plantillas.md) | Nuevo dibujo, bote/gota/dedo, puntas de pincel, presión de tableta, plantillas de proyecto | consulta |
| [12 · Móvil y vertical](12-movil-y-vertical.md) | Interfaz para teléfonos, gestos, pantalla completa/PWA y texto vertical | consulta |

## Ruta sugerida

1. Ejecuta la app (`npm install` y `npm run dev`, ver README principal) y juega 10 minutos con ella.
2. Lee **01 · Conceptos** con la app abierta.
3. Lee **02 · Recorrido** y abre en tu editor los archivos que va nombrando. Empieza por
   `src/lib/model/types.ts` (los datos) y `src/lib/model/store.svelte.ts` (las operaciones).
4. Haz tu primera modificación con **03 · Recetas** (la más fácil: añadir un globo a `registry.ts`).
5. Cuando algo falle: `npm run check` te dice errores de tipos; `npm test` verifica la lógica pura.

## Idea central (si solo recuerdas una cosa)

> **El documento es solo datos.** Una página es una lista de objetos (`panel`, `image`, `balloon`, `text`, `pattern`).
> Todo lo demás (lienzo, miniaturas, exportación PNG/PDF) es una *función* que dibuja esos datos.
> Para cambiar algo del documento, cambias los datos a través de `editor` (que apunta cada cambio en el historial de deshacer).

Es el mismo patrón que un juego con *estado* separado del *render*.
