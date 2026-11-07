/**
 * Núcleo de traducción: funciones PURAS (sin Svelte ni Vite), para poder probarlas.
 * La parte reactiva (el idioma actual) está en index.svelte.ts y los archivos de
 * idioma se descubren en locales.ts.
 */

/** Un idioma = un diccionario plano «clave → texto». */
export type Dict = Record<string, string>;
export type Params = Record<string, string | number>;

/** Orden en que se ofrecen los idiomas conocidos; el resto va después, por nombre. */
export const LANGUAGE_PRIORITY = ['es', 'en', 'ja', 'ko', 'fr', 'zh', 'pt'];

/** Idioma de reserva cuando el del sistema no está disponible. */
export const FALLBACK_LANG = 'en';

/** Sustituye {nombre} por su valor. Lo que no tenga valor se deja tal cual. */
export function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (all, k: string) => (k in params ? String(params[k]) : all));
}

/**
 * Busca `key` en el idioma pedido y, si falta, en inglés, en español y en el
 * texto de reserva. Así una traducción a medias nunca deja la interfaz vacía.
 */
export function translate(dicts: Record<string, Dict>, lang: string, key: string, params?: Params, fallback?: string): string {
  const text = dicts[lang]?.[key] ?? dicts[FALLBACK_LANG]?.[key] ?? dicts.es?.[key] ?? fallback ?? key;
  return interpolate(text, params);
}

/**
 * Elige el idioma a partir de los del sistema (p. ej. navigator.languages):
 *   «ja-JP» → «ja» · «zh-TW» → «zh-TW» si existe ese archivo, si no «zh» · «pt-BR» → «pt».
 * Si ninguno está disponible, devuelve el inglés (o el primero que haya).
 */
export function detectLanguage(preferred: readonly string[], available: readonly string[]): string {
  const have = new Map(available.map((a) => [a.toLowerCase(), a]));
  for (const raw of preferred) {
    const parts = raw.replace(/_/g, '-').toLowerCase().split('-');
    for (let n = parts.length; n >= 1; n--) {
      const hit = have.get(parts.slice(0, n).join('-'));
      if (hit) return hit;
    }
  }
  return have.get(FALLBACK_LANG) ?? available[0] ?? FALLBACK_LANG;
}

/** Ordena los códigos de idioma: primero los prioritarios, luego alfabéticamente. */
export function sortLanguages(codes: readonly string[]): string[] {
  const rank = (c: string) => {
    const i = LANGUAGE_PRIORITY.indexOf(c.split('-')[0]);
    return i < 0 ? LANGUAGE_PRIORITY.length : i;
  };
  return [...codes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/**
 * Elige el archivo de un idioma de una carpeta de textos largos (guía, EULA):
 * el idioma pedido (con su variante regional y luego el idioma base), después
 * inglés y por último español.
 */
export function pickDocument<T>(docs: Record<string, T>, lang: string): T | undefined {
  const base = lang.split('-')[0];
  return docs[lang] ?? docs[base] ?? docs[FALLBACK_LANG] ?? docs.es ?? Object.values(docs)[0];
}

/** Error con clave de traducción: `message` queda en español (útil en pruebas y registros). */
export class TKError extends Error {
  constructor(
    public key: string,
    message: string,
    public params?: Params
  ) {
    super(message);
  }
}

/** Nombre de un recurso en varios idiomas: { "es": "Gato", "en": "Cat", "ja": "猫" }. */
export type Names = Record<string, string>;

/** Contenido de un `names.json` dentro de una carpeta de recursos. */
export interface NamesFile {
  /** Nombre de la propia carpeta (categoría o subcategoría). */
  name?: Names;
  /** Nombres de los archivos de la carpeta; la clave es el nombre del archivo sin extensión (ni «.tint»). */
  items?: Record<string, Names>;
}

/**
 * Elige el nombre en el idioma pedido: idioma exacto → idioma base («pt-BR» → «pt») →
 * inglés → texto de reserva (el nombre de la carpeta o del archivo).
 */
export function pickName(names: Names | undefined, lang: string, fallback: string): string {
  if (names) {
    const hit = names[lang] ?? names[lang.split('-')[0]] ?? names[FALLBACK_LANG];
    if (typeof hit === 'string' && hit.trim() !== '') return hit;
  }
  return fallback;
}

/** Todos los nombres de un `Names` en una sola línea (para el buscador). */
export function allNames(names: Names | undefined): string {
  return names ? Object.values(names).join(' ') : '';
}

/** Clave estable a partir de un texto: «Cómic EE.UU.» → «comic_ee_uu». */
export function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Comprueba que un diccionario no tenga marcadores {x} que no existan en el original. */
export function placeholdersOf(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}
