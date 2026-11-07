/** Estado de las descargas de escritorio de la versión web (ver downloads.ts). */
import { isTauri } from '../io/platform';
import { parseDownloads, type DownloadOption } from './downloads';

/** ¿Existe de verdad el archivo? Pages sirve index.html (200) cuando falta, así que se mira el tipo. */
async function exists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return res.ok && !(res.headers.get('content-type') ?? '').includes('text/html');
  } catch {
    return false;
  }
}

class Downloads {
  list = $state<DownloadOption[]>([]);

  /** Hay algo que descargar: se muestra el botón. */
  get any(): boolean {
    return this.list.length > 0;
  }

  /** Pide descargas/descargas.json. En el escritorio no hace nada. Las opciones sin archivo se ocultan. */
  async load(): Promise<void> {
    if (isTauri) return;
    try {
      const base = new URL('./descargas/descargas.json', document.baseURI).href;
      const res = await fetch(`${base}?t=${Date.now()}`, { cache: 'no-store' });
      const all = res.ok ? parseDownloads(await res.text(), base) : [];
      const ok = await Promise.all(all.map((d) => (d.local ? exists(d.url) : Promise.resolve(true))));
      this.list = all.filter((_, i) => ok[i]);
    } catch {
      this.list = []; // sin red o sin archivo: sin botón
    }
  }
}

export const downloads = new Downloads();
