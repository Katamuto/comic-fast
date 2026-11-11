<svelte:options namespace="svg" />

<script lang="ts">
  import type { BalloonObj } from '../../model/types';
  import { fillRef, isGradient } from '../../render/paint';
  import RichSegs from './RichSegs.svelte';
  import GradientDefs from './GradientDefs.svelte';
  import GradientFill from './GradientFill.svelte';
  import { parseColor } from '../../render/color';
  import { balloonGeometry } from '../../render/balloon';
  import { fitObjectText, canvasMeasure } from '../../render/objectText';
  import { fontCss, justifySpacing } from '../../render/textLayout';
  import { useTextMode } from '../../app/quality';
  import { fontState } from '../../render/fonts.svelte';
  import { columnX, familyCss } from '../../render/textLayout';

  interface Props {
    obj: BalloonObj;
    /** Prefijo para el id del degradado. */
    scope: string;
    /** Oculta el texto mientras se edita con el cuadro superpuesto. */
    hideText?: boolean;
    /**
     * Globos fundidos: se dibujan en tres pasadas para que el borde solo rodee la silueta unida.
     * 'stroke' = borde (doble grosor), 'fill' = relleno encima, 'text' = texto. 'all' = normal.
     */
    phase?: 'all' | 'stroke' | 'fill' | 'text';
  }
  let { obj, scope, hideText = false, phase = 'all' }: Props = $props();
  const showShape = $derived(phase !== 'text');
  const showText = $derived(phase === 'all' || phase === 'text');

  const gradId = $derived(`${scope}-grad-${obj.id}`);
  const gradient = $derived(isGradient(obj.fill) ? obj.fill : null);
  const dotted = $derived(gradient !== null && !!gradient.dots);
  // Con puntos, los círculos de la cola de pensamiento usan un color liso (el color 1).
  const paint = $derived(gradient && gradient.dots ? parseColor(gradient.c1).hex : fillRef(obj.fill, gradId));

  const geo = $derived(balloonGeometry(obj));
  const mode = useTextMode();
  const fit = $derived.by(() => {
    void fontState.ready; // vuelve a medir cuando se carguen las fuentes
    return fitObjectText(obj, mode().force);
  });
  const start = $derived(obj.align === 'left' || obj.align === 'justify');
  const anchor = $derived(start ? 'start' : obj.align === 'right' ? 'end' : 'middle');
  const spacing = $derived.by(() => {
    if (obj.align !== 'justify' || obj.vertical) return null;
    void fontState.ready;
    const w = canvasMeasure(fontCss(obj, fit.fontSize));
    return fit.lines.map((l, i) => {
      if (fit.last?.[i]) return 0;
      const boxW = fit.lineRects?.[i]?.w ?? geo.textBox.w;
      // con formato por partes, el ancho real de la línea viene del ajuste
      if (fit.lineWidths && fit.words) {
        const gaps = Math.max(0, (fit.words[i]?.length ?? 1) - 1);
        const extra = boxW - fit.lineWidths[i];
        return gaps > 0 && extra > 0 ? extra / gaps : 0;
      }
      return justifySpacing(l, boxW, w);
    });
  });
  /** Posición de cada línea: sigue el contorno (lineRects) o la caja rectangular. */
  const placed = $derived(
    fit.lines.map((line, i) => {
      const r = fit.lineRects?.[i];
      const bx = r ? r.x : geo.textBox.x;
      const bw = r ? r.w : geo.textBox.w;
      const y = r ? r.y : geo.textBox.y + (geo.textBox.h - fit.lines.length * fit.lineHeight) / 2 + i * fit.lineHeight;
      return { line, x: start ? bx : obj.align === 'right' ? bx + bw : bx + bw / 2, y: y + fit.fontSize * 0.82 };
    })
  );
  const vy = $derived(
    start
      ? geo.textBox.y
      : obj.align === 'right'
        ? geo.textBox.y + geo.textBox.h
        : geo.textBox.y + geo.textBox.h / 2
  );
  const dash = $derived(
    geo.dashed ? `${obj.strokeWidth * 2.5} ${obj.strokeWidth * 2}` : undefined
  );
</script>

{#if showShape && phase === 'stroke'}
  <path d={geo.d} fill={obj.stroke} stroke={obj.stroke} stroke-width={obj.strokeWidth * 2} stroke-linejoin="round" />
  {#each geo.dots as dot}
    <circle cx={dot.cx} cy={dot.cy} r={dot.r} fill={obj.stroke} stroke={obj.stroke} stroke-width={obj.strokeWidth * 2} />
  {/each}
{:else if showShape}
  {#if gradient && !gradient.dots}
    <GradientDefs id={gradId} g={gradient} w={obj.w} h={obj.h} />
  {/if}
  {#if dotted && gradient}
    <defs><clipPath id={`${gradId}-clip`}><path d={geo.d} /></clipPath></defs>
    <g clip-path={`url(#${gradId}-clip)`}><GradientFill id={gradId} g={gradient} w={obj.w} h={obj.h} /></g>
    {#if phase === 'all'}
      <path d={geo.d} fill="none" stroke={obj.stroke} stroke-width={obj.strokeWidth} stroke-linejoin="round" stroke-dasharray={dash} />
    {/if}
  {:else}
    <path
      d={geo.d}
      fill={paint}
      stroke={phase === 'all' ? obj.stroke : 'none'}
      stroke-width={obj.strokeWidth}
      stroke-linejoin="round"
      stroke-dasharray={dash}
    />
  {/if}
  {#each geo.dots as dot}
    <circle cx={dot.cx} cy={dot.cy} r={dot.r} fill={paint} stroke={phase === 'all' ? obj.stroke : 'none'} stroke-width={obj.strokeWidth} />
  {/each}
{/if}
{#if showText && !hideText && obj.text && !obj.vertical}
  <text
    font-family={familyCss(obj.fontFamily)}
    font-size={fit.fontSize}
    font-weight={obj.bold ? 700 : 400}
    font-style={obj.italic ? 'italic' : 'normal'}
    fill={obj.color}
    text-anchor={anchor}
  >
    {#each placed as p, i}
      <tspan x={p.x} y={p.y} word-spacing={spacing?.[i] || undefined}>{#if fit.segs?.[i]}<RichSegs segs={fit.segs[i]} base={obj} />{:else}{p.line}{/if}</tspan>
    {/each}
  </text>
{/if}
{#if showText && !hideText && obj.text && obj.vertical}
  {#each fit.lines as line, i}
    <text
      font-family={familyCss(obj.fontFamily)}
      font-size={fit.fontSize}
      font-weight={obj.bold ? 700 : 400}
      font-style={obj.italic ? 'italic' : 'normal'}
      fill={obj.color}
      writing-mode="vertical-rl"
      text-anchor={anchor === 'start' ? 'start' : anchor === 'end' ? 'end' : 'middle'}
      x={columnX(geo.textBox, fit.lineHeight, fit.lines.length, i, true)}
      y={vy}
    >{line}</text>
  {/each}
{/if}
{#if showText && mode().warn && fit.overflow && obj.text}
  <rect class="overflow" x={geo.textBox.x} y={geo.textBox.y} width={geo.textBox.w} height={geo.textBox.h} fill="none" stroke="#e5342d" stroke-width="2" stroke-dasharray="7 4" pointer-events="none" />
{/if}
