/** Modo de visualización de un panel de miniaturas (recursos, páginas): tamaño de cuadrícula o lista. Se recuerda. */
import { readPref, writePref } from './prefs';

export type ViewMode = 's' | 'm' | 'l' | 'list';

export class ViewPref {
  value = $state<ViewMode>('m');
  constructor(
    private key: string,
    private allowed: ViewMode[],
    initial: ViewMode = 'm'
  ) {
    const saved = readPref(key) as ViewMode | null;
    this.value = saved && allowed.includes(saved) ? saved : initial;
  }
  get modes(): ViewMode[] {
    return this.allowed;
  }
  set(v: ViewMode): void {
    if (!this.allowed.includes(v)) return;
    this.value = v;
    writePref(this.key, v);
  }
}

export const resourceView = new ViewPref('view.resources', ['s', 'm', 'l', 'list']);
export const pageView = new ViewPref('view.pages', ['s', 'm', 'list']);
