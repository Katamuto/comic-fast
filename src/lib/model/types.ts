/**
 * Modelo de datos de Comic Fast.
 *
 * El documento es SOLO DATOS (JSON serializable). Ni el lienzo ni los paneles
 * guardan estado propio: todo se dibuja a partir de esto. Eso hace trivial
 * guardar, exportar y deshacer.
 *
 * Unidades: 1 unidad = 1 píxel a 150 dpi (una página de cómic EE.UU. de
 * 6.625" x 10.25" mide ~994 x 1538).
 */

export type ID = string;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Modo de fusión (los de CSS `mix-blend-mode`): cómo se mezcla el objeto o la capa con lo que
 * hay debajo. 'normal' (o ausente) = sin mezcla. Ver render/blend.ts.
 */
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

interface Base extends Box {
  id: ID;
  /** Modo de fusión con lo que hay debajo (viñetas, imágenes y tramas; ver render/blend.ts). */
  blend?: BlendMode;
  /** Grados, sentido horario, alrededor del centro del objeto. */
  rotation: number;
  /**
   * Distorsión ondulada del dibujo completo (útil en imágenes, viñetas y trazos «temblorosos»).
   * amount: desplazamiento máximo en píxeles de página; size: tamaño de las ondas (mayor = más suaves).
   */
  distort?: { amount: number; size: number };
  /**
   * Solo en la página de estilo: `true` = por encima del contenido de cada página; si falta,
   * por debajo. Ver model/style.ts.
   */
  over?: boolean;
  /** Bloqueado: no se mueve, redimensiona, gira ni elimina (sí se puede editar su contenido). */
  locked?: boolean;
}

/**
 * Filtros de imagen. Todos opcionales y «neutros» en 0 (ver render/imageFx.ts).
 * brillo, contraste y saturación: −100…100 · tono: −180…180° · sepia: 0…100 ·
 * desenfoque: unidades de página · tinte: color que sustituye al color (útil
 * para siluetas PNG/SVG con transparencia).
 */
export interface ImageFx {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  sepia: number;
  blur: number;
  invert: boolean;
  tint: string | null;
}

/** Punto. En `PanelObj.points` está en fracciones (0..1) de la caja de la viñeta. */
export interface Pt {
  x: number;
  y: number;
}

export type DotShape = 'circle' | 'square' | 'diamond' | 'cross';

/**
 * Degradado hecho de puntos (trama de medios tonos). Tamaño y distancia (hueco entre puntos) se dan en el
 * extremo del color 1 (…1) y en el del color 2 (…2); entre medias se interpolan. Unidades: píxeles de página.
 */
export interface DotSpec {
  shape: DotShape;
  size1: number;
  size2: number;
  gap1: number;
  gap2: number;
  /** false: el degradado colorea los puntos y el fondo queda transparente. true: al revés. */
  bg?: boolean;
}

/** Degradado de dos colores. */
export interface Gradient {
  /** 'reflected': color 1 en la línea central y color 2 hacia los dos lados (espejo). */
  kind: 'linear' | 'radial' | 'reflected';
  /** Si existe, el degradado se dibuja con puntos en lugar de color continuo. */
  dots?: DotSpec;
  c1: string;
  c2: string;
  /** Solo lineal. Grados: 0 = izquierda→derecha, 90 = arriba→abajo. */
  angle: number;
  /** Solo radial: centro del degradado, en fracciones (0..1) de la caja. */
  cx: number;
  cy: number;
  /**
   * Guías arrastrables en el lienzo (fracciones 0..1 de la caja; pueden salirse un poco).
   * Lineal: p1 = inicio (color 1) y p2 = final (color 2). Reflejado: p1 = centro (color 1) y p2 = hasta dónde llega el color 2.
   * Radial: p1 = centro y la distancia p1–p2 = radio.
   * Si faltan, se usan `angle` / `cx, cy` (formato anterior).
   */
  p1?: Pt;
  p2?: Pt;
}

/** Relleno: un color sólido ('#rrggbb') o un degradado. */
export type Fill = string | Gradient;

export type PanelShape = 'rect' | 'ellipse' | 'poly';

interface LayerBase {
  id: ID;
  opacity: number;
  /** Modo de fusión con las capas de debajo y el fondo de la viñeta. */
  blend?: BlendMode;
}

