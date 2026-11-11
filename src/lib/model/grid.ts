/**
 * Cuadrícula relativa a la página: la página se divide en `cols` columnas iguales (celdas
 * cuadradas) y cada celda en `sub` subdivisiones. El imán usa la subdivisión más fina.
 */
export interface GridSpec {
  cols: number;
  sub: number;
}

export const DEFAULT_GRID: GridSpec = { cols: 12, sub: 1 };

export const clampGrid = (g: GridSpec): GridSpec => ({
  cols: Math.min(100, Math.max(1, Math.round(g.cols) || DEFAULT_GRID.cols)),
  sub: Math.min(16, Math.max(1, Math.round(g.sub) || 1))
});

/** Lado de una celda principal. */
export const cellSize = (pageW: number, g: GridSpec) => pageW / clampGrid(g).cols;

/** Paso del imán: la subdivisión más fina. */
export const gridStep = (pageW: number, g: GridSpec) => cellSize(pageW, g) / clampGrid(g).sub;

/** Posiciones (en unidades de página) de las líneas verticales/horizontales; `major` marca las de la cuadrícula principal. */
export function gridLines(pageW: number, pageH: number, g: GridSpec): { x: { at: number; major: boolean }[]; y: { at: number; major: boolean }[] } {
  const { sub } = clampGrid(g);
  const step = gridStep(pageW, g);
  const axis = (len: number) => {
    const out: { at: number; major: boolean }[] = [];
    const n = Math.floor(len / step + 1e-6);
    for (let i = 0; i <= n; i++) out.push({ at: i * step, major: i % sub === 0 });
    return out;
  };
  return { x: axis(pageW), y: axis(pageH) };
}
