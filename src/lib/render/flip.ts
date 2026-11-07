/** Transformación SVG que refleja una caja w × h alrededor de su centro (undefined si no hay reflejo). */
export function flipOf(o: { flipH?: boolean; flipV?: boolean }, w: number, h: number): string | undefined {
  if (!o.flipH && !o.flipV) return undefined;
  const sx = o.flipH ? -1 : 1;
  const sy = o.flipV ? -1 : 1;
  return `translate(${o.flipH ? w : 0} ${o.flipV ? h : 0}) scale(${sx} ${sy})`;
}