/**
 * Capa de una viñeta. x, y = desplazamiento del centro de la capa respecto
 * al centro de la viñeta (unidades de página). Todo se recorta a la forma.
 */
export interface ImageLayer extends LayerBase {
  type: 'image';
  assetId: ID;
  x: number;
  y: number;
  rotation: number;
  /** Píxeles de página por píxel de la imagen original. */
  scale: number;
  fx?: ImageFx;
  flipH?: boolean;
  flipV?: boolean;
}

export interface PatternLayer extends LayerBase {
  type: 'pattern';
  kind: PatternKind;
  color: string;
  bg: string;
  scale: number;
  seed: number;
  /** Parámetro extra 0…1 de las texturas procedurales (0.5 si falta). */
  amount?: number;
  x: number;
  y: number;
  rotation: number;
}

export interface GradientLayer extends LayerBase {
  type: 'gradient';
  gradient: Gradient;
}

export type PanelLayer = ImageLayer | PatternLayer | GradientLayer;

/**
 * Viñeta: rectángulo, elipse o polígono con borde y una pila de capas
 * (imágenes, tramas, texturas, degradados) recortadas a su forma.
 */
export interface PanelObj extends Base {
  type: 'panel';
  shape: PanelShape;
  /** Vértices del polígono (solo `shape: 'poly'`), en fracciones de la caja. La caja siempre los envuelve. */
  points: Pt[];
  fill: Fill;
  stroke: string;
  strokeWidth: number;
  /** De abajo hacia arriba. */
  layers: PanelLayer[];
}

/** Imagen suelta (sin recorte). */
export interface ImageObj extends Base {
  type: 'image';
  assetId: ID;
  opacity: number;
  fx?: ImageFx;
  /** Reflejada horizontalmente (espejo izquierda↔derecha). */
  flipH?: boolean;
  /** Reflejada verticalmente (espejo arriba↔abajo). */
  flipV?: boolean;
}

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
  /** Escritura vertical (columnas de arriba a abajo, de derecha a izquierda). Opcional: por defecto horizontal. */
  vertical?: boolean;
}

export type BalloonStyle =
  | 'speech'
  | 'thought'
  | 'shout'
  | 'whisper'
  | 'caption'
  | 'jagged'
  | 'rounded'
  | 'scallop'
  | 'blob'
  | 'angular'
  | 'impact';

export interface BalloonObj extends Base, TextStyle {
  type: 'balloon';
  style: BalloonStyle;
  /** Punta de la cola, relativa al CENTRO del globo (sin rotar). */
  tailX: number;
  tailY: number;
  /** Ancho de la base de la cola como multiplicador (1 = normal; 0.2 = muy fina; 2.5 = ancha). */
  tailWidth?: number;
  /** Curvatura de la cola, −1…1 (0 = recta; el signo elige hacia qué lado se curva). */
  tailCurve?: number;
  /** Origen de la cola, relativo al CENTRO del globo (sin rotar). Falta = el centro. */
  tailOx?: number;
  tailOy?: number;
  /** Margen (px) entre el texto y el contorno. Falta = el predeterminado. */
  textMargin?: number;
  /** Encadenado con otro globo de la misma página: la cola apunta a él o los cuerpos se funden. */
  link?: { to: ID; mode: 'tail' | 'merge' };
  text: string;
  fill: Fill;
  stroke: string;
  strokeWidth: number;
}

export interface TextObj extends Base, TextStyle {
  type: 'text';
  text: string;
  /** Deformación de las letras (arco, onda, inflar, perspectiva); ver render/textWarp.ts. */
  warp?: { kind: 'arc' | 'wave' | 'bulge' | 'perspective'; amount: number };
  /** Contorno del texto (útil para onomatopeyas). strokeWidth 0 = sin contorno. */
  outline: string;
  outlineWidth: number;
  /** Relleno con degradado (si existe, manda sobre `color`). */
  fill?: Fill;
  /** Título u onomatopeya: los parámetros globales de tamaño de texto no les afectan. Falta = texto normal. */
  role?: 'title' | 'sfx';
}

/**
 * Qué se dibuja en una trama o textura:
 *  - 'grain' | 'clouds' | 'streaks' | 'blots' | 'voronoi' | 'cracks': texturas procedurales;
 *  - 'img:<id>': textura de imagen (carpeta src/assets/textures);
 *  - cualquier otro texto: id de un SVG de la carpeta src/assets/patterns (p. ej. 'dots').
 */
