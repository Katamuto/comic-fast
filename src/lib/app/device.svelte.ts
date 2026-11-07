/**
 * Estado reactivo del dispositivo: ¿teléfono? ¿pantalla completa?
 * La interfaz móvil solo aparece en teléfonos (pantalla táctil y lado corto ≤ 600 px).
 * Para probarla en un PC: añade `?ui=mobile` a la dirección (`?ui=auto` vuelve a la detección normal).
 */
import { isPhone, parseUiParam, type UiOverride } from './device';
import { readPref, writePref } from './prefs';

function readOverride(): UiOverride {
  try {
    const q = parseUiParam(location.search);
    if (q === 'auto') writePref('ui', null);
    else if (q) writePref('ui', q);
  } catch {
    /* sin location */
  }
  const v = readPref('ui');
  return v === 'mobile' || v === 'desktop' ? v : null;
}

function coarse(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

const fsElement = () => (document as FsDoc).fullscreenElement ?? (document as FsDoc).webkitFullscreenElement ?? null;

/** Evento no estándar de Chrome/Edge/Android: permite ofrecer «Instalar app» desde la propia página. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

class Device {
  private installEvent = $state.raw<InstallPromptEvent | null>(null);
  /** Se instaló durante esta sesión. */
  private justInstalled = $state(false);

  private override = readOverride();
  mobile = $state(isPhone({ coarse: coarse(), w: window.innerWidth, h: window.innerHeight, override: this.override }));
  fullscreen = $state(!!fsElement());
  /** La app está instalada ("añadida a la pantalla de inicio"): ya se ve sin barra del navegador. */
  standalone = $state(this.checkStandalone());

  private checkStandalone(): boolean {
    try {
      return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    } catch {
      return false;
    }
  }

  /**
   * ¿Ofrecer «Instalar»? Solo si la app NO está instalada: en Chrome/Android el navegador avisa
   * (beforeinstallprompt) únicamente cuando se puede instalar; en iPhone no hay aviso, así que se
   * muestra siempre en el navegador, y se explica el procedimiento. Ya instalada (standalone) no sale.
   */
  get canInstall(): boolean {
    if (this.standalone || this.justInstalled) return false;
    return this.installEvent !== null || isIos();
  }

  /** Lanza el cuadro de instalación del navegador. Devuelve 'ios' si hay que explicar los pasos a mano. */
  async install(): Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'> {
    const ev = this.installEvent;
    if (ev) {
      try {
        await ev.prompt();
        const r = await ev.userChoice;
        this.installEvent = null; // el aviso solo se puede usar una vez
        return r.outcome;
      } catch {
        return 'unavailable';
      }
    }
    return isIos() ? 'ios' : 'unavailable';
  }

  /** ¿El navegador permite pantalla completa desde una página? (iPhone no.) */
  get canFullscreen(): boolean {
    const el = document.documentElement as FsEl;
    return typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
  }

  /** Conecta los eventos de la ventana. Devuelve la función que los quita. */
  watch(): () => void {
    const update = () => {
      this.mobile = isPhone({ coarse: coarse(), w: window.innerWidth, h: window.innerHeight, override: this.override });
    };
    const onFs = () => {
      this.fullscreen = !!fsElement();
    };
    const onPrompt = (e: Event) => {
      e.preventDefault(); // evita la mini-barra automática; el botón de la interfaz hace de atajo
      this.installEvent = e as InstallPromptEvent;
    };
    const onInstalled = () => {
      this.justInstalled = true;
      this.installEvent = null;
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('resize', update);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('resize', update);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
    };
  }

  /** Entra o sale de pantalla completa. Devuelve false si el navegador no lo permite. */
  async toggleFullscreen(): Promise<boolean> {
    try {
      if (fsElement()) {
        const d = document as FsDoc;
        await (d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.());
        return true;
      }
      const el = document.documentElement as FsEl;
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else return false;
      return true;
    } catch {
      return false;
    }
  }
}

export const device = new Device();
