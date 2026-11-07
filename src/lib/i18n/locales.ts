/**
 * Descubre los archivos de idioma. NO hay que registrar nada en el código:
 *   src/locales/<código>.json          textos de la interfaz (ver src/locales/README.txt)
 *   src/locales/guide/<código>.md      guía de usuario
 *   src/assets/eula/<código>.md        términos de servicio (EULA)
 * El código es el del idioma: es, en, ja, ko, fr, zh, pt, pt-BR, zh-TW…
 */
import { sortLanguages, type Dict } from './core';

const codeOf = (path: string) => path.split('/').pop()!.replace(/\.[^.]+$/, '');

function collect<T>(files: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [path, v] of Object.entries(files)) out[codeOf(path)] = v;
  return out;
}

const uiFiles = import.meta.glob('../../locales/*.json', { eager: true, import: 'default' }) as Record<string, Dict>;
const guideFiles = import.meta.glob('../../locales/guide/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const eulaFiles = import.meta.glob('../../assets/eula/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

export const DICTS: Record<string, Dict> = collect(uiFiles);
export const GUIDES: Record<string, string> = collect(guideFiles);
export const EULAS: Record<string, string> = collect(eulaFiles);

/** Idiomas con interfaz disponible, en el orden en que se muestran. */
export const LANGUAGES: { code: string; name: string }[] = sortLanguages(Object.keys(DICTS)).map((code) => ({
  code,
  name: DICTS[code]['lang.name'] ?? code
}));
