let counter = 0;

/** Identificador corto y único dentro de un proyecto. */
export function uid(): string {
  counter = (counter + 1) % 1_679_616; // 36^4
  const time = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${time}${counter.toString(36).padStart(4, '0')}${rnd}`;
}
