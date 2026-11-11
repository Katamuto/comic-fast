/** Filtros del panel de imágenes importadas (lógica pura). */
export type UseFilter = 'all' | 'used' | 'unused';
export type KeepFilter = 'all' | 'kept' | 'notKept';
export type ShapeFilter = 'all' | 'landscape' | 'portrait' | 'square';
export type SortMode = 'import' | 'name' | 'size';

export interface AssetFilter {
  query: string;
  use: UseFilter;
  keep: KeepFilter;
  shape: ShapeFilter;
  sort: SortMode;
}

export const NO_FILTER: AssetFilter = { query: '', use: 'all', keep: 'all', shape: 'all', sort: 'import' };

export interface FilterableAsset {
  id: string;
  name: string;
  w: number;
  h: number;
  keep?: boolean;
}

/** ¿Hay algún filtro activo (distinto del predeterminado)? */
export function isFiltering(f: AssetFilter): boolean {
  return f.query.trim() !== '' || f.use !== 'all' || f.keep !== 'all' || f.shape !== 'all';
}

export function filterAssets<T extends FilterableAsset>(list: T[], f: AssetFilter, used: { has(id: string): boolean }): T[] {
  const q = f.query.trim().toLowerCase();
  const out = list.filter((a) => {
    if (q && !a.name.toLowerCase().includes(q)) return false;
    const isUsed = used.has(a.id);
    if (f.use === 'used' && !isUsed) return false;
    if (f.use === 'unused' && isUsed) return false;
    if (f.keep === 'kept' && !a.keep) return false;
    if (f.keep === 'notKept' && a.keep) return false;
    if (f.shape !== 'all') {
      const r = a.w / Math.max(1, a.h);
      const shape = r > 1.05 ? 'landscape' : r < 0.95 ? 'portrait' : 'square';
      if (shape !== f.shape) return false;
    }
    return true;
  });
  if (f.sort === 'name') return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  if (f.sort === 'size') return out.sort((a, b) => b.w * b.h - a.w * a.h);
  return out;
}
