import { describe, expect, it } from 'vitest';
import { NO_FILTER, filterAssets, isFiltering } from './assetFilter';

const list = [
  { id: 'a', name: 'Cielo', w: 200, h: 100, keep: true },
  { id: 'b', name: 'árbol', w: 100, h: 200 },
  { id: 'c', name: 'Casa 2', w: 100, h: 100 },
  { id: 'd', name: 'Casa 10', w: 400, h: 400, keep: true }
];
const used = new Set(['a', 'c']);
const ids = (f: Partial<typeof NO_FILTER>) => filterAssets(list, { ...NO_FILTER, ...f }, used).map((x) => x.id);

describe('filtro de imágenes', () => {
  it('sin filtro devuelve todo en orden', () => {
    expect(ids({})).toEqual(['a', 'b', 'c', 'd']);
    expect(isFiltering(NO_FILTER)).toBe(false);
  });
  it('en uso / sin usar', () => {
    expect(ids({ use: 'used' })).toEqual(['a', 'c']);
    expect(ids({ use: 'unused' })).toEqual(['b', 'd']);
  });
  it('aseguradas / sin asegurar', () => {
    expect(ids({ keep: 'kept' })).toEqual(['a', 'd']);
    expect(ids({ keep: 'notKept' })).toEqual(['b', 'c']);
  });
  it('forma', () => {
    expect(ids({ shape: 'landscape' })).toEqual(['a']);
    expect(ids({ shape: 'portrait' })).toEqual(['b']);
    expect(ids({ shape: 'square' })).toEqual(['c', 'd']);
  });
  it('búsqueda y combinación', () => {
    expect(ids({ query: 'casa' })).toEqual(['c', 'd']);
    expect(ids({ query: 'casa', use: 'unused' })).toEqual(['d']);
  });
  it('orden por nombre (numérico) y por tamaño', () => {
    expect(ids({ query: 'casa', sort: 'name' })).toEqual(['c', 'd']);
    expect(ids({ sort: 'size' })).toEqual(['d', 'a', 'b', 'c']);
  });
});
