<script lang="ts">
  /** Exportar: formato, PPI, sangrado, marcas de corte, conversión a CMYK y páginas. */
  import { editor } from '../model/store.svelte';
  import { t } from '../i18n/index.svelte';
  import { readPref, writePref } from '../app/prefs';
  import { runExport, type ExportKind } from '../io/fileActions';
  import { clampCmyk, DEFAULT_CMYK, type CmykOptions } from '../io/cmyk';
  import { PPI_MAX, PPI_MIN, PPI_PRESETS, renderPlan } from '../model/layout';
  import Dialog from './Dialog.svelte';

  interface Saved {
    kind: ExportKind;
    bleed: boolean;
    marks: boolean;
    range: 'all' | 'current';
    cmyk: CmykOptions;
  }
  function load(): Saved {
    const base: Saved = { kind: 'printPdf', bleed: true, marks: true, range: 'all', cmyk: { ...DEFAULT_CMYK } };
    try {
      const raw = readPref('export');
      if (raw) {
        const v = JSON.parse(raw) as Partial<Saved>;
        return { ...base, ...v, cmyk: clampCmyk(v.cmyk ?? {}) };
      }
    } catch {
      /* preferencias ilegibles: se usan las de fábrica */
    }
    return base;
  }

  const init = load();
  let kind = $state<ExportKind>(init.kind);
  let bleed = $state(init.bleed);
  let marks = $state(init.marks);
  let range = $state<'all' | 'current'>(init.range);
  let cmyk = $state<CmykOptions>(init.cmyk);
  let ppi = $state(editor.layout.ppi);

  const isPrint = $derived(kind === 'printPdf' || kind === 'tiff');
  const single = $derived(kind === 'png');
  const l = $derived(editor.layout);
  const useBleed = $derived(isPrint || kind === 'pdf' || kind === 'png' ? bleed : false);
  const plan = $derived(renderPlan(editor.doc.pageW, editor.doc.pageH, ppi, useBleed ? l.bleed : 0));
  const pages = $derived(single || range === 'current' ? 1 : editor.doc.pages.length);
  const bigMb = $derived(Math.round((plan.pxW * plan.pxH * (isPrint ? 4 : 3)) / 1e6));

  const kinds: { id: ExportKind; key: string; print: boolean }[] = [
    { id: 'printPdf', key: 'export.kind.printPdf', print: true },
    { id: 'tiff', key: 'export.kind.tiff', print: true },
    { id: 'pdf', key: 'export.kind.pdf', print: false },
    { id: 'png', key: 'export.kind.png', print: false },
    { id: 'cbz', key: 'export.kind.cbz', print: false }
  ];

  function close() {
    editor.showExport = false;
  }

  function go() {
    const c = clampCmyk(cmyk);
    writePref('export', JSON.stringify({ kind, bleed, marks, range, cmyk: c }));
    if (ppi !== l.ppi) editor.setLayout({ ppi });
    const pageList = single || range === 'current' ? [editor.pageIndex] : undefined;
    editor.showExport = false;
    void runExport(kind, { ppi, bleed: useBleed, marks: kind === 'printPdf' && marks, cmyk: c, pages: pageList });
  }
</script>

