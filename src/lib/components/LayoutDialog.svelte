<script lang="ts">
  /**
   * Maquetación: resolución de salida (PPI), márgenes, sangrado, canal entre viñetas y modo libro.
   * Los cambios se aplican al momento (un solo paso en el historial por ráfaga de cambios).
   */
  import { editor } from '../model/store.svelte';
  import { t } from '../i18n/index.svelte';
  import { formatUnit, fromPx, toPx, UNITS, type Unit } from '../model/units';
  import { PPI_MAX, PPI_MIN, PPI_PRESETS, contentRect, renderPlan } from '../model/layout';
  import { readPref, writePref } from '../app/prefs';
  import Dialog from './Dialog.svelte';

  const l = $derived(editor.layout);
  let unit = $state<Unit>((readPref('layoutUnit') as Unit) || 'mm');
  let linked = $state(false);

  const shown = (px: number) => Number(formatUnit(fromPx(px, unit), unit));
  const step = $derived(unit === 'px' ? 1 : unit === 'mm' ? 0.5 : unit === 'cm' ? 0.05 : 0.01);

  function setUnit(u: Unit) {
    unit = u;
    writePref('layoutUnit', u);
  }

  type MarginKey = 'top' | 'bottom' | 'inner' | 'outer';
  function setMargin(k: MarginKey, v: number) {
    if (!Number.isFinite(v)) return;
    const px = Math.max(0, toPx(v, unit));
    if (linked) editor.setLayout({ margins: { top: px, bottom: px, inner: px, outer: px } });
    else editor.setLayout({ margins: { [k]: px } });
  }
  const setPx = (key: 'bleed' | 'gutter', v: number) => {
    if (Number.isFinite(v)) editor.setLayout({ [key]: Math.max(0, toPx(v, unit)) });
  };

  const plan = $derived(renderPlan(editor.doc.pageW, editor.doc.pageH, l.ppi, l.bleed));
  const mmW = $derived(Math.round(fromPx(editor.doc.pageW, 'mm') * 10) / 10);
  const mmH = $derived(Math.round(fromPx(editor.doc.pageH, 'mm') * 10) / 10);

  // Vista previa: una página (o dos, en libro) con su área útil.
  const prev = $derived.by(() => {
    const W = editor.doc.pageW;
    const H = editor.doc.pageH;
    const sides = l.book ? (l.firstSide === 'right' ? [null, 'right' as const] : ['left' as const, 'right' as const]) : ['right' as const];
    const pages = sides.map((s, i) => ({ s, x: i * W, r: s ? contentRect(l, W, H, s) : null }));
    return { W, H, total: sides.length * W, pages };
  });

  function close() {
    editor.showLayout = false;
  }
</script>

