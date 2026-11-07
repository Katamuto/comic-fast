/**
 * Registro de acciones: una sola definición alimenta los menús, los atajos de
 * teclado y el estado habilitado/marcado. Para añadir un comando nuevo basta
 * con agregarlo a `actions` y a un menú.
 */
import { editor } from '../model/store.svelte';
import { PAGE_PRESETS } from '../model/defaults';
import { needsRegion } from '../render/patterns';
import * as files from '../io/fileActions';
import { isTauri, openExternal, quitApp } from '../io/platform';
import { DONATE_URL } from './config';
import { t } from '../i18n/index.svelte';
import { appearance, DEFAULT_SCALE } from './appearance.svelte';
import { device } from './device.svelte';
import { imageEditor } from './imageEditor.svelte';
import type { MenuEntry } from './contextMenu.svelte';

export interface Action {
  id: string;
  label: string | (() => string);
  /** Atajos. El primero se muestra en el menú. Formato: Mod+Alt+Shift+Tecla. */
  keys?: string[];
  run: () => void | Promise<void>;
  enabled?: () => boolean;
  checked?: () => boolean;
}

const hasSelection = () => editor.selection.length > 0;
const selectedPanel = () => {
  const s = editor.single;
  return s && s.type === 'panel' ? s : null;
};
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const presetActions: Action[] = PAGE_PRESETS.map((p) => ({
  id: `page.size.${p.id}`,
  label: () => t('act.page.sizePreset', { size: t(`size.${p.id}`, undefined, p.label) }),
  run: () => editor.setPageSize(p.w, p.h),
  checked: () => editor.doc.pageW === p.w && editor.doc.pageH === p.h
}));

