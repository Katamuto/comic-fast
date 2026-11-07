/**
 * Fuentes añadidas por la persona: basta con copiar el archivo a
 * `src/assets/fonts/`. El nombre del archivo dice cómo se llama la fuente y su
 * estilo (ver `parseFontFile`). Este archivo es lógica pura (se prueba con vitest);
 * la carga real está en fonts.svelte.ts.
 */

export type FontFormat = 'woff2' | 'woff' | 'truetype' | 'opentype';

export interface FontFileInfo {
  family: string;
  weight: '400' | '700';
  style: 'normal' | 'italic';
  format: FontFormat;
  /** Tipo MIME para incrustarla (data:) al exportar. */
  mime: string;
}

const FORMATS: Record<string, { format: FontFormat; mime: string }> = {
  woff2: { format: 'woff2', mime: 'font/woff2' },
  woff: { format: 'woff', mime: 'font/woff' },
  ttf: { format: 'truetype', mime: 'font/ttf' },
  otf: { format: 'opentype', mime: 'font/otf' }
};

export const FONT_EXTENSIONS = Object.keys(FORMATS);

/** «PatrickHand» → «Patrick Hand»; «patrick_hand» → «patrick hand». */
function spaced(s: string): string {
  return s
    .replace(/[_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Interpreta el nombre de un archivo de fuente. Admite:
 *   «Patrick Hand.woff2»                → Patrick Hand, normal
 *   «Patrick Hand Bold.woff2»           → Patrick Hand, negrita
 *   «Patrick Hand Bold Italic.woff2»    → negrita cursiva
 *   «PatrickHand-BoldItalic.ttf»        → igual (estilo de Google Fonts)
 *   «Roboto-Regular.ttf», «Roboto-Italic.ttf»
 * Devuelve null si la extensión no es de fuente.
 */
export function parseFontFile(fileName: string): FontFileInfo | null {
  const base = fileName.split('/').pop() ?? fileName;
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return null;
  const fmt = FORMATS[base.slice(dot + 1).toLowerCase()];
  if (!fmt) return null;
  let name = base.slice(0, dot);

  let styleText = '';
  const hyphen = name.lastIndexOf('-');
  if (hyphen > 0 && /^[A-Za-z0-9 ]+$/.test(name.slice(hyphen + 1))) {
    styleText = name.slice(hyphen + 1);
    name = name.slice(0, hyphen);
  }
  name = spaced(name);
  if (!styleText) {
    // Palabras de estilo al final del nombre: «… Bold Italic».
    const words = name.split(' ');
    const style: string[] = [];
    while (words.length > 1 && /^(bold|italic|oblique|regular|normal|400|700)$/i.test(words[words.length - 1])) {
      style.unshift(words.pop()!);
    }
    name = words.join(' ');
    styleText = style.join(' ');
  }

  const s = spaced(styleText).toLowerCase();
  return {
    family: name,
    weight: /bold|700/.test(s) ? '700' : '400',
    style: /italic|oblique/.test(s) ? 'italic' : 'normal',
    format: fmt.format,
    mime: fmt.mime
  };
}
