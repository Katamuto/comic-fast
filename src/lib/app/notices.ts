/**
 * Avisos para quien usa la versión web.
 *
 * Al cargar, la web pide el archivo `avisos.json` de su raíz (en este proyecto:
 * `public/avisos.json`; en el servidor, el mismo archivo junto a index.html). Si tiene
 * contenido, aparece una campanita arriba; al pulsarla se muestra el mensaje.
 * Cambiar el mensaje = editar ese archivo en el servidor, sin recompilar.
 *
 * Formatos admitidos (todo es opcional salvo el mensaje; vacío = sin campanita):
 *   {}                                                    → sin avisos
 *   { "message": "Texto" }                                → un aviso en un solo idioma
 *   { "id": "2026-10-20",
 *     "title":   { "es": "Novedades", "en": "News" },
 *     "message": { "es": "Hay **versión nueva**.", "en": "There is a **new version**." } }
 *   { "messages": [ { … }, { … } ] }                      → varios avisos
 *
 * `id` sirve para saber si la persona ya lo vio: si cambia, la campanita vuelve a avisar.
 * Si no hay `id` se calcula a partir del contenido. El texto admite **negrita**, *cursiva*,
 * listas y enlaces https (mini-Markdown; el HTML se escapa).
 */
import { FALLBACK_LANG, pickName, type Names } from '../i18n/core';

export type Localized = string | Names;

export interface Notice {
  id: string;
  title?: Localized;
  message: Localized;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function asLocalized(v: unknown): Localized | undefined {
  if (typeof v === 'string') return v.trim() === '' ? undefined : v;
  if (isRecord(v)) {
    const out: Names = {};
    for (const [k, x] of Object.entries(v)) if (typeof x === 'string' && x.trim() !== '') out[k] = x;
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return undefined;
}

/** Hash corto y estable (FNV-1a) para identificar un aviso sin `id`. */
export function shortHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function toNotice(raw: unknown): Notice | null {
  if (!isRecord(raw)) return null;
  const message = asLocalized(raw.message);
  if (!message) return null;
  const title = asLocalized(raw.title);
  const id = typeof raw.id === 'string' || typeof raw.id === 'number' ? String(raw.id) : shortHash(JSON.stringify({ title, message }));
  return { id, title, message };
}

/** Interpreta el contenido de avisos.json. Cualquier cosa que no sirva da una lista vacía. */
export function parseNotices(text: string): Notice[] {
  const t = text.trim();
  if (t === '') return [];
  let raw: unknown;
  try {
    raw = JSON.parse(t);
  } catch {
    return []; // p. ej. el servidor devolvió una página HTML porque el archivo no existe
  }
  const list = isRecord(raw) && Array.isArray(raw.messages) ? raw.messages : Array.isArray(raw) ? raw : [raw];
  return list.map(toNotice).filter((n): n is Notice => n !== null);
}

/** Texto en el idioma pedido: idioma → base → inglés → español → el primero que haya. */
export function localizedText(v: Localized | undefined, lang: string): string {
  if (v === undefined) return '';
  if (typeof v === 'string') return v;
  const first = Object.values(v)[0] ?? '';
  return pickName(v, lang, v.es ?? first) || (v[FALLBACK_LANG] ?? first);
}

/** Firma de la lista de avisos (para recordar cuál vio ya la persona). */
export const noticesSignature = (list: Notice[]): string => list.map((n) => n.id).join('|');
