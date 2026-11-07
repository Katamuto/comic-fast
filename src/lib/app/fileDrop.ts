/** Punto de enlace entre la ventana (App) y el lienzo para archivos soltados desde el sistema. */
import type { Asset } from '../model/types';

export const fileDrop: {
  /** Lo registra el lienzo: coloca las imágenes en las coordenadas de pantalla (o rellena la viñeta que haya debajo). */
  place: ((assets: Asset[], clientX: number, clientY: number) => void) | null;
} = { place: null };
