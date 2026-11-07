/**
 * Imágenes incluidas con la app. Se ordenan solas a partir de las carpetas de
 * `src/assets/resources/` (ver el README de esa carpeta). Lógica pura, probada
 * con vitest; la lectura de archivos está en stock.ts.
 */

import { allNames, type Names, type NamesFile } from '../i18n/core';

export interface StockItem {
  /** Ruta relativa dentro de resources/ (única). */
  id: string;
  label: string;
  /** Nombre en varios idiomas (de names.json), si lo hay; si no, se usa `label`. */
  names?: Names;
  /** Nombre de archivo (para el asset del proyecto). */
  name: string;
  url: string;
  /** Archivo «.tint.»: entra con el filtro de color activado (siluetas). */
  tint: boolean;
  /** Texto en minúsculas para el buscador. */
  search: string;
}

/** Un nivel de carpeta con su nombre en varios idiomas. */
export interface NamePart {
  label: string;
  names?: Names;
}

export interface StockGroup {
  id: string;
  label: string;
  /** Un elemento por nivel de carpeta (para traducir cada uno). */
  parts: NamePart[];
  items: StockItem[];
}

export interface StockCategory {
  id: string;
  label: string;
  names?: Names;
  /** Archivos que están directamente en la carpeta de la categoría. */
  items: StockItem[];
  /** Subcarpetas. */
  groups: StockGroup[];
  count: number;
}

const natural = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });

/** «03-Vehículos_de_policía» → «Vehículos de policía». El prefijo numérico solo sirve para ordenar. */
export function cleanName(raw: string): string {
  const s = raw
    .replace(/^\d+[-_. ]+/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : raw;
}

/**
 * Arma el árbol de categorías. `meta` son los `names.json` (ruta completa como la da
 * import.meta.glob → su contenido): dan nombres traducidos a carpetas y archivos.
 * Sin `names.json` (o sin el idioma pedido) se usa el nombre de la carpeta/archivo.
 */
export function buildStock(files: Record<string, string>, root: string, meta: Record<string, NamesFile> = {}): StockCategory[] {
  const cats = new Map<string, { raw: string; items: StockItem[]; groups: Map<string, { raw: string; items: StockItem[] }> }>();
  const metaOf = (folders: string[]): NamesFile | undefined => meta[`${root}${folders.join('/')}/names.json`];
  const partOf = (folders: string[]): NamePart => ({ label: cleanName(folders[folders.length - 1]), names: metaOf(folders)?.name });

  for (const [path, url] of Object.entries(files)) {
    if (!path.startsWith(root)) continue;
    const parts = path.slice(root.length).split('/').filter(Boolean);
    if (parts.length < 2) continue; // los archivos sueltos en la raíz no pertenecen a ninguna categoría
    const file = parts[parts.length - 1];
    const folders = parts.slice(0, -1);
    const tint = /\.tint\.[a-z0-9]+$/i.test(file);
    const baseName = file.replace(/\.[a-z0-9]+$/i, '').replace(/\.tint$/i, '');
    const label = cleanName(baseName);
    const names = metaOf(folders)?.items?.[baseName];

    const catRaw = folders[0];
    const subRaw = folders.length > 1 ? folders.slice(1).join(' / ') : '';
    const nameText = folders.map((_, i) => allNames(metaOf(folders.slice(0, i + 1))?.name)).join(' ');
    const item: StockItem = {
      id: parts.join('/'),
      label,
      names,
      name: file.replace(/\.tint(\.[a-z0-9]+)$/i, '$1'),
      url,
      tint,
      search: `${cleanName(catRaw)} ${cleanName(subRaw)} ${label} ${nameText} ${allNames(names)}`.toLowerCase()
    };

    let cat = cats.get(catRaw);
    if (!cat) cats.set(catRaw, (cat = { raw: catRaw, items: [], groups: new Map() }));
    if (!subRaw) cat.items.push(item);
    else {
      let g = cat.groups.get(subRaw);
      if (!g) cat.groups.set(subRaw, (g = { raw: subRaw, items: [] }));
      g.items.push(item);
    }
  }

  const byLabel = (a: StockItem, b: StockItem) => natural(a.id, b.id);
  return [...cats.values()]
    .sort((a, b) => natural(a.raw, b.raw))
    .map((c) => {
      const groups = [...c.groups.values()]
        .sort((a, b) => natural(a.raw, b.raw))
        .map((g) => {
          const levels = g.raw.split(' / ');
          return {
            id: `${c.raw}/${g.raw}`,
            label: levels.map(cleanName).join(' › '),
            parts: levels.map((_, i) => partOf([c.raw, ...levels.slice(0, i + 1)])),
            items: g.items.sort(byLabel)
          };
        });
      const items = c.items.sort(byLabel);
      return {
        id: c.raw,
        label: cleanName(c.raw),
        names: metaOf([c.raw])?.name,
        items,
        groups,
        count: items.length + groups.reduce((n, g) => n + g.items.length, 0)
      };
    });
}
