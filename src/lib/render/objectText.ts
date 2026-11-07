import type { BalloonObj, Box, TextObj } from '../model/types';
import { balloonGeometry } from './balloon';
import { DEFAULT_TEXT_MARGIN, fitContourText } from './contourText';
import { fitText, fitTextVertical, type FittedText, type Measure } from './textLayout';

let ctx: CanvasRenderingContext2D | null = null;

/** Mide texto con un canvas 2D reutilizable (necesita DOM). */
export const canvasMeasure: Measure = (font) => {
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  const c = ctx!;
  c.font = font;
  return (text) => c.measureText(text).width;
};

/** Región (en coordenadas locales del objeto) donde se coloca el texto. */
export function textRegion(o: BalloonObj | TextObj): Box {
  if (o.type === 'balloon') return balloonGeometry(o).textBox;
  return { x: 4, y: 2, w: Math.max(1, o.w - 8), h: Math.max(1, o.h - 4) };
}

/** Texto ya partido en líneas y con el tamaño de fuente final. */
export function fitObjectText(o: BalloonObj | TextObj, force = false): FittedText {
  if (o.type === 'balloon' && !o.vertical) {
    const contour = balloonGeometry(o).contour;
    if (contour) {
      const fit = fitContourText(o.text, contour, (o.textMargin ?? DEFAULT_TEXT_MARGIN) + o.strokeWidth / 2, o, canvasMeasure, 1.2, 8, force);
      if (fit) return fit;
    }
  }
  return o.vertical
    ? fitTextVertical(o.text, textRegion(o), o, canvasMeasure, 1.25, 8, force)
    : fitText(o.text, textRegion(o), o, canvasMeasure, 1.2, 8, force);
}
