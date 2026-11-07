<svelte:options namespace="svg" />

<script lang="ts">
  import type { PatternObj } from '../../model/types';
  import { hashString } from '../../render/patterns';
  import PaintFill from './PaintFill.svelte';

  interface Props {
    obj: PatternObj;
    scope: string;
  }
  let { obj, scope }: Props = $props();

  const seed = $derived((hashString(obj.id) + (obj.seed ?? 0)) >>> 0);
</script>

<PaintFill
  kind={obj.kind}
  color={obj.color}
  bg={obj.bg}
  scale={obj.scale}
  amount={obj.amount}
  {seed}
  opacity={obj.opacity}
  w={obj.w}
  h={obj.h}
  uid={`${scope}-pat-${obj.id}`}
/>