<Dialog onclose={close} label={t('export.title')} width="36rem">
  <h2>{t('export.title')}</h2>

  <div class="kinds" role="radiogroup" aria-label={t('export.format')}>
    {#each kinds as k}
      <label class="kind" class:on={kind === k.id}>
        <input type="radio" name="kind" value={k.id} checked={kind === k.id} onchange={() => (kind = k.id)} />
        <span>{t(k.key)}</span>
        {#if k.print}<em>CMYK</em>{/if}
      </label>
    {/each}
  </div>
  <p class="hint">{t(`export.hint.${kind}`)}</p>

  <div class="row">
    <label>
      <span>{t('layout.ppi')}</span>
      <input type="number" min={PPI_MIN} max={PPI_MAX} value={ppi} oninput={(e) => Number.isFinite(e.currentTarget.valueAsNumber) && (ppi = Math.min(PPI_MAX, Math.max(PPI_MIN, Math.round(e.currentTarget.valueAsNumber))))} />
    </label>
    <label>
      <span>{t('layout.ppiPreset')}</span>
      <select value="" onchange={(e) => e.currentTarget.value && (ppi = Number(e.currentTarget.value))}>
        <option value="">—</option>
        {#each PPI_PRESETS as p}<option value={p}>{p} ppi</option>{/each}
      </select>
    </label>
    {#if !single}
      <label>
        <span>{t('export.pages')}</span>
        <select bind:value={range}>
          <option value="all">{t('export.pagesAll')}</option>
          <option value="current">{t('export.pagesCurrent')}</option>
        </select>
      </label>
    {/if}
  </div>

  <label class="chk"><input type="checkbox" bind:checked={bleed} disabled={l.bleed <= 0} /> {t('export.bleed', { mm: Math.round((l.bleed / 150) * 254) / 10 })}</label>
  {#if l.bleed <= 0}<p class="hint warnish">{t('export.noBleed')}</p>{/if}
  {#if kind === 'printPdf'}
    <label class="chk"><input type="checkbox" bind:checked={marks} /> {t('export.marks')}</label>
  {/if}

  {#if isPrint}
    <fieldset>
      <legend>{t('export.cmykTitle')}</legend>
      <div class="row">
        <label>
          <span>{t('export.tac', { n: cmyk.tac })}</span>
          <input type="range" min="150" max="400" step="10" bind:value={cmyk.tac} />
        </label>
        <label>
          <span>{t('export.gcr', { n: Math.round(cmyk.gcr * 100) })}</span>
          <input type="range" min="0" max="1" step="0.05" bind:value={cmyk.gcr} />
        </label>
      </div>
      <label class="chk"><input type="checkbox" bind:checked={cmyk.neutralK} /> {t('export.neutralK')}</label>
      <button type="button" class="link" onclick={() => (cmyk = { ...DEFAULT_CMYK })}>{t('export.cmykReset')}</button>
      <p class="hint">{t('export.cmykNote')}</p>
    </fieldset>
  {/if}

  <p class="result" class:warn={plan.capped}>
    {t('export.result', { w: plan.pxW, h: plan.pxH, n: pages, mb: bigMb })}
    {#if plan.capped}<br />{t('layout.capped', { ppi: plan.effectivePpi })}{/if}
  </p>

  <div class="foot">
    <button type="button" onclick={close}>{t('dialog.cancel')}</button>
    <button type="button" class="primary" onclick={go}>{t('export.go')}</button>
  </div>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.6rem;
  }
  .kinds {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.4rem;
  }
  .kind {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    border: 1px solid var(--border);
    border-radius: 0.4615rem;
    padding: 0.4rem 0.6rem;
    cursor: pointer;
    font-size: 0.9231rem;
  }
  .kind.on {
    border-color: var(--accent);
    background: var(--panel-2);
  }
  .kind em {
    margin-left: auto;
    font-style: normal;
    font-size: 0.7692rem;
    background: var(--accent);
    color: #fff;
    border-radius: 0.3rem;
    padding: 0 0.3rem;
  }
  .hint {
    color: var(--muted);
    font-size: 0.9231rem;
    margin: 0.4rem 0;
  }
  .hint.warnish {
    margin-left: 1.6rem;
  }
  .row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: 0.6rem;
    margin: 0.5rem 0;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.9231rem;
    color: var(--muted);
    min-width: 0;
  }
  label input:not([type='checkbox']):not([type='radio']),
  label select {
    width: 100%;
    color: var(--text);
  }
  .chk {
    flex-direction: row;
    align-items: center;
    gap: 0.45rem;
    margin: 0.3rem 0;
    color: var(--text);
  }
  fieldset {
    border: 1px solid var(--border);
    border-radius: 0.4615rem;
    margin: 0.6rem 0;
    padding: 0.3rem 0.7rem 0.6rem;
  }
  legend {
    font-weight: 600;
    font-size: 0.9231rem;
    padding: 0 0.3rem;
  }
  .link {
    border: 0;
    background: none;
    color: var(--accent);
    padding: 0;
    cursor: pointer;
    font-size: 0.9231rem;
  }
  .result {
    margin: 0.6rem 0;
    padding: 0.5rem 0.7rem;
    border-radius: 0.4615rem;
    background: var(--panel-2);
    font-size: 0.9231rem;
  }
  .result.warn {
    color: var(--accent);
  }
  .foot {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
  }
  .foot button {
    padding: 0.4615rem 1.2308rem;
    border: 1px solid var(--border);
    border-radius: 0.3846rem;
    background: var(--panel-2);
  }
  .foot .primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 600;
  }
</style>