export const actions: Action[] = [
  // Archivo
  { id: 'file.new', label: () => t('act.file.new'), keys: ['Mod+N'], run: () => files.newProject() },
  {
    id: 'file.newFromTemplate',
    label: () => t('act.file.newFromTemplate'),
    run: () => {
      editor.showTemplates = true;
    }
  },
  { id: 'file.open', label: () => t('act.file.open'), keys: ['Mod+O'], run: () => files.openProject() },
  { id: 'file.save', label: () => t('act.file.save'), keys: ['Mod+S'], run: () => files.saveProject(false) },
  { id: 'file.saveAs', label: () => t('act.file.saveAs'), keys: ['Mod+Shift+S'], run: () => files.saveProject(true) },
  {
    id: 'file.newDrawing',
    label: () => t('img.newDrawing'),
    run: () => {
      imageEditor.showNew = true;
    }
  },
  { id: 'file.importImages', label: () => t('act.file.importImages'), keys: ['Mod+I'], run: () => void files.importImages() },
  {
    id: 'file.fonts',
    label: () => t('act.file.fonts'),
    run: () => {
      editor.showFonts = true;
    }
  },
  { id: 'file.exportPng', label: () => t('act.file.exportPng'), keys: ['Mod+E'], run: () => files.exportCurrentPng() },
  { id: 'file.exportPdf', label: () => t('act.file.exportPdf'), keys: ['Mod+Shift+E'], run: () => files.exportAllPdf() },
  { id: 'file.exportCbz', label: () => t('act.file.exportCbz'), run: () => files.exportAllCbz() },
  { id: 'file.quit', label: () => t('act.file.quit'), keys: ['Mod+Q'], run: () => void quitApp() },

  // Editar
  {
    id: 'edit.undo',
    label: () => (editor.undoLabel ? t('act.edit.undoNamed', { what: editor.undoLabel }) : t('act.edit.undo')),
    keys: ['Mod+Z'],
    run: () => editor.undo(),
    enabled: () => editor.canUndo
  },
  {
    id: 'edit.redo',
    label: () => (editor.redoLabel ? t('act.edit.redoNamed', { what: editor.redoLabel }) : t('act.edit.redo')),
    keys: ['Mod+Shift+Z', 'Mod+Y'],
    run: () => editor.redo(),
    enabled: () => editor.canRedo
  },
  {
    id: 'edit.cut',
    label: () => t('act.edit.cut'),
    keys: ['Mod+X'],
    run: () => {
      editor.copy();
      editor.removeSelected();
    },
    enabled: () => hasSelection() && !editor.selectionLocked
  },
  { id: 'edit.copy', label: () => t('act.edit.copy'), keys: ['Mod+C'], run: () => editor.copy(), enabled: hasSelection },
  { id: 'edit.paste', label: () => t('act.edit.paste'), keys: ['Mod+V'], run: () => editor.paste(), enabled: () => editor.canPaste },
  { id: 'edit.duplicate', label: () => t('act.edit.duplicate'), keys: ['Mod+D'], run: () => editor.duplicate(), enabled: hasSelection },
  { id: 'edit.delete', label: () => t('act.edit.delete'), keys: ['Delete', 'Backspace'], run: () => editor.removeSelected(), enabled: hasSelection },
  {
    id: 'edit.lock',
    label: () => (editor.selectionLocked ? t('act.edit.unlock') : t('act.edit.lock')),
    keys: ['Mod+L'],
    run: () => editor.toggleLock(),
    enabled: hasSelection,
    checked: () => editor.selectionLocked
  },
  { id: 'edit.selectAll', label: () => t('act.edit.selectAll'), keys: ['Mod+A'], run: () => editor.selectAll() },
  { id: 'edit.front', label: () => t('act.edit.front'), keys: ['Mod+Shift+ArrowUp'], run: () => editor.reorder('front'), enabled: hasSelection },
  { id: 'edit.forward', label: () => t('act.edit.forward'), keys: ['Mod+ArrowUp'], run: () => editor.reorder('forward'), enabled: hasSelection },
  { id: 'edit.backward', label: () => t('act.edit.backward'), keys: ['Mod+ArrowDown'], run: () => editor.reorder('backward'), enabled: hasSelection },
  { id: 'edit.back', label: () => t('act.edit.back'), keys: ['Mod+Shift+ArrowDown'], run: () => editor.reorder('back'), enabled: hasSelection },

  {
    id: 'edit.layerMode',
    label: () => t('act.edit.layerMode'),
    keys: ['Enter'],
    run: () => {
      editor.layerMode = !editor.layerMode;
    },
    enabled: () => {
      const l = editor.activeLayer;
      return l?.type === 'image' || (l?.type === 'pattern' && needsRegion(l.kind));
    },
    checked: () => editor.layerMode
  },
  {
    id: 'panel.toPolygon',
    label: () => t('act.panel.toPolygon'),
    run: () => {
      const p = selectedPanel();
      if (p) editor.setShape(p.id, 'poly');
    },
    enabled: () => {
      const p = selectedPanel();
      return p !== null && p.shape !== 'poly';
    }
  },

  // Página
  { id: 'page.add', label: () => t('act.page.add'), keys: ['Mod+Shift+N'], run: () => editor.addPage() },
  { id: 'page.duplicate', label: () => t('act.page.duplicate'), run: () => editor.duplicatePage() },
  { id: 'page.delete', label: () => t('act.page.delete'), run: () => editor.removePage(), enabled: () => editor.doc.pages.length > 1 },
  { id: 'page.prev', label: () => t('act.page.prev'), keys: ['PageUp'], run: () => editor.gotoPage(editor.pageIndex - 1), enabled: () => editor.pageIndex > 0 },
  {
    id: 'page.next',
    label: () => t('act.page.next'),
    keys: ['PageDown'],
    run: () => editor.gotoPage(editor.pageIndex + 1),
    enabled: () => editor.pageIndex < editor.doc.pages.length - 1
  },
  ...presetActions,
  {
    id: 'page.size.custom',
    label: () => t('act.page.size.custom'),
    run: () => {
      editor.showPageSize = true;
    }
  },

  // Ver
  {
    id: 'view.styleMode',
    label: () => t('act.view.styleMode'),
    keys: ['Mod+Shift+Y'],
    run: () => editor.setStyleMode(!editor.styleMode),
    checked: () => editor.styleMode
  },
  { id: 'view.zoomIn', label: () => t('act.view.zoomIn'), keys: ['Mod+=', 'Mod++'], run: () => editor.zoomBy(1.25) },
  { id: 'view.zoomOut', label: () => t('act.view.zoomOut'), keys: ['Mod+-'], run: () => editor.zoomBy(0.8) },
  { id: 'view.zoom100', label: () => t('act.view.zoom100'), keys: ['Mod+1'], run: () => editor.setZoom(1) },
  { id: 'view.fit', label: () => t('act.view.fit'), keys: ['Mod+0'], run: () => editor.fitView?.() },
  {
    id: 'view.grid',
    label: () => t('act.view.grid'),
    keys: ['Mod+G'],
    run: () => {
      editor.showGrid = !editor.showGrid;
    },
    checked: () => editor.showGrid
  },
  {
    id: 'view.snap',
    label: () => t('act.view.snap'),
    keys: ['Mod+Shift+G'],
    run: () => {
      editor.snap = !editor.snap;
    },
    checked: () => editor.snap
  },

  { id: 'edit.flipH', label: () => t('act.edit.flipH'), run: () => editor.flip('h'), enabled: () => editor.canFlip() },
  { id: 'edit.flipV', label: () => t('act.edit.flipV'), run: () => editor.flip('v'), enabled: () => editor.canFlip() },
  {
    id: 'edit.distribute',
    label: () => t('act.edit.distribute'),
    run: () => {
      editor.showDistribute = true;
    }
  },
  {
    id: 'page.noStyle',
    label: () => t('act.page.noStyle'),
    run: () => editor.setPageFlag(editor.pageIndex, 'noStyle', !editor.page.noStyle),
    checked: () => !!editor.page.noStyle
  },
  {
    id: 'page.noNumber',
    label: () => t('act.page.noNumber'),
    run: () => editor.setPageFlag(editor.pageIndex, 'noNumber', !editor.page.noNumber),
    checked: () => !!editor.page.noNumber
  },
  {
    id: 'page.noGlobals',
    label: () => t('act.page.noGlobals'),
    run: () => editor.setPageFlag(editor.pageIndex, 'noGlobals', !editor.page.noGlobals),
    checked: () => !!editor.page.noGlobals
  },
  {
    id: 'page.reorganize',
    label: () => t('act.page.reorganize'),
    run: () => {
      editor.showReorg = true;
    }
  },
  {
    id: 'doc.globals',
    label: () => t('act.doc.globals'),
    run: () => {
      editor.showGlobals = true;
    }
  },
  {
    id: 'edit.editImage',
    label: () => t('img.edit'),
    run: () => imageEditor.openCurrent(),
    enabled: () => imageEditor.currentTarget() !== null
  },
  {
    id: 'view.fullscreen',
    label: () => (device.fullscreen ? t('act.view.exitFullscreen') : t('act.view.fullscreen')),
    keys: ['Mod+Shift+F'],
    run: async () => {
      if (device.standalone) {
        editor.status = t('fs.installed');
        return;
      }
      const ok = await device.toggleFullscreen();
      if (!ok) editor.status = t('fs.unsupported');
    },
    checked: () => device.fullscreen
  },
  {
    id: 'view.theme',
    label: () => (appearance.effectiveTheme === 'dark' ? t('act.view.themeLight') : t('act.view.themeDark')),
    run: () => appearance.toggleTheme()
  },
  { id: 'view.textBigger', label: () => t('act.view.textBigger'), run: () => appearance.stepScale(1), enabled: () => appearance.canGrow },
  { id: 'view.textSmaller', label: () => t('act.view.textSmaller'), run: () => appearance.stepScale(-1), enabled: () => appearance.canShrink },
  { id: 'view.textReset', label: () => t('act.view.textReset'), run: () => appearance.setScale(DEFAULT_SCALE), enabled: () => appearance.scale !== DEFAULT_SCALE },

  // Ayuda
  {
    id: 'help.welcome',
    label: () => t('act.help.welcome'),
    run: () => {
      editor.showSplash = true;
    }
  },
  {
    id: 'help.donate',
    label: () => t('act.help.donate'),
    run: () => openExternal(DONATE_URL),
    enabled: () => DONATE_URL !== ''
  },
  {
    id: 'help.guide',
    label: () => t('act.help.guide'),
    keys: ['F1'],
    run: () => {
      editor.showHelp = true;
    }
  },
  {
    id: 'help.eula',
    label: () => t('act.help.eula'),
    run: () => {
      editor.showEula = true;
    }
  },
  {
    id: 'help.about',
    label: () => t('act.help.about'),
    run: () => {
      editor.showAbout = true;
    }
  }
];

