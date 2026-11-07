/**
 * Lee las carpetas de tramas y texturas y las registra en patternLib.
 * Vite las descubre solas al compilar (import.meta.glob): NO hay que registrar nada.
 *
 *   src/assets/patterns/*.svg            tramas vectoriales (ver su README)
 *   src/assets/patterns/names.json       (opcional) nombres traducidos
 *   src/assets/textures/*.png|webp|…     texturas de imagen tileables
 *   src/assets/textures/names.json       (opcional) nombres traducidos
 */
import type { NamesFile } from '../i18n/core';
import { patternFromFile, registerPattern, registerTexture, textureFromFile } from './patternLib';

const svgFiles = import.meta.glob('../../assets/patterns/*.svg', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const patternNames = import.meta.glob('../../assets/patterns/names.json', { eager: true, import: 'default' }) as Record<string, NamesFile>;
const textureFiles = import.meta.glob('../../assets/textures/*.{png,webp,jpg,jpeg,gif,avif,svg}', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;
const textureNames = import.meta.glob('../../assets/textures/names.json', { eager: true, import: 'default' }) as Record<string, NamesFile>;

const firstOf = (o: Record<string, NamesFile>): NamesFile => Object.values(o)[0] ?? {};

for (const [path, text] of Object.entries(svgFiles)) {
  const id = path.split('/').pop()!.replace(/\.svg$/i, '').replace(/^[tn]_/i, '');
  const p = patternFromFile(path, text, firstOf(patternNames).items?.[id]);
  if (p) registerPattern(p);
  else console.warn(`[Comic Fast] ${path}: no es un SVG válido, se ignora.`);
}

for (const [path, url] of Object.entries(textureFiles)) {
  const id = path.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '');
  const t = textureFromFile(path, url, firstOf(textureNames).items?.[id]);
  registerTexture(t);
  // El tamaño natural define el tamaño del mosaico a escala 1.
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        t.w = img.naturalWidth;
        t.h = img.naturalHeight;
      }
    };
    img.src = url;
  }
}
