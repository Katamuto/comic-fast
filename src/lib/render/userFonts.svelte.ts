/**
 * Fuentes que la persona importa desde su equipo (TTF, OTF, WOFF, WOFF2).
 *
 * Se guardan DENTRO del proyecto (.cfast), así el cómic se ve igual en otro equipo, y se
 * registran en el navegador con la API FontFace. Al exportar se incrustan en el SVG (ver
 * io/render.ts). Comic Fast no comprueba licencias: eso es responsabilidad de quien importa.
 */
import { uid } from '../model/ids';
import type { FontData } from '../model/types';
import { fontState } from './fonts.svelte';
import { parseFontFile } from './fontFiles';

/** Tamaño máximo de un archivo de fuente (las fuentes con miles de glifos pueden ser grandes). */
export const MAX_FONT_BYTES = 12 * 1024 * 1024;

export interface FontImportResult {
  added: FontData[];
  /** Nombres de archivo que no se pudieron usar. */
  failed: string[];
}

class UserFonts {
  list = $state.raw<FontData[]>([]);
  private faces = new Map<string, FontFace>();

  private async register(f: FontData): Promise<void> {
    const face = new FontFace(f.family, f.bytes.slice().buffer as ArrayBuffer, { weight: f.weight, style: f.style });
    document.fonts.add(await face.load());
    this.faces.set(f.id, face);
  }

  private unregister(id: string): void {
    const face = this.faces.get(id);
    if (face) document.fonts.delete(face);
    this.faces.delete(id);
  }

  private publish(): void {
    fontState.user = [...new Set(this.list.map((f) => f.family))];
    fontState.ready++; // los textos se vuelven a medir
  }

  /** Importa archivos de fuente. Los que no sirvan se devuelven en `failed`. */
  async add(files: { name: string; bytes: Uint8Array }[]): Promise<FontImportResult> {
    const added: FontData[] = [];
    const failed: string[] = [];
    for (const file of files) {
      const info = parseFontFile(file.name);
      if (!info || file.bytes.length === 0 || file.bytes.length > MAX_FONT_BYTES) {
        failed.push(file.name);
        continue;
      }
      const data: FontData = {
        id: uid(),
        name: file.name,
        family: info.family,
        weight: info.weight,
        style: info.style,
        mime: info.mime,
        bytes: file.bytes
      };
      try {
        await this.register(data);
      } catch {
        failed.push(file.name);
        continue;
      }
      // La misma familia, peso y estilo reemplaza a la anterior.
      const dup = this.list.filter((f) => f.family === data.family && f.weight === data.weight && f.style === data.style);
      for (const d of dup) this.unregister(d.id);
      this.list = [...this.list.filter((f) => !dup.includes(f)), data];
      added.push(data);
    }
    if (added.length > 0) this.publish();
    return { added, failed };
  }

  remove(id: string): void {
    this.unregister(id);
    this.list = this.list.filter((f) => f.id !== id);
    this.publish();
  }

  /** Sustituye todas las fuentes (al abrir un proyecto). Una que no cargue se ignora. */
  async replaceAll(fonts: FontData[]): Promise<void> {
    for (const id of [...this.faces.keys()]) this.unregister(id);
    const ok: FontData[] = [];
    for (const f of fonts) {
      try {
        await this.register(f);
        ok.push(f);
      } catch {
        console.warn(`No se pudo cargar la fuente ${f.family}`);
      }
    }
    this.list = ok;
    this.publish();
  }
}

export const userFonts = new UserFonts();
