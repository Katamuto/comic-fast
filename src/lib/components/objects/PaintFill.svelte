<svelte:options namespace="svg" />

<script lang="ts">
  /**
   * Dibuja una trama o textura que llena el rectángulo (0,0)–(w,h), siempre dentro de él.
   * Lo usan los objetos "trama" y las capas de trama de las viñetas.
   *  - tile:   SVG de src/assets/patterns que se repite como mosaico (escala = tamaño del mosaico)
   *  - figure: SVG de una sola pieza; escala 1 llena el rectángulo, <1 la encoge (centrada), >1 la amplía (recortada)
   *  - image:  textura de imagen de src/assets/textures, en mosaico
   *  - noise / cells: texturas procedurales
   */
  import type { PatternKind } from '../../model/types';
  import { patternClass, tileDims } from '../../render/patterns';
  import { IMAGE_TEXTURES, IMG_PREFIX, SVG_PATTERNS } from '../../resources/patternLib';
  import { noiseParams, voronoiCells, type NoiseKind } from '../../render/textures';

  interface Props {
    kind: PatternKind;
    color: string;
    /** Color de fondo o 'none'. */
    bg: string;
    scale: number;
    /** Semilla numérica para las texturas aleatorias. */
    seed: number;
    /** Parámetro extra 0…1 de las texturas procedurales. */
    amount?: number;
    opacity: number;
    w: number;
    h: number;
    /** Id único para el <pattern> o <filter> interno. */
    uid: string;
  }
  let { kind, color, bg, scale, seed, amount = 0.5, opacity, w, h, uid }: Props = $props();

  const cls = $derived(patternClass(kind));
  const svg = $derived(SVG_PATTERNS.get(kind));
  const tex = $derived(kind.startsWith(IMG_PREFIX) ? IMAGE_TEXTURES.get(kind.slice(IMG_PREFIX.length)) : undefined);
  const tile = $derived(tileDims(kind, scale));
  const vbStr = $derived(svg ? `${svg.vb.x} ${svg.vb.y} ${svg.vb.w} ${svg.vb.h}` : '0 0 1 1');
  const fig = $derived({ w: w * Math.max(0.05, scale), h: h * Math.max(0.05, scale) });
  const noise = $derived(cls === 'noise' ? noiseParams(kind as NoiseKind, color, scale, seed, amount) : null);
  const am = $derived(Math.min(1, Math.max(0, amount)));
  const cells = $derived(cls === 'cells' ? voronoiCells(w, h, 70 * Math.max(0.2, scale), seed) : []);
  const edges = $derived(cells.map((c) => c.d).join(' '));
  const edgeWidth = $derived(Math.max(0.6, 2 * Math.sqrt(Math.max(0.2, scale)) * (0.35 + am * 1.3)));
</script>

{#if bg !== 'none'}
  <rect width={w} height={h} fill={bg} {opacity} />
{/if}

{#if cls === 'tile' && svg}
  <defs>
    <pattern id={uid} width={tile.w} height={tile.h} viewBox={vbStr} preserveAspectRatio="none" patternUnits="userSpaceOnUse">
      <g {color} fill={color}>{@html svg.inner}</g>
    </pattern>
  </defs>
  <rect width={w} height={h} fill={`url(#${uid})`} {opacity} />
{:else if cls === 'figure' && svg}
  <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} overflow="hidden" {opacity}>
    <svg
      x={(w - fig.w) / 2}
      y={(h - fig.h) / 2}
      width={fig.w}
      height={fig.h}
      viewBox={vbStr}
      preserveAspectRatio={svg.par}
      overflow="hidden"
    >
      <g {color} fill={color}>{@html svg.inner}</g>
    </svg>
  </svg>
{:else if cls === 'image' && tex}
  <defs>
    <pattern id={uid} width={tile.w} height={tile.h} patternUnits="userSpaceOnUse">
      <image href={tex.url} width={tile.w} height={tile.h} preserveAspectRatio="none" />
    </pattern>
  </defs>
  <rect width={w} height={h} fill={`url(#${uid})`} {opacity} />
{:else if cls === 'noise' && noise}
  <defs>
    <filter id={uid} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence
        type="fractalNoise"
        baseFrequency={noise.baseFrequency}
        numOctaves={noise.octaves}
        seed={noise.seed}
        result="noise"
      />
      <feColorMatrix in="noise" type="matrix" values={noise.matrix} />
    </filter>
  </defs>
  <rect width={w} height={h} fill="#000" filter={`url(#${uid})`} {opacity} />
{:else if cls === 'cells'}
  <g {opacity}>
    {#if kind === 'voronoi'}
      {#each cells as c}
        <path d={c.d} fill={color} fill-opacity={Math.min(1, 0.03 + c.shade * 0.9 * am)} />
      {/each}
    {/if}
    <path d={edges} fill="none" stroke={color} stroke-width={edgeWidth} stroke-linejoin="round" />
  </g>
{/if}