export const actionMap = new Map(actions.map((a) => [a.id, a]));

export interface Menu {
  /** Clave de traducción del título del menú. */
  label: string;
  /** Ids de acción; '-' es un separador. */
  entries: string[];
}

export const menus: Menu[] = [
  {
    label: 'menu.file',
    entries: [
      'file.new', 'file.newFromTemplate', 'file.open', '-', 'file.save', 'file.saveAs', '-', 'file.importImages', 'file.newDrawing', 'file.fonts', '-',
      'file.exportPng', 'file.exportPdf', 'file.exportCbz', ...(isTauri ? ['-', 'file.quit'] : [])
    ]
  },
  {
    label: 'menu.edit',
    entries: [
      'edit.undo', 'edit.redo', '-', 'edit.cut', 'edit.copy', 'edit.paste', 'edit.duplicate', 'edit.delete', 'edit.selectAll', '-',
      'edit.front', 'edit.forward', 'edit.backward', 'edit.back', '-',
      'edit.lock', '-',
      'edit.layerMode', 'panel.toPolygon', 'edit.editImage', 'edit.flipH', 'edit.flipV', 'edit.distribute'
    ]
  },
  {
    label: 'menu.page',
    entries: [
      'page.add', 'page.duplicate', 'page.delete', '-', 'page.prev', 'page.next', 'page.reorganize', '-',
      'page.noStyle', 'page.noNumber', 'page.noGlobals', 'doc.globals', '-',
      ...presetActions.map((a) => a.id),
      '-',
      'page.size.custom'
    ]
  },
  { label: 'menu.view', entries: ['view.styleMode', '-', 'view.zoomIn', 'view.zoomOut', 'view.zoom100', 'view.fit', '-', 'view.grid', 'view.snap', '-', ...(isTauri ? [] : ['view.fullscreen']), 'view.theme', 'view.textBigger', 'view.textSmaller', 'view.textReset'] },
  { label: 'menu.help', entries: ['help.guide', 'help.welcome', '-', 'help.eula', 'help.about', ...(DONATE_URL ? ['-', 'help.donate'] : [])] }
];

