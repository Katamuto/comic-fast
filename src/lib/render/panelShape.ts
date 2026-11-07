import type { PanelObj } from '../model/types';
import { pointsPx } from '../model/panelGeometry';

const f = (n: number) => Math.round(n * 100) / 100;

/** Trazado SVG de la silueta de una viñeta (coordenadas locales, 0..w × 0..h). */
export function panelPath(o: Pick<PanelObj, 'shape' | 'points' | 'w' | 'h'>): string {
  const { w, h } = o;
  if (o.shape === 'ellipse') {
    const rx = f(w / 2);
    const ry = f(h / 2);
    return `M 0 ${ry} A ${rx} ${ry} 0 1 0 ${f(w)} ${ry} A ${rx} ${ry} 0 1 0 0 ${ry} Z`;
  }
  if (o.shape === 'poly' && o.points.length >= 3) {
    return pointsPx(o.points, w, h).map((p, i) => `${i ? 'L' : 'M'} ${f(p.x)} ${f(p.y)}`).join(' ') + ' Z';
  }
  return `M 0 0 L ${f(w)} 0 L ${f(w)} ${f(h)} L 0 ${f(h)} Z`;
}
