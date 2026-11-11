<svelte:options namespace="svg" />

<script lang="ts">
  /** Segmentos de una línea de texto con formato por partes: solo se escribe lo que difiere del objeto. */
  import type { Seg } from '../../render/richText';
  import { familyCss } from '../../render/textLayout';

  interface Props {
    segs: Seg[];
    base: { bold: boolean; italic: boolean; color: string; fontFamily: string };
  }
  let { segs, base }: Props = $props();

  const deco = (s: Seg) => [s.underline ? 'underline' : '', s.strike ? 'line-through' : ''].filter(Boolean).join(' ') || undefined;
</script>

{#each segs as s}<tspan
    font-family={s.fontFamily !== base.fontFamily ? familyCss(s.fontFamily) : undefined}
    font-weight={s.bold !== base.bold ? (s.bold ? 700 : 400) : undefined}
    font-style={s.italic !== base.italic ? (s.italic ? 'italic' : 'normal') : undefined}
    fill={s.color !== base.color ? s.color : undefined}
    text-decoration={deco(s)}>{s.text}</tspan>{/each}
