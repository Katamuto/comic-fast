# 13 · Degradados (reflejado y de puntos), deformar y arrastrar recursos

## Degradado reflejado
Tercer tipo de degradado, junto a Lineal y Radial: el **color 1 está en una línea central** y el **color 2 hacia los dos lados** (espejo). En el lienzo, las dos guías son: el centro (color 1) y hasta dónde llega el color 2. Código: `kind: 'reflected'` en `Gradient` (`model/types.ts`); la geometría está en `gradientGeometry` (`render/paint.ts`) y `GradientDefs.svelte` lo dibuja con tres paradas (c2 – c1 – c2).

## Degradado de puntos (trama)
Cualquier degradado (lineal, reflejado o radial) puede dibujarse con **puntos**: casilla «Hecho de puntos (trama)» en el editor de degradado. Sirve en el relleno de viñetas y globos y en las capas de degradado de una viñeta.

| Opción | Qué hace |
|---|---|
| Forma del punto | círculo, cuadrado, rombo o X |
| Tamaño (color 1 / color 2) | tamaño del punto en cada extremo; entre medias se interpola |
| Distancia (color 1 / color 2) | hueco entre puntos en cada extremo; también se interpola |
| Color en el fondo | desactivado: el degradado colorea los **puntos** y el fondo queda transparente. Activado: colorea el **fondo** y los puntos quedan huecos |

Cómo funciona (`render/dotGradient.ts`, solo geometría, con pruebas en `dots.test.ts`):
- Los puntos se colocan en filas perpendiculares al eje del degradado (anillos concéntricos en el radial), alternadas media posición (trama hexagonal). Cada fila usa su propia separación, interpolada: así la trama cambia de forma continua.
- Todos los puntos forman **un único trazo SVG**, y ese trazo se rellena con el propio degradado: el color sale gratis. Con «color en el fondo» se usa una `<mask>`.
- Hay un **tope de 20 000 puntos** por degradado; si los parámetros pedirían más, todo se agranda en proporción (así el archivo y la edición no se vuelven pesados).
- En un globo, los círculos de la cola de pensamiento usan el color 1 liso.
- Se guarda en el proyecto como un campo opcional (`dots`) del degradado: los archivos antiguos no cambian.

Puede sustituir a las tramas de puntos prediseñadas: una capa de degradado de puntos con color 1 = color 2 y tamaños iguales equivale a una trama uniforme.

## Deformar
Dos herramientas distintas, ambas en el Inspector:

1. **Deformar texto** (solo objetos de texto, pensado para onomatopeyas): Arco, Onda, Inflar y Perspectiva, con una intensidad de −100 a 100 (el signo invierte el efecto: ∩/∪, etc.). Cada letra se dibuja por separado con su posición, giro y escala (`render/textWarp.ts`), así que sigue siendo vectorial y sale igual al exportar. No se aplica al texto vertical.
2. **Distorsión** (cualquier objeto: imágenes, viñetas, globos, tramas, texto): ondulado irregular del dibujo entero. «Cantidad» = desplazamiento máximo en píxeles de página; «Tamaño de las ondas» = lo suaves que son. Es un filtro SVG (`feTurbulence` + `feDisplacementMap`) aplicado en `ObjectView.svelte`.

Límites: la deformación de texto no ajusta el tamaño a la caja (si se infla mucho, puede salirse; agranda el objeto). La distorsión no es una deformación libre por puntos (esa herramienta no existe aún).

## Arrastrar recursos a la página
Los recursos del panel (globos, tramas, imágenes importadas e incluidas…) se arrastran con el **puntero** (`app/resourceDrag.svelte.ts`), no con el arrastrar-y-soltar de HTML5:
- ratón o lápiz: basta con empezar a arrastrar; un clic simple sigue añadiendo el recurso;
- dedo: mantener pulsado ~0,3 s y arrastrar (si se mueve antes, la lista se desplaza);
- una copia de la miniatura sigue al puntero; al soltar sobre el lienzo se coloca ahí. Sobre una viñeta, una imagen la rellena y una trama/textura/degradado entra como capa.

## Soltar imágenes desde el sistema
Arrastra archivos de imagen desde el explorador a **cualquier parte** de la ventana: aparece un velo «Suelta aquí las imágenes» y se añaden a Recursos. Si los sueltas sobre la página, además se colocan donde los soltaste (o rellenan la viñeta que haya debajo). Los archivos que no son imágenes se ignoran con un aviso.
