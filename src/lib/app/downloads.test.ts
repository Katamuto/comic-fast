import { describe, expect, it } from 'vitest';
import { parseDownloads, resolveAsset } from './downloads';
import { localizedText } from './notices';

const BASE = 'https://comicfast.example/descargas/descargas.json';

describe('resolveAsset', () => {
  it('resuelve nombres de archivo respecto a la carpeta del .json', () => {
    expect(resolveAsset('app.exe', BASE)).toEqual({ url: 'https://comicfast.example/descargas/app.exe', local: true });
  });
  it('admite direcciones https externas y las marca como no locales', () => {
    expect(resolveAsset('https://github.com/x/y/releases/download/v1/app.AppImage', BASE)).toEqual({
      url: 'https://github.com/x/y/releases/download/v1/app.AppImage',
      local: false
    });
  });
  it('rechaza esquemas peligrosos y valores vacíos o de otro tipo', () => {
    expect(resolveAsset('javascript:alert(1)', BASE)).toBeNull();
    expect(resolveAsset('data:text/html,<b>x</b>', BASE)).toBeNull();
    expect(resolveAsset('', BASE)).toBeNull();
    expect(resolveAsset(42, BASE)).toBeNull();
    expect(resolveAsset(undefined, BASE)).toBeNull();
  });
});

describe('parseDownloads', () => {
  it('vacío, no-JSON (p. ej. HTML) o sin opciones dan lista vacía', () => {
    expect(parseDownloads('', BASE)).toEqual([]);
    expect(parseDownloads('<!doctype html><html></html>', BASE)).toEqual([]);
    expect(parseDownloads('{}', BASE)).toEqual([]);
    expect(parseDownloads('{"downloads":[]}', BASE)).toEqual([]);
  });

  it('lee nombres por idioma, nota, archivo e icono', () => {
    const list = parseDownloads(
      JSON.stringify({
        downloads: [
          { id: 'win', name: { es: 'Windows', en: 'Windows (64-bit)' }, note: 'Windows 10+', file: 'a.exe', icon: 'win.svg' },
          { name: 'Linux', file: 'b.AppImage' }
        ]
      }),
      BASE
    );
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('win');
    expect(localizedText(list[0].name, 'en')).toBe('Windows (64-bit)');
    expect(localizedText(list[0].name, 'es')).toBe('Windows');
    expect(list[0].url).toBe('https://comicfast.example/descargas/a.exe');
    expect(list[0].icon).toBe('https://comicfast.example/descargas/win.svg');
    expect(list[1].id).toBe('d1');
    expect(list[1].icon).toBeUndefined();
    expect(list[1].local).toBe(true);
  });

  it('admite una lista directa y descarta entradas incompletas o inseguras', () => {
    const list = parseDownloads(
      JSON.stringify([
        { name: 'Bien', file: 'ok.dmg' },
        { name: 'Sin archivo' },
        { file: 'sin-nombre.exe' },
        { name: 'Mala', file: 'javascript:alert(1)' },
        'texto suelto',
        null
      ]),
      BASE
    );
    expect(list.map((d) => d.url)).toEqual(['https://comicfast.example/descargas/ok.dmg']);
  });

  it('un icono inseguro se ignora pero la opción se conserva', () => {
    const [d] = parseDownloads(JSON.stringify([{ name: 'X', file: 'x.exe', icon: 'javascript:1' }]), BASE);
    expect(d.url).toContain('x.exe');
    expect(d.icon).toBeUndefined();
  });
});
