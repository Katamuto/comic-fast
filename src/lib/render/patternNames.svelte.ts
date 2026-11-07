/** Nombre de una trama o textura en el idioma actual (reactivo). */
import { localName, t } from '../i18n/index.svelte';
import type { PatternKind } from '../model/types';
import { patternInfo, patternLabel } from './patterns';

/**
 * Orden: `names.json` de la carpeta (traducción de quien añadió el recurso) →
 * clave de idioma `pattern.<id>` (las incluidas) → nombre del archivo.
 */
export function patternName(kind: PatternKind): string {
  const id = kind.replace(/^img:/, '');
  const viaLocale = t(`pattern.${id}`, undefined, patternLabel(kind));
  return localName(patternInfo(kind)?.names, viaLocale);
}
