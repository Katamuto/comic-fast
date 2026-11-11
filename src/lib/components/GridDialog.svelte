<script lang="ts">
  /** Cuadrícula relativa a la página: columnas y subdivisiones. */
  import { editor } from '../model/store.svelte';
  import { t } from '../i18n/index.svelte';
  import { clampGrid, cellSize, gridStep } from '../model/grid';
  import Dialog from './Dialog.svelte';
  import NumberField from './fields/NumberField.svelte';

  const g = $derived(clampGrid(editor.grid));
  const cell = $derived(Math.round(cellSize(editor.doc.pageW, g) * 10) / 10);
  const step = $derived(Math.round(gridStep(editor.doc.pageW, g) * 10) / 10);
  const rows = $derived(Math.round((editor.doc.pageH / cell) * 10) / 10);

  function close() {
    editor.showGridDialog = false;
  }
</script>

<Dialog onclose={close} label={t('grid.title')} width="30rem">
  <h2>{t('grid.title')}</h2>
  <p>{t('grid.intro')}</p>
  <div class="row">
    <NumberField label={t('grid.cols')} value={g.cols} min={1} onchange={(v) => (editor.grid = clampGrid({ ...g, cols: v }))} />
    <NumberField label={t('grid.sub')} value={g.sub} min={1} onchange={(v) => (editor.grid = clampGrid({ ...g, sub: v }))} />
  </div>
  <p class="hint">{t('grid.info', { cell, rows, step })}</p>
  <label class="chk"><input type="checkbox" bind:checked={editor.showGrid} /> {t('act.view.grid')}</label>
  <label class="chk"><input type="checkbox" bind:checked={editor.snap} /> {t('act.view.snap')}</label>
  <div class="foot"><button type="button" onclick={close}>{t('dialog.close')}</button></div>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.5rem;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }
  .hint {
    color: var(--muted);
    font-size: 0.9231rem;
  }
  .chk {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin: 0.3rem 0;
  }
  .foot {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
  }
</style>
