<script lang="ts">
  import type { Asset, Globals, ID, Page } from '../model/types';
  import PageContent from './PageContent.svelte';
  import type { Quality } from '../imageedit/proxy';

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
  }
  let { w, h, page, assets, scope, style = null, pageNo = 1, pageCount = 1, quality = 'full', globals = null }: Props = $props();
</script>

<!-- Página completa, sin interacción: miniaturas y exportación. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label="Página">
  <PageContent {w} {h} {page} {assets} {scope} {style} {pageNo} {pageCount} {quality} {globals} />
</svg>
