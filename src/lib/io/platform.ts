/**
 * Abstracción de plataforma: la misma app funciona dentro de Tauri
 * (diálogos y archivos nativos) y en un navegador normal (útil para
 * desarrollar con `npm run dev` y para probar). Los plugins de Tauri se
 * importan de forma dinámica, así que la versión web no los carga.
 */
import { t } from '../i18n/index.svelte';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface OpenedFile {
  name: string;
  /** Ruta absoluta (solo en Tauri). */
  path: string | null;
  bytes: Uint8Array;
}

const baseName = (path: string) => path.split(/[\\/]/).pop() ?? path;

function pickInBrowser(filters: FileFilter[], multiple: boolean): Promise<OpenedFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = multiple;
    input.accept = filters.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(',');
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      resolve(
        await Promise.all(
          files.map(async (f) => ({
            name: f.name,
            path: null,
            bytes: new Uint8Array(await f.arrayBuffer())
          }))
        )
      );
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}

export async function openFiles(filters: FileFilter[], multiple = false): Promise<OpenedFile[]> {
  if (!isTauri) return pickInBrowser(filters, multiple);

  const { open } = await import('@tauri-apps/plugin-dialog');
  const { readFile } = await import('@tauri-apps/plugin-fs');
  const picked: unknown = await open({ multiple, directory: false, filters });
  const paths = Array.isArray(picked) ? (picked as string[]) : typeof picked === 'string' ? [picked] : [];
  return Promise.all(paths.map(async (p) => ({ name: baseName(p), path: p, bytes: await readFile(p) })));
}

/**
 * Guarda bytes. En Tauri usa `knownPath` si existe (guardar) o muestra el
 * diálogo (guardar como). En el navegador descarga el archivo.
 * Devuelve null si el usuario cancela.
 */
export async function saveFile(
  bytes: Uint8Array,
  defaultName: string,
  filters: FileFilter[],
  knownPath: string | null
): Promise<{ path: string | null; name: string } | null> {
  if (isTauri) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = knownPath ?? (await save({ defaultPath: defaultName, filters }));
    if (!path) return null;
    await writeFile(path, bytes);
    return { path, name: baseName(path) };
  }

  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { path: null, name: defaultName };
}

export async function confirmDialog(message: string): Promise<boolean> {
  if (isTauri) {
    const { ask } = await import('@tauri-apps/plugin-dialog');
    return ask(message, { title: 'Comic Fast', kind: 'warning', okLabel: t('dialog.continue'), cancelLabel: t('dialog.cancel') });
  }
  return window.confirm(message);
}

export async function alertDialog(message: string): Promise<void> {
  if (isTauri) {
    const { message: show } = await import('@tauri-apps/plugin-dialog');
    await show(message, { title: 'Comic Fast', kind: 'error' });
    return;
  }
  window.alert(message);
}

/** Abre un enlace https en el navegador del sistema (en Tauri) o en una pestaña nueva (web). */
export async function openExternal(url: string): Promise<void> {
  if (!/^https:\/\//i.test(url)) return;
  if (isTauri) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function setWindowTitle(title: string): Promise<void> {
  document.title = title;
  if (!isTauri) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().setTitle(title);
}

/** Cierra la aplicación (escritorio). Pasa por la confirmación de `guardClose`. */
export async function quitApp(): Promise<void> {
  if (!isTauri) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().close();
}

/**
 * Pide confirmación al cerrar la ventana si `isDirty()` es verdadero. */
export async function guardClose(isDirty: () => boolean): Promise<void> {
  if (!isTauri) {
    window.addEventListener('beforeunload', (e) => {
      if (isDirty()) e.preventDefault();
    });
    return;
  }
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  // OJO: al registrar este manejador, Tauri cierra la ventana llamando a
  // `destroy()` desde JavaScript cuando NO se cancela el evento. Eso exige el
  // permiso `core:window:allow-destroy` (src-tauri/capabilities/default.json);
  // sin él la ventana ignora el botón de cerrar sin dar ningún error visible.
  await getCurrentWindow().onCloseRequested(async (event) => {
    let cancel = false;
    try {
      cancel = isDirty() && !(await confirmDialog(t('confirm.close')));
    } catch {
      cancel = false; // si el diálogo falla, mejor cerrar que dejar la app atascada
    }
    if (cancel) event.preventDefault();
  });
}

/** Lee un archivo soltado sobre la ventana (orden `read_dropped_file` de src-tauri/src/lib.rs). */
export async function readDroppedFile(path: string): Promise<Uint8Array> {
  const { invoke } = await import('@tauri-apps/api/core');
  return new Uint8Array(await invoke<ArrayBuffer>('read_dropped_file', { path }));
}

export interface NativeDropHandlers {
  /** Entra o se mueve sobre la ventana (x, y en px CSS de la ventana). */
  over: (x: number, y: number) => void;
  leave: () => void;
  drop: (paths: string[], x: number, y: number) => void;
}

/**
 * Archivos arrastrados desde el sistema, en la app de escritorio de Linux y macOS. Allí la ventana
 * recibe el arrastre como evento nativo de Tauri (con rutas) en lugar de eventos HTML5; en Windows
 * (dragDropEnabled: false) sigue valiendo el arrastrar y soltar del navegador. En la web no hace nada.
 * Devuelve la función que quita el oyente.
 */
export async function listenNativeFileDrop(h: NativeDropHandlers): Promise<() => void> {
  if (!isTauri) return () => {};
  const { getCurrentWebview } = await import('@tauri-apps/api/webview');
  const dpr = () => window.devicePixelRatio || 1;
  return getCurrentWebview().onDragDropEvent((event) => {
    const p = event.payload;
    if (p.type === 'leave') h.leave();
    else if (p.type === 'drop') h.drop(p.paths, p.position.x / dpr(), p.position.y / dpr());
    else h.over(p.position.x / dpr(), p.position.y / dpr());
  });
}

/** Proyectos (.cfast) con los que el sistema abrió la app (doble clic, «Abrir con…»). Vacío en la web. */
export async function takeOpenedFiles(): Promise<string[]> {
  if (!isTauri) return [];
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string[]>('take_opened_files');
}

/** Avisa cuando llegan más archivos mientras la app ya está abierta. Devuelve la función que quita el oyente. */
export async function listenOpenFiles(cb: () => void): Promise<() => void> {
  if (!isTauri) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  return listen('open-files', () => cb());
}
