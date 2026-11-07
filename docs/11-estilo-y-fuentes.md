# 11 · Página de estilo, fuentes propias y menús contextuales

## Página de estilo
Una página extra (en blanco al principio) cuyo contenido se **copia en todas las páginas** como elementos fijos: no se pueden seleccionar ni editar desde las páginas. Sirve para márgenes, marcos, encabezados, pies de página y números de página.

- **Cómo se entra:** botón de arriba de la barra de herramientas (icono de página con encabezado y pie), menú *Ver → Editar la página de estilo* o **Ctrl/⌘+Mayús+Y**. Un aviso azul sobre el lienzo recuerda dónde estás y tiene el botón «Volver a la página».
- **La referencia:** el recuadro azul punteado «Contenido de cada página» representa lo que hay en cada página. No se puede seleccionar, mover ni borrar.
- **Encima o debajo:** cada elemento de estilo queda por encima o por debajo de esa referencia, y eso decide si se dibuja encima o debajo del contenido de las páginas. Se cambia con las acciones de orden (Edición → Traer al frente / Subir / Bajar / Enviar al fondo; también la barra de herramientas): un elemento que baja pasa por debajo de la referencia, uno que sube la cruza hacia arriba. Lo nuevo entra por encima.
- **Número de página:** en *Texto* hay el recurso «Número de página» (un texto con `{n}`). En cualquier texto o globo, `{n}` se muestra como el número de la página y `{total}` como el número de páginas (el cuadro del Inspector muestra el texto tal cual mientras lo editas).
- **Se guarda y se exporta:** va dentro del `.cfast` (campo opcional `style`; los proyectos anteriores se abren igual), sale en las miniaturas y en PNG/PDF/CBZ. Si cambias el tamaño de página con «escalar contenido», la página de estilo se escala también. Las imágenes que use cuentan como usadas.
- Añadir o borrar páginas desde el menú sale del modo estilo.

Código: `model/style.ts` (lógica pura: separar debajo/encima, reordenar con la referencia, `{n}`), `model/order.ts`, `PageContent.svelte` (dibujo), `store.svelte.ts` (`styleMode`, `setStyleMode`, `reorder`).

## Fuentes propias
*Archivo → Fuentes del proyecto…* o el botón «Importar o gestionar fuentes…» bajo la lista de fuentes del Inspector. Se aceptan TTF, OTF, WOFF y WOFF2 (hasta 12 MB cada una). Antes de importar hay que marcar «Entiendo y asumo esa responsabilidad»: **el usuario es responsable de comprobar la licencia** de cada fuente (uso y distribución, p. ej. al incluirla en un proyecto compartido o en páginas publicadas). Comic Fast no verifica licencias, y el EULA lo dice (cláusula 3).

- El nombre del archivo da la familia y el estilo: «Patrick Hand Bold Italic.ttf» → familia *Patrick Hand*, negrita cursiva (mismas reglas que `src/assets/fonts`, ver `render/fontFiles.ts`).
- Las fuentes viajan **dentro del proyecto** (`fonts/` del `.cfast`), así el cómic se ve igual en otro equipo, y se incrustan al exportar. No se comparten entre proyectos: hay que importarlas en cada uno.
- Importar o quitar una fuente no es deshacible (Ctrl+Z); marca el proyecto como modificado.

Código: `render/userFonts.svelte.ts`, `components/FontDialog.svelte`, `io/cfast.ts`, `io/render.ts`.

## Menús contextuales (clic derecho)
- **Lienzo:** Cortar, Copiar, Pegar, Duplicar, Eliminar (con atajos; selecciona lo que hay bajo el puntero).
- **Lista de páginas:** Nueva página y Eliminar página (sobre una miniatura, respecto a esa página).
- **Imágenes importadas del panel de recursos:** Quitar del proyecto.
- **Cualquier otra zona** (barras, paneles, diálogos): ningún menú, tampoco el del navegador. Los campos de texto conservan el suyo (copiar/pegar texto).

Para añadir un menú a otra zona: en su componente, `oncontextmenu={(e) => { e.preventDefault(); e.stopPropagation(); contextMenu.show(e.clientX, e.clientY, entradas); }}`, con `entradas` de `actionEntries([...ids de acción])` o una lista `{ label, run }` (ver `app/contextMenu.svelte.ts`).

## Objetos fuera de la página
Un objeto que queda **por completo fuera** de la página (al soltarlo desde el panel de recursos, o al arrastrarlo, redimensionarlo o girarlo) se elimina, porque no se vería. Ctrl+Z lo devuelve. Basta con que asome un poco para que se conserve.
