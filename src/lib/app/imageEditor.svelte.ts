/**
 * Estado del editor de imágenes incorporado (ventana tipo «Paint»).
 * Se puede abrir desde un recurso (imagen importada), desde una imagen de la página o desde la capa
 * de imagen de una viñeta. Al guardar siempre se crea un recurso NUEVO (el original no se toca); si se
 * abrió desde la página, además se puede cambiar el objeto/capa para que use la imagen editada.
 */
import { editor } from '../model/store.svelte';
import type { ID } from '../model/types';

export type EditTarget =
  | { kind: 'new'; w: number; h: number; bg: string }
  | { kind: 'asset'; assetId: ID }
  | { kind: 'object'; assetId: ID; objectId: ID }
  | { kind: 'layer'; assetId: ID; panelId: ID; layerId: ID };

/** Ajustes de la tableta gráfica (se recuerdan entre sesiones). */
export interface TabletPrefs {
  /** La presión controla el tamaño. */
  size: boolean;
  /** Tamaño con presión 0, como fracción del tamaño elegido (el rango va de este valor a 1). */
  sizeMin: number;
  /** La presión controla la opacidad. */
  opacity: boolean;
  /** Opacidad con presión 0, como fracción de la elegida. */
  opacityMin: number;
}
const PREFS_KEY = 'comicfast.tablet';
const DEFAULT_PREFS: TabletPrefs = { size: true, sizeMin: 0.15, opacity: false, opacityMin: 0.2 };

function loadPrefs(): TabletPrefs {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PREFS_KEY) : null;
    if (raw) {
      const j = JSON.parse(raw) as Partial<TabletPrefs>;
      return {
        size: typeof j.size === 'boolean' ? j.size : DEFAULT_PREFS.size,
        sizeMin: typeof j.sizeMin === 'number' ? Math.min(1, Math.max(0, j.sizeMin)) : DEFAULT_PREFS.sizeMin,
        opacity: typeof j.opacity === 'boolean' ? j.opacity : DEFAULT_PREFS.opacity,
        opacityMin: typeof j.opacityMin === 'number' ? Math.min(1, Math.max(0, j.opacityMin)) : DEFAULT_PREFS.opacityMin
      };
    }
  } catch {
    /* sin almacenamiento: valores por defecto */
  }
  return { ...DEFAULT_PREFS };
}

class ImageEditorState {
  target = $state.raw<EditTarget | null>(null);
  /** Diálogo «Nuevo dibujo» abierto. */
  showNew = $state(false);
  prefs = $state<TabletPrefs>(loadPrefs());

  savePrefs(): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      /* sin almacenamiento */
    }
  }

  /** Abre el editor con un lienzo en blanco ('transparent' o un color #rrggbb). */
  openNew(w: number, h: number, bg: string): void {
    this.showNew = false;
    this.target = { kind: 'new', w: Math.round(w), h: Math.round(h), bg };
  }

  get isOpen(): boolean {
    return this.target !== null;
  }

  openAsset(assetId: ID): void {
    if (editor.assets[assetId]) this.target = { kind: 'asset', assetId };
  }

  /** Lo que haya seleccionado: una imagen suelta o la capa de imagen activa de una viñeta. */
  currentTarget(): EditTarget | null {
    const s = editor.single;
    if (!s) return null;
    if (s.type === 'image' && editor.assets[s.assetId]) return { kind: 'object', assetId: s.assetId, objectId: s.id };
    if (s.type === 'panel') {
      const l = editor.activeLayer;
      if (l && l.type === 'image' && editor.assets[l.assetId]) return { kind: 'layer', assetId: l.assetId, panelId: s.id, layerId: l.id };
    }
    return null;
  }

  openCurrent(): void {
    const t = this.currentTarget();
    if (t) this.target = t;
  }

  close(): void {
    this.target = null;
  }
}

export const imageEditor = new ImageEditorState();
