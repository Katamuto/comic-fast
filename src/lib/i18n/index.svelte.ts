/**
 * Idioma actual (reactivo) y la función t().
 *
 *   t('menu.file')                         → «Archivo» / «File» / «ファイル»…
 *   t('status.saved', { name: 'a.cfast' }) → sustituye {name}
 *   t('res.balloons.speech', undefined, 'Diálogo') → con texto de reserva
 *
 * Al leer `i18n.lang`, todo lo que llame a t() dentro de una plantilla Svelte se
 * vuelve a dibujar solo cuando se cambia de idioma.
 */
import { detectLanguage, FALLBACK_LANG, pickName, translate, TKError, type Names, type Params } from './core';
import { DICTS, LANGUAGES } from './locales';
import { readPref, writePref } from '../app/prefs';

const codes = LANGUAGES.map((l) => l.code);

function initialLang(): string {
  const saved = readPref('lang');
  if (saved && codes.includes(saved)) return saved;
  let nav: readonly string[] = [];
  try {
    nav = navigator.languages?.length ? navigator.languages : [navigator.language];
  } catch {
    /* sin navigator */
  }
  return detectLanguage(nav, codes);
}

class I18n {
  lang = $state(initialLang());

  set(code: string): void {
    if (!codes.includes(code)) return;
    this.lang = code;
    writePref('lang', code);
    this.apply();
  }

  /** Refleja el idioma en <html lang dir> (lectores de pantalla, tipografías CJK, idiomas RTL). */
  apply(): void {
    const root = document.documentElement;
    root.lang = this.lang;
    root.dir = DICTS[this.lang]?.['lang.dir'] === 'rtl' ? 'rtl' : 'ltr';
  }
}

export const i18n = new I18n();

export function t(key: string, params?: Params, fallback?: string): string {
  return translate(DICTS, i18n.lang, key, params, fallback);
}

/** Nombre de un recurso en el idioma actual (reactivo); `fallback` es el nombre de la carpeta/archivo. */
export function localName(names: Names | undefined, fallback: string): string {
  return pickName(names, i18n.lang, fallback);
}

/** Texto de un error para mostrarlo a la persona (traduce los errores con clave). */
export function errorText(e: unknown): string {
  if (e instanceof TKError) return t(e.key, e.params, e.message);
  return e instanceof Error ? e.message : String(e);
}

export { FALLBACK_LANG, LANGUAGES };
