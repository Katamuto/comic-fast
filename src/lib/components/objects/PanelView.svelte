<svelte:options namespace="svg" />

<script lang="ts">
  import type { Asset, ID, PanelObj } from '../../model/types';
  import { panelPath } from '../../render/panelShape';
  import { fillRef, isGradient } from '../../render/paint';
  import { parseColor } from '../../render/color';
  import GradientDefs from './GradientDefs.svelte';
  import GradientFill from './GradientFill.svelte';
  import LayerView from './LayerView.svelte';

  interface Props {
    obj: PanelObj;
    assets: Record<ID, Asset>;
    scope: string;
    /** Añade el área de clic con la forma exacta de la viñeta. */
    interactive?: boolean;
  }
  let { obj, assets, scope, interactive = false }: Props = $props();

  const d = $derived(panelPath(obj));
  const clipId = $derived(`${scope}-clip-${obj.id}`);
  const gradId = $derived(`${scope}-grad-${obj.id}`);
  const gradient = $derived(isGradient(obj.fill) ? obj.fill : null);
  // Color y opacidad por separado (fill + fill-opacity): lo entienden todos los motores de SVG.
  const solid = $derived(isGradient(obj.fill) ? null : parseColor(obj.fill));
  const line = $derived(parseColor(obj.stroke));
</script>

<defs>
  <clipPath id={clipId}>
    <path {d} />
  </clipPath>
</defs>
{#if gradient && !gradient.dots}
  <GradientDefs id={gradId} g={gradient} w={obj.w} h={obj.h} />
{/if}
<g clip-path={`url(#${clipId})`}>
  {#if solid}
    <path {d} fill={solid.hex} fill-opacity={solid.alpha} />
  {:else if gradient && gradient.dots}
    <GradientFill id={gradId} g={gradient} w={obj.w} h={obj.h} />
  {:else}
    <path {d} fill={fillRef(obj.fill, gradId)} />
  {/if}
  {#each obj.layers as layer (layer.id)}
    <LayerView {layer} w={obj.w} h={obj.h} {assets} uid={`${scope}-${obj.id}-${layer.id}`} />
  {/each}
  {#if obj.strokeWidth > 0}
    <!-- Trazo doble recortado a la forma = borde de grosor exacto hacia dentro -->
    <path {d} fill="none" stroke={line.hex} stroke-opacity={line.alpha} stroke-width={obj.strokeWidth * 2} stroke-linejoin="miter" />
  {/if}
</g>
{#if interactive}
  <path class="hit" {d} fill="transparent" />
{/if}

<style>
  .hit {
    cursor: move;
    pointer-events: all;
  }
</style>
