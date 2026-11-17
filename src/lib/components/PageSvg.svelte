<script lang="ts">
  import type { Asset, Globals, ID, Page } from '../model/types';
  import PageContent from './PageContent.svelte';
  import type { Quality } from '../imageedit/proxy';
  import type { Side } from '../model/layout';
  import type { Spill } from '../model/style';

  interface Props {
    w: number;
    h: number;
    page: Page;
    assets: Record<ID, Asset>;
    scope: string;
    /** Página de estilo, número de esta página y total (ver PageContent). */
    style?: Page | null;
    pageNo?: number | null;
    pageCount?: number;
    /** 'thumb' para miniaturas; 'full' (por defecto) para exportar. */
    quality?: Quality;
    globals?: Globals | null;
    side?: Side | null;
    /** Sangrado por fuera de cada borde (px de página). */
    bleed?: number;
    spill?: Spill | null;
  }
  let { w, h, page, assets, scope, style = null, pageNo = 1, pageCount = 1, quality = 'full', globals = null, side = null, bleed = 0, spill = null }: Props = $props();
</script>

<!-- Página completa, sin interacción: miniaturas y exportación. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox={`${-bleed} ${-bleed} ${w + 2 * bleed} ${h + 2 * bleed}`} width={w + 2 * bleed} height={h + 2 * bleed} role="img" aria-label="Página">
  <PageContent {w} {h} {page} {assets} {scope} {style} {pageNo} {pageCount} {quality} {globals} {side} {bleed} {spill} />
</svg>
