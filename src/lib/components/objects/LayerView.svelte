<svelte:options namespace="svg" />

<script lang="ts">
  /** Una capa de una viñeta (imagen, trama/textura o degradado), en coordenadas de la viñeta. */
  import type { Asset, ID, PanelLayer } from '../../model/types';
  import { hashString, needsRegion } from '../../render/patterns';
  import { blendCss } from '../../render/blend';
  import { fxOf, hasFx } from '../../render/imageFx';
  import ImageFxDefs from './ImageFxDefs.svelte';
  import { useQuality } from '../../app/quality';
  import { pickUrl } from '../../imageedit/proxy';
  import PaintFill from './PaintFill.svelte';
  import GradientFill from './GradientFill.svelte';

  interface Props {
    layer: PanelLayer;
    /** Tamaño de la caja de la viñeta. */
    w: number;
    h: number;
    assets: Record<ID, Asset>;
    /** Prefijo único para los ids internos. */
    uid: string;
  }
  let { layer, w, h, assets, uid }: Props = $props();

  const quality = useQuality();
  const asset = $derived(layer.type === 'image' ? assets[layer.assetId] : undefined);
  const fxId = $derived(`${uid}-${layer.id}-fx`);
  const fxOn = $derived(layer.type === 'image' && hasFx(layer.fx));

  // Las tramas con orientación se dibujan en un cuadrado girable que cubre toda la viñeta.
  const region = $derived.by(() => {
    if (layer.type !== 'pattern') return null;
    if (!needsRegion(layer.kind)) return { w, h, transform: undefined as string | undefined };
    const d = Math.hypot(w, h) + 2 * Math.hypot(layer.x, layer.y);
    return {
      w: d,
      h: d,
      transform: `translate(${w / 2 + layer.x} ${h / 2 + layer.y}) rotate(${layer.rotation}) translate(${-d / 2} ${-d / 2})`
    };
  });
  /** Posición, giro y reflejo de la capa de imagen (el centro de la imagen queda en el origen). */
  const imageTransform = $derived.by(() => {
    if (layer.type !== 'image') return undefined;
    const sx = layer.flipH ? -1 : 1;
    const sy = layer.flipV ? -1 : 1;
    return 'translate(' + (w / 2 + layer.x) + ' ' + (h / 2 + layer.y) + ') rotate(' + layer.rotation + ') scale(' + sx + ' ' + sy + ')';
  });
  const seed = $derived(layer.type === 'pattern' ? (hashString(layer.id) + layer.seed) >>> 0 : 0);
</script>

<g style:mix-blend-mode={blendCss(layer.blend)}>
{#if layer.type === 'image'}
  {#if asset}
    {#if fxOn}<ImageFxDefs id={fxId} fx={fxOf(layer.fx)} />{/if}
    <image
      filter={fxOn ? `url(#${fxId})` : undefined}
      href={pickUrl(asset, quality())}
      x={(-asset.w * layer.scale) / 2}
      y={(-asset.h * layer.scale) / 2}
      width={asset.w * layer.scale}
      height={asset.h * layer.scale}
      preserveAspectRatio="none"
      opacity={layer.opacity}
      transform={imageTransform}
    />
  {/if}
{:else if layer.type === 'pattern'}
  {#if region}
    <g transform={region.transform}>
      <PaintFill
        kind={layer.kind}
        color={layer.color}
        bg={layer.bg}
        scale={layer.scale}
        amount={layer.amount}
        {seed}
        opacity={layer.opacity}
        w={region.w}
        h={region.h}
        {uid}
      />
    </g>
  {/if}
{:else}
  <GradientFill id={`${uid}-g`} g={layer.gradient} {w} {h} opacity={layer.opacity} />
{/if}
</g>
