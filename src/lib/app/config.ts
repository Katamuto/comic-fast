/**
 * Enlace de donativos. Se lee de `src/site.config.ts` (que va dentro del repositorio y por
 * tanto llega a TODAS las compilaciones: web y escritorio). Opcionalmente, la variable
 * `VITE_DONATE_URL` lo sustituye al compilar. Debe ser https; vacío = sin botón.
 */
import { SITE } from '../../site.config';

const clean = (v: unknown): string => (typeof v === 'string' && /^https:\/\//i.test(v.trim()) ? v.trim() : '');

export const DONATE_URL = clean(import.meta.env.VITE_DONATE_URL) || clean(SITE.donateUrl);
