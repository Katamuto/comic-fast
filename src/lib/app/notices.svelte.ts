/** Estado de los avisos de la versión web (ver notices.ts). */
import { isTauri } from '../io/platform';
import { noticesSignature, parseNotices, type Notice } from './notices';
import { readPref, writePref } from './prefs';

class Notices {
  list = $state<Notice[]>([]);
  private seen = $state(readPref('noticeSeen') ?? '');

  /** Hay avisos: se muestra la campanita. */
  get any(): boolean {
    return this.list.length > 0;
  }

  /** Hay un aviso que la persona aún no ha visto. */
  get unread(): boolean {
    return this.any && noticesSignature(this.list) !== this.seen;
  }

  markSeen(): void {
    this.seen = noticesSignature(this.list);
    writePref('noticeSeen', this.seen);
  }

  /** Pide avisos.json a la raíz del sitio. En el escritorio no hace nada. */
  async load(): Promise<void> {
    if (isTauri) return;
    try {
      const res = await fetch(`./avisos.json?t=${Date.now()}`, { cache: 'no-store' });
      this.list = res.ok ? parseNotices(await res.text()) : [];
    } catch {
      this.list = []; // sin red o sin archivo: sin campanita
    }
  }
}

export const notices = new Notices();
