<script lang="ts">
  import { t } from '../../i18n/index.svelte';
  import type { DotSpec, Gradient } from '../../model/types';
  import { editor } from '../../model/store.svelte';
  import { DEFAULT_DOTS, resetGuides } from '../../render/paint';
  import ColorField from './ColorField.svelte';
  import NumberField from './NumberField.svelte';
  import RangeField from './RangeField.svelte';

  interface Props {
    g: Gradient;
    onchange: (g: Gradient) => void;
    /** Solo degradado continuo: sin puntos ni guías en el lienzo. */
    plain?: boolean;
  }
  let { g, onchange, plain = false }: Props = $props();

  const set = (p: Partial<Gradient>) => onchange({ ...g, ...p });
  const hasGuides = $derived(!!(g.p1 && g.p2));
  /** El ángulo manda: se olvidan las guías para que el degradado siga el ángulo escrito. */
  const setAngle = (angle: number) => onchange(resetGuides({ ...g, angle }));
  /** Mover el centro conserva el radio: las dos guías se desplazan juntas. */
  function setCenter(cx: number, cy: number) {
    if (g.p1 && g.p2) {
      const dx = cx - g.p1.x;
      const dy = cy - g.p1.y;
      onchange({ ...g, cx, cy, p1: { x: cx, y: cy }, p2: { x: g.p2.x + dx, y: g.p2.y + dy } });
    } else onchange({ ...g, cx, cy });
  }
  const centerNow = $derived(g.p1 ? g.p1 : { x: g.cx, y: g.cy });
  const setDots = (p: Partial<DotSpec>) => g.dots && onchange({ ...g, dots: { ...g.dots, ...p } });
  const toggleDots = (on: boolean) => {
    const { dots: _d, ...rest } = g;
    onchange(on ? { ...rest, dots: { ...DEFAULT_DOTS } } : rest);
  };
  const preview = $derived(
    g.kind === 'reflected'
      ? `linear-gradient(${g.angle + 90}deg, ${g.c2}, ${g.c1}, ${g.c2})`
      : g.kind === 'linear'
        ? `linear-gradient(${g.angle + 90}deg, ${g.c1}, ${g.c2})`
        : `radial-gradient(circle at ${g.cx * 100}% ${g.cy * 100}%, ${g.c1}, ${g.c2})`
  );
</script>

<div class="gradient">
  <div class="bar" style:background={`${preview}, repeating-conic-gradient(#999 0 25%, #ddd 0 50%) 0 0 / 10px 10px`}></div>
  <div class="row">
    <label class="kind">
      <span>{t('insp.kind')}</span>
      <select value={g.kind} onchange={(e) => set({ kind: e.currentTarget.value as Gradient['kind'] })}>
        <option value="linear">{t('grad.linear')}</option>
        <option value="reflected">{t('grad.reflected')}</option>
        <option value="radial">{t('grad.radial')}</option>
      </select>
    </label>
    <ColorField label={t('grad.color1')} value={g.c1} onchange={(v) => set({ c1: v })} />
    <ColorField label={t('grad.color2')} value={g.c2} onchange={(v) => set({ c2: v })} />
    <button type="button" class="swap" title={t('grad.swap')} onclick={() => set({ c1: g.c2, c2: g.c1 })}>⇄</button>
  </div>
  {#if g.kind !== 'radial'}
    <NumberField label={t('grad.angle')} value={g.angle} onchange={setAngle} />
  {:else}
    <RangeField label={t('grad.centerX')} value={centerNow.x} min={0} max={1} onchange={(v) => setCenter(v, centerNow.y)} />
    <RangeField label={t('grad.centerY')} value={centerNow.y} min={0} max={1} onchange={(v) => setCenter(centerNow.x, v)} />
  {/if}
  {#if !plain}<label class="check"><input type="checkbox" checked={!!g.dots} onchange={(e) => toggleDots(e.currentTarget.checked)} /> {t('grad.dots')}</label>{/if}
  {#if g.dots && !plain}
    <div class="dots">
      <label class="kind">
        <span>{t('grad.dotShape')}</span>
        <select value={g.dots.shape} onchange={(e) => setDots({ shape: e.currentTarget.value as DotSpec['shape'] })}>
          <option value="circle">{t('grad.shape.circle')}</option>
          <option value="square">{t('grad.shape.square')}</option>
          <option value="diamond">{t('grad.shape.diamond')}</option>
          <option value="cross">{t('grad.shape.cross')}</option>
        </select>
      </label>
      <div class="two">
        <NumberField label={t('grad.dotSize1')} value={g.dots.size1} min={0.5} onchange={(v) => setDots({ size1: Math.max(0.5, v) })} />
        <NumberField label={t('grad.dotSize2')} value={g.dots.size2} min={0.5} onchange={(v) => setDots({ size2: Math.max(0.5, v) })} />
        <NumberField label={t('grad.dotGap1')} value={g.dots.gap1} min={0} onchange={(v) => setDots({ gap1: Math.max(0, v) })} />
        <NumberField label={t('grad.dotGap2')} value={g.dots.gap2} min={0} onchange={(v) => setDots({ gap2: Math.max(0, v) })} />
      </div>
      <label class="check"><input type="checkbox" checked={!!g.dots.bg} onchange={(e) => setDots({ bg: e.currentTarget.checked })} /> {t('grad.dotsOnBg')}</label>
    </div>
  {/if}
  {#if !plain}<label class="check"><input type="checkbox" bind:checked={editor.showGuides} /> {t('grad.guides')}</label>
  <p class="hint">{t('grad.hint')}</p>{/if}
  {#if hasGuides && !plain}
    <button type="button" onclick={() => onchange(resetGuides(g))}>{t('grad.resetGuides')}</button>
  {/if}
</div>

<style>
  .gradient {
    display: flex;
    flex-direction: column;
    gap: 0.4615rem;
  }
  .bar {
    height: 1.2308rem;
    border: 1px solid var(--border);
    border-radius: 0.3077rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.6154rem;
  }
  .kind {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
    font-size: 0.9231rem;
    color: var(--muted);
  }
  .kind select {
    width: 100%;
    color: var(--text);
  }
  .swap {
    padding: 2px 0.4615rem;
    border: 1px solid var(--border);
    border-radius: 0.3077rem;
    background: var(--panel-2);
  }
  .hint {
    margin: 0;
    font-size: 0.8462rem;
    color: var(--muted);
  }
  .dots {
    display: flex;
    flex-direction: column;
    gap: 0.4615rem;
    padding-left: 0.6rem;
    border-left: 2px solid var(--border);
  }
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.3077rem;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9231rem;
  }
</style>
