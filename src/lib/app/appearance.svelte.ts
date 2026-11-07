/**
 * Apariencia: tema claro/oscuro y tamaño de la interfaz.
 * Se guarda en localStorage y se aplica al <html> (data-theme y --ui).
 * La escala multiplica el tamaño base de 13 px: todos los tamaños de la
 * interfaz están en rem, así que todo crece a la vez.
 */
import { readPref, writePref } from './prefs';

export type Theme = 'light' | 'dark';

/** Niveles de escala disponibles (el 2.º, 115 %, es el predeterminado). */
export const UI_SCALES = [1, 1.15, 1.3, 1.5, 1.75] as const;
export const DEFAULT_SCALE = 1.15;

function readScale(): number {
  const n = Number(readPref('uiScale'));
  return UI_SCALES.includes(n as (typeof UI_SCALES)[number]) ? n : DEFAULT_SCALE;
}

function readTheme(): Theme | null {
  const t = readPref('theme');
  return t === 'light' || t === 'dark' ? t : null;
}

function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

class Appearance {
  /** null = seguir al sistema operativo. */
  theme = $state<Theme | null>(readTheme());
  scale = $state<number>(readScale());

  get effectiveTheme(): Theme {
    return this.theme ?? systemTheme();
  }

  apply(): void {
    const root = document.documentElement;
    if (this.theme) root.dataset.theme = this.theme;
    else delete root.dataset.theme;
    root.style.setProperty('--ui', String(this.scale));
  }

  toggleTheme(): void {
    this.theme = this.effectiveTheme === 'dark' ? 'light' : 'dark';
    writePref('theme', this.theme);
    this.apply();
  }

  setScale(scale: number): void {
    this.scale = scale;
    writePref('uiScale', String(scale));
    this.apply();
  }

  /** Sube (+1) o baja (−1) un nivel de la escala. */
  stepScale(dir: 1 | -1): void {
    const i = UI_SCALES.indexOf(this.scale as (typeof UI_SCALES)[number]);
    const next = UI_SCALES[Math.min(UI_SCALES.length - 1, Math.max(0, (i < 0 ? 1 : i) + dir))];
    this.setScale(next);
  }

  get canGrow(): boolean {
    return this.scale < UI_SCALES[UI_SCALES.length - 1];
  }
  get canShrink(): boolean {
    return this.scale > UI_SCALES[0];
  }
}

export const appearance = new Appearance();