<Dialog onclose={close} label={t('layout.title')} width="38rem">
  <h2>{t('layout.title')}</h2>
  <p class="hint">{t('layout.intro')}</p>

  <div class="cols">
    <div class="form">
      <fieldset>
        <legend>{t('layout.output')}</legend>
        <div class="row">
          <label>
            <span>{t('layout.ppi')}</span>
            <input type="number" min={PPI_MIN} max={PPI_MAX} step="1" value={l.ppi} oninput={(e) => Number.isFinite(e.currentTarget.valueAsNumber) && editor.setLayout({ ppi: e.currentTarget.valueAsNumber })} />
          </label>
          <label>
            <span>{t('layout.ppiPreset')}</span>
            <select value="" onchange={(e) => e.currentTarget.value && editor.setLayout({ ppi: Number(e.currentTarget.value) })}>
              <option value="">—</option>
              {#each PPI_PRESETS as p}<option value={p}>{p} ppi</option>{/each}
            </select>
          </label>
          <label>
            <span>{t('size.unit')}</span>
            <select value={unit} onchange={(e) => setUnit(e.currentTarget.value as Unit)}>
              {#each UNITS.filter((u) => u.id !== 'px') as u}<option value={u.id}>{t(`unit.${u.id}`, undefined, u.label)}</option>{/each}
              <option value="px">px</option>
            </select>
          </label>
        </div>
        <p class="info" class:warn={plan.capped}>
          {t('layout.outInfo', { w: plan.pxW, h: plan.pxH, mw: mmW, mh: mmH })}
          {#if plan.capped}<br />{t('layout.capped', { ppi: plan.effectivePpi })}{/if}
        </p>
      </fieldset>

      <fieldset>
        <legend>{t('layout.margins')}</legend>
        <div class="grid4">
          <label><span>{t('layout.top')}</span><input type="number" min="0" {step} value={shown(l.margins.top)} oninput={(e) => setMargin('top', e.currentTarget.valueAsNumber)} /></label>
          <label><span>{t('layout.bottom')}</span><input type="number" min="0" {step} value={shown(l.margins.bottom)} oninput={(e) => setMargin('bottom', e.currentTarget.valueAsNumber)} /></label>
          <label><span>{l.book ? t('layout.inner') : t('layout.left')}</span><input type="number" min="0" {step} value={shown(l.margins.inner)} oninput={(e) => setMargin('inner', e.currentTarget.valueAsNumber)} /></label>
          <label><span>{l.book ? t('layout.outer') : t('layout.right')}</span><input type="number" min="0" {step} value={shown(l.margins.outer)} oninput={(e) => setMargin('outer', e.currentTarget.valueAsNumber)} /></label>
        </div>
        <label class="chk"><input type="checkbox" bind:checked={linked} /> {t('layout.linked')}</label>
        <label class="chk"><input type="checkbox" checked={l.restrict} onchange={(e) => editor.setLayout({ restrict: e.currentTarget.checked })} /> {t('layout.restrict')}</label>
      </fieldset>

      <fieldset>
        <legend>{t('layout.bleedGutter')}</legend>
        <div class="row">
          <label><span>{t('layout.bleed')}</span><input type="number" min="0" {step} value={shown(l.bleed)} oninput={(e) => setPx('bleed', e.currentTarget.valueAsNumber)} /></label>
          <label><span>{t('layout.gutter')}</span><input type="number" min="0" {step} value={shown(l.gutter)} oninput={(e) => setPx('gutter', e.currentTarget.valueAsNumber)} /></label>
        </div>
        <p class="info">{t('layout.bleedHint')}</p>
      </fieldset>

      <fieldset>
        <legend>{t('layout.book')}</legend>
        <label class="chk"><input type="checkbox" checked={l.book} onchange={(e) => editor.setLayout({ book: e.currentTarget.checked })} /> {t('layout.bookOn')}</label>
        {#if l.book}
          <label class="inline">
            <span>{t('layout.firstSide')}</span>
            <select value={l.firstSide} onchange={(e) => editor.setLayout({ firstSide: e.currentTarget.value as 'left' | 'right' })}>
              <option value="right">{t('layout.right')}</option>
              <option value="left">{t('layout.left')}</option>
            </select>
          </label>
          <p class="info">{t('layout.bookHint')}</p>
        {/if}
      </fieldset>
    </div>

    <div class="preview" aria-hidden="true">
      <svg viewBox="-20 -20 {prev.total + 40} {prev.H + 40}">
        {#each prev.pages as p}
          {#if p.s}
            <rect x={p.x} y="0" width={prev.W} height={prev.H} fill="#fff" stroke="#888" />
            {#if p.r}<rect x={p.x + p.r.x} y={p.r.y} width={p.r.w} height={p.r.h} fill="rgb(214 51 132 / 0.08)" stroke="#d63384" stroke-dasharray="14 9" stroke-width="3" />{/if}
            {#if l.bleed > 0}<rect x={p.x - l.bleed} y={-l.bleed} width={prev.W + 2 * l.bleed} height={prev.H + 2 * l.bleed} fill="none" stroke="#e5342d" stroke-width="3" opacity="0.6" />{/if}
            {#if l.book}<text x={p.x + prev.W / 2} y={prev.H / 2} text-anchor="middle" font-size={prev.W * 0.14} fill="#bbb" font-family="sans-serif">{p.s === 'left' ? t('layout.leftShort') : t('layout.rightShort')}</text>{/if}
          {/if}
        {/each}
      </svg>
    </div>
  </div>

  <div class="foot"><button type="button" class="primary" onclick={close}>{t('dialog.close')}</button></div>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.3rem;
  }
  .hint,
  .info {
    color: var(--muted);
    font-size: 0.9231rem;
    margin: 0.3rem 0;
  }
  .info.warn {
    color: var(--accent);
  }
  .cols {
    display: grid;
    grid-template-columns: 1fr 9.5rem;
    gap: 1rem;
    align-items: start;
  }
  @media (max-width: 36rem) {
    .cols {
      grid-template-columns: 1fr;
    }
    .preview {
      order: -1;
    }
  }
  fieldset {
    border: 1px solid var(--border);
    border-radius: 0.4615rem;
    margin: 0 0 0.6rem;
    padding: 0.4rem 0.7rem 0.6rem;
  }
  legend {
    font-weight: 600;
    font-size: 0.9231rem;
    padding: 0 0.3rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.9231rem;
    color: var(--muted);
    min-width: 0;
  }
  label input,
  label select {
    width: 100%;
    color: var(--text);
  }
  .row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
    gap: 0.6rem;
  }
  .grid4 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }
  .chk {
    flex-direction: row;
    align-items: center;
    gap: 0.45rem;
    margin-top: 0.4rem;
    color: var(--text);
  }
  .chk input {
    width: auto;
  }
  .inline {
    margin-top: 0.4rem;
  }
  .preview {
    position: sticky;
    top: 0;
    background: var(--panel-2);
    border-radius: 0.4615rem;
    padding: 0.4rem;
  }
  .preview svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .foot {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.8rem;
  }
  .foot button {
    padding: 0.4615rem 1.2308rem;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    border-radius: 0.3846rem;
    font-weight: 600;
  }
</style>
