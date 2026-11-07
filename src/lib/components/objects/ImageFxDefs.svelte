<svelte:options namespace="svg" />

<script lang="ts">
  /** Define el <filter id> de los filtros de imagen. Usar solo si hasFx(fx). */
  import type { ImageFx } from '../../model/types';
  import { fxParams } from '../../render/imageFx';
  import { parseColor } from '../../render/color';

  interface Props {
    id: string;
    fx: ImageFx;
  }
  let { id, fx }: Props = $props();

  const p = $derived(fxParams(fx));
  const tint = $derived(parseColor(p.tint));
</script>

<defs>
  <!-- sRGB: sin esto el navegador calcula en «RGB lineal» y los ajustes se ven distintos. -->
  <filter {id} x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
    {#if p.steps.tint && p.tint}
      <!-- Con transparencia el tinte se mezcla con la imagen en vez de taparla. -->
      <feFlood flood-color={tint.hex} flood-opacity={tint.alpha} result="tint" />
      <feComposite in="tint" in2="SourceAlpha" operator="in" result="tintLayer" />
      {#if tint.alpha < 1}
        <feMerge>
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="tintLayer" />
        </feMerge>
      {/if}
    {/if}
    {#if p.steps.transfer}
      <feComponentTransfer>
        <feFuncR type="linear" slope={p.slope} intercept={p.intercept} />
        <feFuncG type="linear" slope={p.slope} intercept={p.intercept} />
        <feFuncB type="linear" slope={p.slope} intercept={p.intercept} />
      </feComponentTransfer>
    {/if}
    {#if p.steps.saturate}<feColorMatrix type="saturate" values={String(p.saturate)} />{/if}
    {#if p.steps.hue}<feColorMatrix type="hueRotate" values={String(p.hue)} />{/if}
    {#if p.steps.sepia && p.sepiaMatrix}<feColorMatrix type="matrix" values={p.sepiaMatrix} />{/if}
    {#if p.steps.invert}
      <feComponentTransfer>
        <feFuncR type="linear" slope="-1" intercept="1" />
        <feFuncG type="linear" slope="-1" intercept="1" />
        <feFuncB type="linear" slope="-1" intercept="1" />
      </feComponentTransfer>
    {/if}
    {#if p.steps.blur}<feGaussianBlur stdDeviation={p.blur} />{/if}
  </filter>
</defs>
