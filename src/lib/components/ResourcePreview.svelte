<script lang="ts">
  import PageContent from './PageContent.svelte';
  import type { Page, PageObject } from '../model/types';
  import { PREVIEW_CTX, type ResourceItem } from '../resources/registry';

  let { item }: { item: ResourceItem } = $props();

  // Se construye el recurso con el contexto de miniatura y se ajusta el
  // encuadre a sus límites (incluida la punta de la cola de los globos).
  const built = $derived.by(() => {
    const objs = item.build(PREVIEW_CTX);
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const o of objs) {
      x0 = Math.min(x0, o.x);
      y0 = Math.min(y0, o.y);
      x1 = Math.max(x1, o.x + o.w);
      y1 = Math.max(y1, o.y + o.h);
      if (o.type === 'balloon') {
        const tx = o.x + o.w / 2 + o.tailX;
        const ty = o.y + o.h / 2 + o.tailY;
        x0 = Math.min(x0, tx);
        y0 = Math.min(y0, ty);
        x1 = Math.max(x1, tx);
        y1 = Math.max(y1, ty);
      }
    }
    const pad = 6;
    const page: Page = {
      id: 'preview',
      background: 'none',
      objects: objs.map((o, i) => {
        const copy = { ...o, id: `pv${i}` } as PageObject;
        if (copy.type === 'balloon' && copy.link?.to.startsWith('@')) copy.link = { ...copy.link, to: `pv${copy.link.to.slice(1)}` };
        return copy;
      })
    };
    return { page, viewBox: `${x0 - pad} ${y0 - pad} ${x1 - x0 + 2 * pad} ${y1 - y0 + 2 * pad}` };
  });
</script>

<svg viewBox={built.viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <PageContent w={0} h={0} page={built.page} assets={{}} scope={`pv-${item.id}`} />
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
