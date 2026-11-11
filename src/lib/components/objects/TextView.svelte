<svelte:options namespace="svg" />

<script lang="ts">
  import type { TextObj } from '../../model/types';
  import { fitObjectText, textRegion } from '../../render/objectText';
  import { fontState } from '../../render/fonts.svelte';
  import { columnX, familyCss, fontCss, justifySpacing } from '../../render/textLayout';
  import { useTextMode } from '../../app/quality';
  import { warpActive, warpGlyphs, GLYPH_MID } from '../../render/textWarp';
  import { canvasMeasure } from '../../render/objectText';
  import { isGradient } from '../../render/paint';
  import RichSegs from './RichSegs.svelte';
  import GradientDefs from './GradientDefs.svelte';

  interface Props {
    obj: TextObj;
    scope?: string;
    hideText?: boolean;
  }
  let { obj, scope = 't', hideText = false }: Props = $props();

  // Relleno con degradado (títulos y onomatopeyas): el degradado se calcula sobre la caja del objeto.
  const grad = $derived(obj.fill && isGradient(obj.fill) ? obj.fill : null);
  const gradId = $derived(`${scope}-${obj.id}-tfill`);
  const paint = $derived(grad ? `url(#${gradId})` : obj.color);

  const region = $derived(textRegion(obj));
  const mode = useTextMode();
  const fit = $derived.by(() => {
    void fontState.ready;
    return fitObjectText(obj, mode().force);
  });
  const start = $derived(obj.align === 'left' || obj.align === 'justify');
  const anchor = $derived(start ? 'start' : obj.align === 'right' ? 'end' : 'middle');
  const tx = $derived(start ? region.x : obj.align === 'right' ? region.x + region.w : region.x + region.w / 2);
  const vAnchor = anchor;
  const vy = $derived(start ? region.y : obj.align === 'right' ? region.y + region.h : region.y + region.h / 2);
  // Justificado: espacio extra por hueco en cada línea salvo la última de cada párrafo.
  const spacing = $derived.by(() => {
    if (obj.align !== 'justify' || obj.vertical) return null;
    void fontState.ready;
    const w = canvasMeasure(fontCss(obj, fit.fontSize));
    return fit.lines.map((l, i) => {
      if (fit.last?.[i]) return 0;
      if (fit.lineWidths && fit.words) {
        const gaps = Math.max(0, (fit.words[i]?.length ?? 1) - 1);
        const extra = region.w - fit.lineWidths[i];
        return gaps > 0 && extra > 0 ? extra / gaps : 0;
      }
      return justifySpacing(l, region.w, w);
    });
  });
  const warped = $derived.by(() => {
    if (obj.vertical || !warpActive(obj.warp) || !obj.text) return null;
    return warpGlyphs(fit, region, obj, canvasMeasure, obj.warp);
  });
  const outlined = $derived(obj.outlineWidth > 0);
</script>

{#if grad && !hideText && obj.text}<GradientDefs id={gradId} g={grad} w={obj.w} h={obj.h} />{/if}
{#if !hideText && obj.text && warped}
  <g
    font-family={familyCss(obj.fontFamily)}
    font-size={fit.fontSize}
    font-weight={obj.bold ? 700 : 400}
    font-style={obj.italic ? 'italic' : 'normal'}
    fill={paint}
    text-anchor="middle"
    stroke={outlined ? obj.outline : undefined}
    stroke-width={outlined ? obj.outlineWidth : undefined}
    stroke-linejoin="round"
    paint-order="stroke"
  >
    {#each warped as gl}
      <text transform={`translate(${gl.x} ${gl.y}) rotate(${gl.rot}) scale(${gl.sx} ${gl.sy})`} y={fit.fontSize * GLYPH_MID}>{gl.ch}</text>
    {/each}
  </g>
{:else if !hideText && obj.text && !obj.vertical}
  <text
    font-family={familyCss(obj.fontFamily)}
    font-size={fit.fontSize}
    font-weight={obj.bold ? 700 : 400}
    font-style={obj.italic ? 'italic' : 'normal'}
    fill={paint}
    text-anchor={anchor}
    stroke={outlined ? obj.outline : undefined}
    stroke-width={outlined ? obj.outlineWidth : undefined}
    stroke-linejoin="round"
    paint-order="stroke"
  >
    {#each fit.lines as line, i}
      <tspan x={tx} y={region.y + i * fit.lineHeight + fit.fontSize * 0.82} word-spacing={spacing?.[i] || undefined}>{#if fit.segs?.[i]}<RichSegs segs={fit.segs[i]} base={obj} />{:else}{line}{/if}</tspan>
    {/each}
  </text>
{/if}
{#if !hideText && obj.text && obj.vertical}
  {#each fit.lines as line, i}
    <text
      font-family={familyCss(obj.fontFamily)}
      font-size={fit.fontSize}
      font-weight={obj.bold ? 700 : 400}
      font-style={obj.italic ? 'italic' : 'normal'}
      fill={paint}
      writing-mode="vertical-rl"
      text-anchor={vAnchor}
      x={columnX(region, fit.lineHeight, fit.lines.length, i, false)}
      y={vy}
      stroke={outlined ? obj.outline : undefined}
      stroke-width={outlined ? obj.outlineWidth : undefined}
      stroke-linejoin="round"
      paint-order="stroke"
    >{line}</text>
  {/each}
{/if}
{#if mode().warn && fit.overflow && obj.text}
  <rect class="overflow" x={region.x} y={region.y} width={region.w} height={region.h} fill="none" stroke="#e5342d" stroke-width="2" stroke-dasharray="7 4" pointer-events="none" />
{/if}
