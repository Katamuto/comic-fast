import type { BalloonObj, Box, TextObj } from '../model/types';
import { balloonGeometry } from './balloon';
import { DEFAULT_TEXT_MARGIN, fitContourText } from './contourText';
import { hasSpans, lineSegments, richWrapper } from './richText';
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
  const rw = !o.vertical && hasSpans(o) ? richWrapper(o.text, o.spans!, o, canvasMeasure) : null;
  const rich = rw ? rw.wrap : undefined;
  let fit: FittedText | null = null;
  if (o.type === 'balloon' && !o.vertical) {
    const contour = balloonGeometry(o).contour;
    if (contour) {
      fit = fitContourText(o.text, contour, (o.textMargin ?? DEFAULT_TEXT_MARGIN) + o.strokeWidth / 2, o, canvasMeasure, 1.2, 8, force, rich);
    }
  }
  if (!fit) {
    fit = o.vertical
      ? fitTextVertical(o.text, textRegion(o), o, canvasMeasure, 1.25, 8, force)
      : fitText(o.text, textRegion(o), o, canvasMeasure, 1.2, 8, force, rich);
  }
  if (rw && fit.words) fit.segs = fit.words.map((ws) => lineSegments(rw.ctx, ws));
  return fit;
}
