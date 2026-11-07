/** Preferencias pequeñas del usuario (localStorage). Todo en try/catch: puede no estar disponible. */
const SPLASH_KEY = 'comicfast.hideSplash';

export function splashHidden(): boolean {
  try {
    return localStorage.getItem(SPLASH_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSplashHidden(hide: boolean): void {
  try {
    if (hide) localStorage.setItem(SPLASH_KEY, '1');
    else localStorage.removeItem(SPLASH_KEY);
  } catch {
    /* sin almacenamiento: se mostrará en el próximo inicio */
  }
}

export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(`comicfast.${key}`);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(`comicfast.${key}`);
    else localStorage.setItem(`comicfast.${key}`, value);
  } catch {
    /* sin almacenamiento: la preferencia no se recordará */
  }
}

/** El EULA se muestra al primer inicio; después solo desde Ayuda → Términos. */
export const eulaAccepted = (): boolean => readPref('eulaAccepted') === '1';
export const setEulaAccepted = (v: boolean): void => writePref('eulaAccepted', v ? '1' : null);
