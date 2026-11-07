<svelte:options namespace="svg" />

<script lang="ts">
  import type { Gradient } from '../../model/types';
  import { gradientGeometry } from '../../render/paint';
  import { parseColor } from '../../render/color';

  interface Props {
    id: string;
    g: Gradient;
    /** Caja sobre la que se calcula el degradado. */
    w: number;
    h: number;
  }
  let { id, g, w, h }: Props = $props();

  const geo = $derived(gradientGeometry(g, w, h));
  const s1 = $derived(parseColor(g.c1));
  const s2 = $derived(parseColor(g.c2));
</script>

<defs>
  {#if geo.kind === 'linear'}
    <linearGradient {id} gradientUnits="userSpaceOnUse" x1={geo.x1} y1={geo.y1} x2={geo.x2} y2={geo.y2}>
      <stop offset="0" stop-color={s1.hex} stop-opacity={s1.alpha} />
      <stop offset="1" stop-color={s2.hex} stop-opacity={s2.alpha} />
    </linearGradient>
  {:else if geo.kind === 'reflected'}
    <!-- Espejo: color 2 – color 1 (en el centro) – color 2 -->
    <linearGradient {id} gradientUnits="userSpaceOnUse" x1={2 * geo.cx - geo.x2} y1={2 * geo.cy - geo.y2} x2={geo.x2} y2={geo.y2}>
      <stop offset="0" stop-color={s2.hex} stop-opacity={s2.alpha} />
      <stop offset="0.5" stop-color={s1.hex} stop-opacity={s1.alpha} />
      <stop offset="1" stop-color={s2.hex} stop-opacity={s2.alpha} />
    </linearGradient>
  {:else}
    <radialGradient {id} gradientUnits="userSpaceOnUse" cx={geo.cx} cy={geo.cy} r={geo.r}>
      <stop offset="0" stop-color={s1.hex} stop-opacity={s1.alpha} />
      <stop offset="1" stop-color={s2.hex} stop-opacity={s2.alpha} />
    </radialGradient>
  {/if}
</defs>
