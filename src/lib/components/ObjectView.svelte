<svelte:options namespace="svg" />

<script lang="ts">
  import type { Asset, ID, PageObject } from '../model/types';
  import PanelView from './objects/PanelView.svelte';
  import ImageView from './objects/ImageView.svelte';
  import BalloonView from './objects/BalloonView.svelte';
  import TextView from './objects/TextView.svelte';
  import PatternView from './objects/PatternView.svelte';
  import { blendCss } from '../render/blend';
  import { panelPath } from '../render/panelShape';
  import type { PanelObj } from '../model/types';

  interface Props {
    obj: PageObject;
    assets: Record<ID, Asset>;
    /** Prefijo para ids internos (clipPath, pattern) y evitar colisiones entre vistas. */
    scope: string;
    /** Añade el área de selección con el puntero (solo en el lienzo principal). */
    interactive?: boolean;
    hideText?: boolean;
    /** Pasada de dibujo de un globo fundido con otros (ver model/balloonLinks.ts). */
    phase?: 'all' | 'stroke' | 'fill' | 'text';
    /** Viñeta a cuya forma se recorta (globos/textos metidos en una viñeta a propósito). */
    clipTo?: PanelObj | null;
  }
  let { obj, assets, scope, interactive = false, hideText = false, phase = 'all', clipTo = null }: Props = $props();

  const dist = $derived(obj.distort && obj.distort.amount > 0 ? obj.distort : null);
  const distId = $derived(`${scope}-dist-${obj.id}`);
  const clipTransform = $derived(
    clipTo ? `rotate(${clipTo.rotation} ${clipTo.x + clipTo.w / 2} ${clipTo.y + clipTo.h / 2}) translate(${clipTo.x} ${clipTo.y})` : ''
  );
  const clipId = $derived(`${scope}-pclip-${obj.id}`);
  const transform = $derived(
    `rotate(${obj.rotation} ${obj.x + obj.w / 2} ${obj.y + obj.h / 2}) translate(${obj.x} ${obj.y})`
  );
</script>

{#snippet content()}
{#if dist}
  <defs>
    <!-- Distorsión ondulada: ruido que desplaza los píxeles (escala × 2 porque el ruido se centra en 0,5). -->
    <filter id={distId} x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency={1 / Math.max(4, dist.size)} numOctaves="2" seed="7" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale={dist.amount * 2} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
{/if}
<g data-oid={obj.id} {transform} style:mix-blend-mode={blendCss(obj.blend)} filter={dist ? `url(#${distId})` : undefined}>
  {#if obj.type === 'panel'}
    <PanelView {obj} {assets} {scope} {interactive} />
  {:else if obj.type === 'image'}
    <ImageView {obj} {assets} {scope} />
  {:else if obj.type === 'balloon'}
    <BalloonView {obj} {scope} {hideText} {phase} />
  {:else if obj.type === 'text'}
    <TextView {obj} {scope} {hideText} />
  {:else if obj.type === 'pattern'}
    <PatternView {obj} {scope} />
  {/if}
  {#if interactive && obj.type !== 'panel' && (phase === 'all' || phase === 'text')}
    <rect class="hit" width={obj.w} height={obj.h} fill="transparent" />
  {/if}
</g>
{/snippet}

{#if clipTo}
  <defs><clipPath id={clipId}><path d={panelPath(clipTo)} transform={clipTransform} /></clipPath></defs>
  <g clip-path={`url(#${clipId})`}>{@render content()}</g>
{:else}
  {@render content()}
{/if}

<style>
  .hit {
    cursor: move;
    pointer-events: all;
  }
</style>
