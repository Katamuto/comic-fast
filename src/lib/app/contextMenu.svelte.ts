/**
 * Menú contextual (clic derecho). Cada zona de la interfaz decide sus entradas:
 *   - lienzo: cortar, copiar, pegar, duplicar, eliminar;
 *   - lista de páginas: añadir y borrar página;
 *   - recursos importados: quitar el recurso.
 * El resto de la interfaz no muestra ningún menú (ni el del navegador).
 * Lo dibuja ContextMenu.svelte.
 */
export type MenuEntry =
  | '-'
  | {
      label: string;
      /** Atajo para mostrar a la derecha (texto ya formateado). */
      keys?: string;
      enabled?: boolean;
      run: () => void;
    };

class ContextMenuState {
  open = $state(false);
  x = $state(0);
  y = $state(0);
  entries = $state.raw<MenuEntry[]>([]);

  show(x: number, y: number, entries: MenuEntry[]): void {
    if (entries.every((e) => e === '-')) return;
    this.x = x;
    this.y = y;
    this.entries = entries;
    this.open = true;
  }

  close(): void {
    this.open = false;
  }
}

export const contextMenu = new ContextMenuState();