export type PatternKind = string;

/** Trama vectorial (medios tonos, líneas de velocidad, etc.). */
export interface PatternObj extends Base {
  type: 'pattern';
  kind: PatternKind;
  color: string;
  /** Color de fondo o 'none'. */
  bg: string;
  scale: number;
  /** Se suma al hash del id: cambiarlo da otra variante de las tramas aleatorias. */
  seed: number;
  /** Parámetro extra 0…1 de las texturas procedurales (0.5 si falta). */
  amount?: number;
  opacity: number;
}

export type PageObject = PanelObj | ImageObj | BalloonObj | TextObj | PatternObj;
export type ObjectType = PageObject['type'];

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** Un objeto aún sin id (plantilla de recurso). */
export type ObjectInit = DistributiveOmit<PageObject, 'id'>;
/** Una capa aún sin id. */
export type LayerInit = DistributiveOmit<PanelLayer, 'id'>;

export interface Page {
  id: ID;
  background: string;
  objects: PageObject[];
  /** No recibe la página de estilo (portada, contraportada…). */
  noStyle?: boolean;
  /** No cuenta en la numeración: no muestra número y no se suma a {n} ni {total}. Independiente de noStyle. */
  noNumber?: boolean;
  /** No le afectan los parámetros globales (tamaño de texto, grosores…). Independiente de las otras dos. */
  noGlobals?: boolean;
}

/**
 * Parámetros globales: si están definidos, mandan sobre el valor de cada elemento (al dibujar;
 * no se modifican los elementos). Falta = cada elemento usa el suyo.
 */
export interface Globals {
  /** Tamaño de texto de globos y cuadros de texto (px de página). */
  textSize?: number;
  /** Con textSize: no reducir el texto para que quepa; si no cabe, se marca con un marco rojo en el editor. */
  forceText?: boolean;
  /** Grosor del contorno de las viñetas. */
  panelStroke?: number;
  /** Grosor del contorno de los globos. */
  balloonStroke?: number;
}

export interface ComicDoc {
  title: string;
  pageW: number;
  pageH: number;
  pages: Page[];
  /**
   * Página de estilo: sus objetos se repiten en todas las páginas (márgenes, encabezados,
   * pies, números de página…), sin poder editarse desde ellas. Opcional: los proyectos
   * anteriores no la tienen. Ver model/style.ts.
   */
  style?: Page;
  /** Idioma del texto del cómic (código como 'es', 'ja'): lo usa el corrector ortográfico del navegador. Falta = el de la interfaz. */
  textLang?: string;
  /** Parámetros globales (ver Globals). */
  globals?: Globals;
}

/** Datos de una imagen incrustada en el proyecto. */
export interface AssetData {
  id: ID;
  name: string;
  mime: string;
  w: number;
  h: number;
  bytes: Uint8Array;
  /** Guardar en el proyecto aunque ninguna página la use (por defecto, las imágenes sin usar no se guardan). */
  keep?: boolean;
}

/** Fuente importada por la persona: viaja dentro del proyecto (.cfast). */
export interface FontData {
  id: ID;
  /** Nombre del archivo original. */
  name: string;
  /** Familia con la que se usa en los textos. */
  family: string;
  weight: '400' | '700';
  style: 'normal' | 'italic';
  mime: string;
  bytes: Uint8Array;
}

/** Imagen en memoria, lista para dibujar (con URL temporal). */
export interface Asset extends AssetData {
  url: string;
  /** Versión reducida (≤1400 px) para dibujar en el lienzo; se genera sola tras importar. */
  viewUrl?: string;
  /** Miniatura (≤320 px) para listas y tiras de páginas. */
  thumbUrl?: string;
}

/** Cambio parcial de propiedades de un objeto. */
export type Patch = Record<string, unknown>;

/** Un cambio reversible sobre un objeto. */
export interface Change {
  pageId: ID;
  id: ID;
  before: Patch;
  after: Patch;
}

export const OBJECT_LABELS: Record<ObjectType, string> = {
  panel: 'Viñeta',
  image: 'Imagen',
  balloon: 'Globo',
  text: 'Texto',
  pattern: 'Trama'
};

export const LAYER_LABELS: Record<PanelLayer['type'], string> = {
  image: 'Imagen',
  pattern: 'Trama',
  gradient: 'Degradado'
};
