/**
 * Imágenes incluidas: todo lo que haya en `src/assets/resources/<categoría>/[subcategoría/]archivo`.
 * Vite las descubre solo al compilar (import.meta.glob): NO hay que registrar
 * nada en el código. Formatos: png, webp, jpg, gif, avif y svg.
 */
import type { NamesFile } from '../i18n/core';
import { buildStock, type StockItem } from './stockTree';

const files = import.meta.glob('../../assets/resources/**/*.{png,webp,jpg,jpeg,gif,avif,svg}', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

/** `names.json` de cualquier carpeta: nombres traducidos (ver el README de resources/). */
const meta = import.meta.glob('../../assets/resources/**/names.json', { eager: true, import: 'default' }) as Record<string, NamesFile>;

export const STOCK = buildStock(files, '../../assets/resources/', meta);

const all = new Map<string, StockItem>();
for (const c of STOCK) {
  for (const i of c.items) all.set(i.id, i);
  for (const g of c.groups) for (const i of g.items) all.set(i.id, i);
}

export const findStock = (id: string): StockItem | undefined => all.get(id);
export const STOCK_COUNT = all.size;
