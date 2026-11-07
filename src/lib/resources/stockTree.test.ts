import { describe, expect, it } from 'vitest';
import { buildStock, cleanName } from './stockTree';

const R = '../../assets/resources/';
const f = (...paths: string[]) => Object.fromEntries(paths.map((p) => [R + p, `/u/${p}`]));

describe('imágenes incluidas', () => {
  it('limpia nombres: quita el prefijo numérico y cambia guiones por espacios', () => {
    expect(cleanName('03-Vehículos_de_policía')).toBe('Vehículos de policía');
    expect(cleanName('explosion-grande')).toBe('Explosion grande');
    expect(cleanName('10. Cielos')).toBe('Cielos');
  });

  it('ordena categorías por el prefijo numérico (orden natural) y agrupa subcarpetas', () => {
    const cats = buildStock(
      f(
        '10-VFX/boom.png',
        '2-Paisajes/Exteriores/montaña.png',
        '2-Paisajes/Interiores/sala.png',
        '2-Paisajes/Interiores/cocina.png',
        '2-Paisajes/general.png'
      ),
      R
    );
    expect(cats.map((c) => c.label)).toEqual(['Paisajes', 'VFX']); // 2 antes que 10
    const p = cats[0];
    expect(p.count).toBe(4);
    expect(p.items.map((i) => i.label)).toEqual(['General']);
    expect(p.groups.map((g) => g.label)).toEqual(['Exteriores', 'Interiores']);
    expect(p.groups[1].items.map((i) => i.label)).toEqual(['Cocina', 'Sala']);
  });

  it('subcarpetas profundas se unen con ›', () => {
    const [c] = buildStock(f('A/B/C/x.png'), R);
    expect(c.groups[0].label).toBe('B › C');
  });

  it('«.tint» marca siluetas y se quita del nombre', () => {
    const [c] = buildStock(f('Formas/gato.tint.svg', 'Formas/perro.svg'), R);
    const gato = c.items.find((i) => i.label === 'Gato')!;
    expect(gato.tint).toBe(true);
    expect(gato.name).toBe('gato.svg');
    expect(c.items.find((i) => i.label === 'Perro')!.tint).toBe(false);
  });

  it('ignora archivos sueltos en la raíz y rutas ajenas', () => {
    expect(buildStock({ ...f('suelto.png'), '/otra/cosa/x/y.png': 'u' }, R)).toEqual([]);
  });

  it('el texto de búsqueda incluye categoría, subcategoría y nombre', () => {
    const [c] = buildStock(f('Vehículos/Por fuera/auto-rojo.png'), R);
    expect(c.groups[0].items[0].search).toContain('vehículos');
    expect(c.groups[0].items[0].search).toContain('por fuera');
    expect(c.groups[0].items[0].search).toContain('auto rojo');
  });
});
