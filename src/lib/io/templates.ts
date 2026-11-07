/**
 * Plantillas de proyecto: todo `.cfast` que haya en `src/assets/templates/`.
 * Vite los descubre solo al compilar (import.meta.glob): NO hay que registrar nada.
 * Ver el README de esa carpeta.
 */
import { pickName, type NamesFile } from '../i18n/core';
import { decodeProject } from './cfast';

const files = import.meta.glob('../../assets/templates/*.cfast', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const metaFiles = import.meta.glob('../../assets/templates/names.json', { eager: true, import: 'default' }) as Record<string, NamesFile>;
const meta: NamesFile = Object.values(metaFiles)[0] ?? {};

export interface TemplateDef {
  id: string;
  url: string;
  /** Nombre del archivo (si falta traducción). */
  fallback: string;
}

export const TEMPLATES: TemplateDef[] = Object.entries(files)
  .map(([path, url]) => {
    const id = path.split('/').pop()!.replace(/\.cfast$/i, '');
    return { id, url, fallback: id.replace(/[-_]+/g, ' ') };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export const templateName = (tpl: TemplateDef, lang: string): string => pickName(meta.items?.[tpl.id], lang, tpl.fallback);

/** Descarga y decodifica una plantilla. */
export async function readTemplate(tpl: TemplateDef): Promise<ReturnType<typeof decodeProject>> {
  const res = await fetch(tpl.url);
  if (!res.ok) throw new Error(`plantilla ${tpl.id}: ${res.status}`);
  return decodeProject(new Uint8Array(await res.arrayBuffer()));
}
