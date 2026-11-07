<svelte:options namespace="svg" />

<script lang="ts">
  import type { Asset, ID, ImageObj } from '../../model/types';
  import { fxOf, hasFx } from '../../render/imageFx';
  import ImageFxDefs from './ImageFxDefs.svelte';
  import { useQuality } from '../../app/quality';
  import { flipOf } from '../../render/flip';
  import { pickUrl } from '../../imageedit/proxy';

  interface Props {
    obj: ImageObj;
    assets: Record<ID, Asset>;
    scope: string;
  }
  let { obj, assets, scope }: Props = $props();
  const fxId = $derived(`${scope}-${obj.id}-fx`);
  const fxOn = $derived(hasFx(obj.fx));

  const quality = useQuality();
  const asset = $derived(assets[obj.assetId]);
</script>

{#if asset}
  {#if fxOn}<ImageFxDefs id={fxId} fx={fxOf(obj.fx)} />{/if}
  <image
    href={pickUrl(asset, quality())}
    width={obj.w}
    height={obj.h}
    preserveAspectRatio="none"
    opacity={obj.opacity}
    filter={fxOn ? `url(#${fxId})` : undefined}
    transform={flipOf(obj, obj.w, obj.h)}
  />
{:else}
  <rect width={obj.w} height={obj.h} fill="#e5e5e5" stroke="#999999" stroke-dasharray="8 6" />
{/if}