/** Entradas del menú contextual (clic derecho). Mismas acciones que el menú Edición. */
export const contextEntries: string[] = ['edit.cut', 'edit.copy', 'edit.paste', '-', 'edit.duplicate', 'edit.delete', '-', 'edit.editImage', 'edit.flipH', 'edit.flipV'];

/** Entradas de un menú contextual a partir de ids de acción ('-' = separador). */
export function actionEntries(ids: string[]): MenuEntry[] {
  const out: MenuEntry[] = [];
  for (const id of ids) {
    if (id === '-') {
      out.push('-');
      continue;
    }
    const a = actionMap.get(id);
    if (!a) continue;
    out.push({ label: labelOf(a), keys: formatKeys(a.keys?.[0]), enabled: a.enabled?.() ?? true, run: () => void a.run() });
  }
  return out;
}

export function labelOf(a: Action): string {
  return typeof a.label === 'function' ? a.label() : a.label;
}

// --- Atajos de teclado ---------------------------------------------------------

const KEY_NAMES: Record<string, string> = {
  Delete: 'Supr',
  Backspace: '⌫',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  PageUp: 'Re Pág',
  PageDown: 'Av Pág'
};

/** Texto del atajo para mostrar en el menú (Ctrl o ⌘ según el sistema). */
export function formatKeys(combo: string | undefined): string {
  if (!combo) return '';
  return combo
    .split(/\+(?!$)/)
    .map((part) => (part === 'Mod' ? (isMac ? '⌘' : 'Ctrl') : part === 'Shift' ? (isMac ? '⇧' : 'Shift') : KEY_NAMES[part] ?? part))
    .join(isMac ? '' : '+');
}

const shortcutMap = new Map<string, Action>();
for (const a of actions) for (const k of a.keys ?? []) shortcutMap.set(k, a);

function comboOf(e: KeyboardEvent): string {
  const isLetter = /^[a-z]$/i.test(e.key);
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Mod');
  if (e.altKey) parts.push('Alt');
  // Con símbolos (+, =, -) el Shift depende del teclado: se ignora.
  if (e.shiftKey && (isLetter || e.key.length > 1)) parts.push('Shift');
  parts.push(key);
  return parts.join('+');
}

function isTextEntry(t: HTMLElement | null): boolean {
  if (!t) return false;
  if (t.isContentEditable || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return true;
  if (t.tagName !== 'INPUT') return false;
  const type = (t as HTMLInputElement).type;
  return !['range', 'color', 'checkbox', 'radio', 'button'].includes(type);
}

/** Manejador global de teclado: atajos del registro + teclas del lienzo. */
export function handleKeydown(e: KeyboardEvent): void {
  // Con un diálogo abierto, los atajos del editor no deben actuar sobre la página.
  if (editor.showSplash || editor.showAbout || editor.showPageSize || editor.showHelp || editor.showEula || editor.showNotice || editor.showDownload || editor.showFonts || editor.showGlobals || editor.showTemplates || editor.showReorg || editor.showDistribute || imageEditor.showNew || imageEditor.isOpen) return;
  const target = e.target as HTMLElement | null;
  const typing = isTextEntry(target);

  const action = shortcutMap.get(comboOf(e));
  if (action && (!typing || action.id.startsWith('file.'))) {
    if (action.enabled?.() ?? true) {
      e.preventDefault();
      void action.run();
    }
    return;
  }

  if (typing) {
    if (e.key === 'Escape') target?.blur();
    return;
  }

  if (e.key === 'Escape') {
    if (editor.editingId) editor.stopEditing();
    else if (editor.layerMode) editor.layerMode = false;
    else editor.select([]);
    return;
  }

  if (e.key === 'Enter') {
    const s = editor.single;
    if (s && (s.type === 'balloon' || s.type === 'text')) {
      e.preventDefault();
      editor.startEditing(s.id);
    }
    return;
  }

  const arrows: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1]
  };
  const dir = arrows[e.key];
  if (dir && editor.selection.length > 0 && !e.ctrlKey && !e.metaKey && (target as HTMLInputElement | null)?.type !== 'range') {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    editor.nudge(dir[0] * step, dir[1] * step);
  }
}
