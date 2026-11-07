# 14 · Editor de imágenes, reorganizar, distribuir y parámetros globales (0.11)

## Editor de imágenes
Clic derecho en una imagen de Recursos, o botón «Editar imagen» en el Inspector / capas de una viñeta. Pinceles, goma, selección (rectángulo, libre, varita mágica), recorte, transparencia y **Color a alfa**. El resultado se guarda como **recurso nuevo**; el original no se toca.

## Recursos y páginas
- Tamaño de las vistas previas (S / M / L / lista) en los paneles de Recursos y Páginas.
- Insignia de **guardar siempre** en un recurso: se guarda en el proyecto aunque no se use.
- En el móvil en vertical, la lista de páginas es un carrusel horizontal.

## Reorganizar páginas
Páginas → *Reorganizar páginas…* (o clic derecho en la lista de páginas): cuadrícula grande; arrastra una página sobre otra para moverla (en móvil, pulsación larga). Cada página tiene tres casillas: **Estilo**, **Número** y **Globales**.

## Excluir páginas del estilo y de la numeración
Portada, contraportada… Son dos opciones **independientes** (menú Página o la ventana anterior):
- Sin estilo: no recibe la página de estilo.
- Sin número: no muestra `{n}` y no cuenta; `{total}` solo cuenta las páginas numeradas.

## Distribuir imágenes y textos
Edición → *Distribuir imágenes y textos…*. Coloca los seleccionados (o todos los de la página) en filas, en orden de lectura, conservando la proporción y aprovechando el espacio. Margen y separación ajustables. Se puede deshacer. Los elementos giran a 0°.

## Parámetros globales
Página → *Parámetros globales…*: tamaño de texto, grosor de línea de viñetas y de globos. Mandan sobre cada elemento sin modificarlo (al desactivar, vuelven los valores propios).
**Excluir una página** (Página → «Excluir esta página de los parámetros globales», o la casilla *Globales* al reorganizar): esa página usa los valores propios de cada elemento. Es independiente de las exclusiones de estilo y numeración.

**Tamaño forzado**: el texto no se reduce; si no cabe, en el editor se ve un marco rojo discontinuo (no sale en lo exportado).

## Texto justificado
Inspector → Alineación → *Justificado* (solo horizontal). La última línea de cada párrafo no se estira.

## Viñetas
Al redimensionar una viñeta, sus imágenes la acompañan (mantienen el centro relativo y cubren). **Alt** mientras arrastras = cambiar solo el marco.

## Rendimiento
Al importar imágenes grandes se generan en segundo plano versiones reducidas que se usan en el lienzo (el original se usa al exportar o con mucho zoom) y en las miniaturas; la miniatura de la página actual se redibuja con 250 ms de retraso.

## Abrir proyectos .cfast
- **Doble clic** (escritorio): al instalar, el sistema asocia `.cfast` con Comic Fast (`bundle.fileAssociations`). La app recibe la ruta como argumento (Windows/Linux) o evento (macOS) y abre el proyecto al arrancar. Si ya estaba abierta, el archivo llega a esa misma ventana (plugin `single-instance`). Si ya tienes un `.cfast` asociado a otro programa, hay que reasignarlo en el sistema («Abrir con… → siempre»).
- **Arrastrar** un `.cfast` a la ventana (web y escritorio): aparece «¿Abrirlo para editarlo?»; si hay cambios sin guardar se pregunta antes.

## Límites conocidos
- Corrector: usa el del navegador/sistema (idioma del texto en Archivo); no hay autocorrección real.
- Linux: el soltar archivos usa el soporte nativo de Tauri (configuración por plataforma en `tauri.linux.conf.json`); hay que probarlo compilado.
