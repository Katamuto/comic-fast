/**
 * Fuentes empaquetadas con la app (licencia OFL, vía @fontsource).
 * Se cargan con la API FontFace y se reutilizan al exportar: como el SVG se
 * rasteriza como imagen aislada, las fuentes web hay que incrustarlas en él.
 */
import comicRegular from '@fontsource/comic-neue/files/comic-neue-latin-400-normal.woff2?url';
import comicItalic from '@fontsource/comic-neue/files/comic-neue-latin-400-italic.woff2?url';
import comicBold from '@fontsource/comic-neue/files/comic-neue-latin-700-normal.woff2?url';
import comicBoldItalic from '@fontsource/comic-neue/files/comic-neue-latin-700-italic.woff2?url';
import { parseFontFile, type FontFormat } from './fontFiles';
import bangers from '@fontsource/bangers/files/bangers-latin-400-normal.woff2?url';

export interface FontFaceDef {
  family: string;
  weight: '400' | '700';
  style: 'normal' | 'italic';
  url: string;
  format: FontFormat;
  /** MIME para incrustarla al exportar. */
  mime: string;
}

const woff2 = (family: string, weight: '400' | '700', style: 'normal' | 'italic', url: string): FontFaceDef => ({
  family,
  weight,
  style,
  url,
  format: 'woff2',
  mime: 'font/woff2'
});

/** Fuentes que trae la app (instaladas con npm, vía @fontsource). */
const BUILTIN_FACES: FontFaceDef[] = [
  woff2('Comic Neue', '400', 'normal', comicRegular),
  woff2('Comic Neue', '400', 'italic', comicItalic),
  woff2('Comic Neue', '700', 'normal', comicBold),
  woff2('Comic Neue', '700', 'italic', comicBoldItalic),
  woff2('Bangers', '400', 'normal', bangers)
];

/**
 * Fuentes añadidas por la persona: cualquier archivo de `src/assets/fonts/`
 * (ver el README de esa carpeta). Vite las encuentra solo; no hay que importar nada.
 */
const userFiles = import.meta.glob('../../assets/fonts/*.{woff2,woff,ttf,otf}', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

const USER_FACES: FontFaceDef[] = Object.entries(userFiles).flatMap(([path, url]) => {
  const info = parseFontFile(path);
  return info ? [{ ...info, url }] : [];
});

export const FONT_FACES: FontFaceDef[] = [...BUILTIN_FACES, ...USER_FACES];

const families = [...new Set(FONT_FACES.map((f) => f.family))];

const GENERIC = ['sans-serif', 'serif', 'monospace'];

/** Fuentes ofrecidas en el inspector, sin las importadas. Las genéricas usan lo que tenga el sistema. */
export const FONT_FAMILIES = [...families, ...GENERIC];

/**
 * `ready` se incrementa cuando termina de cargar una fuente, para volver a medir los textos.
 * `user` son las familias de las fuentes importadas por la persona (ver userFonts.svelte.ts).
 */
export const fontState = $state({ ready: 0, user: [] as string[] });

/** Fuentes para elegir en el inspector: las incluidas, las importadas y las genéricas. */
export function fontFamilies(): string[] {
  return [...families, ...fontState.user.filter((f) => !families.includes(f)), ...GENERIC];
}

/** Familias pesadas (CJK): carga diferida. */
const LAZY = /^Noto Sans (JP|KR|SC)/;

let loading: Promise<void> | null = null;

export function loadFonts(): Promise<void> {
  loading ??= (async () => {
    await Promise.all(
      FONT_FACES.map(async (def) => {
        try {
          const face = new FontFace(def.family, `url(${def.url})`, {
            weight: def.weight,
            style: def.style
          });
          // Las CJK pesan MB: se registran sin descargar; el navegador las baja al usarlas.
          if (LAZY.test(def.family)) document.fonts.add(face);
          else document.fonts.add(await face.load());
        } catch (err) {
          console.warn(`No se pudo cargar la fuente ${def.family} ${def.weight}`, err);
        }
      })
    );
    fontState.ready++;
    document.fonts.addEventListener('loadingdone', () => fontState.ready++);
  })();
  return loading;
}
