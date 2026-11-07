<svelte:options namespace="svg" />

<script lang="ts">
  /**
   * Pinta un degradado sobre toda la caja w × h: continuo, o hecho de puntos si el degradado los tiene.
   * Con puntos: o bien el degradado colorea los puntos (fondo transparente) o colorea el fondo (puntos huecos).
   */
  import type { Gradient } from '../../model/types';
  import { dotsPath } from '../../render/dotGradient';
  import GradientDefs from './GradientDefs.svelte';

  interface Props {
    id: string;
    g: Gradient;
    w: number;
    h: number;
    opacity?: number;
  }
  let { id, g, w, h, opacity = 1 }: Props = $props();

  const dots = $derived(g.dots ? dotsPath(g, w, h) : '');
</script>

<GradientDefs {id} {g} {w} {h} />
{#if !g.dots}
  <rect width={w} height={h} fill={`url(#${id})`} {opacity} />
{:else if g.dots.bg}
  <defs>
    <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
      <rect width={w} height={h} fill="#fff" />
      <path d={dots} fill="#000" />
    </mask>
  </defs>
  <rect width={w} height={h} fill={`url(#${id})`} mask={`url(#${id}-m)`} {opacity} />
{:else}
  <path d={dots} fill={`url(#${id})`} {opacity} />
{/if}
