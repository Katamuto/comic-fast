<script lang="ts">
  /** Divide la viñeta seleccionada en una cuadrícula de partes iguales. */
  import { editor } from '../model/store.svelte';
  import { t } from '../i18n/index.svelte';
  import Dialog from './Dialog.svelte';
  import NumberField from './fields/NumberField.svelte';

  let cols = $state(2);
  let rows = $state(1);
  let gap = $state(Math.round(editor.doc.pageW * 0.012));

  function close() {
    editor.showSplit = false;
  }
  function apply() {
    editor.splitPanels(Math.max(1, Math.round(cols)), Math.max(1, Math.round(rows)), Math.max(0, gap));
    close();
  }
</script>

<Dialog onclose={close} label={t('split.title')} width="28rem">
  <h2>{t('split.title')}</h2>
  <p>{t('split.intro')}</p>
  <div class="row">
    <NumberField label={t('split.cols')} value={cols} min={1} onchange={(v) => (cols = Math.min(12, Math.max(1, Math.round(v))))} />
    <NumberField label={t('split.rows')} value={rows} min={1} onchange={(v) => (rows = Math.min(12, Math.max(1, Math.round(v))))} />
    <NumberField label={t('cut.gap')} value={gap} min={0} onchange={(v) => (gap = Math.max(0, v))} />
  </div>
  <div class="foot">
    <button type="button" onclick={close}>{t('dialog.cancel')}</button>
    <button type="button" class="primary" onclick={apply}>{t('split.apply')}</button>
  </div>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.5rem;
  }
  .row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.8rem;
  }
  .foot {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 1rem;
  }
</style>
