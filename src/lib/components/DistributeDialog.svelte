<script lang="ts">
  /** Distribuidor: coloca imágenes y cuadros de texto en la página aprovechando el espacio. */
  import { editor } from '../model/store.svelte';
  import { t } from '../i18n/index.svelte';
  import Dialog from './Dialog.svelte';
  import NumberField from './fields/NumberField.svelte';

  // Se recuerdan mientras dure la sesión.
  let margin = $state(Math.round(editor.doc.pageW * 0.04));
  let gap = $state(Math.round(editor.doc.pageW * 0.02));

  const count = $derived.by(() => {
    const ok = (o: { type: string; locked?: boolean }) => (o.type === 'image' || o.type === 'text') && !o.locked;
    const sel = editor.selection.map((id) => editor.find(id)).filter((o) => !!o && ok(o));
    return sel.length > 0 ? sel.length : editor.page.objects.filter(ok).length;
  });
  const scope = $derived(editor.selection.length > 0 && count > 0 ? t('dist.selected') : t('dist.all'));

  function close() {
    editor.showDistribute = false;
  }
  function apply() {
    const n = editor.distribute({ margin, gap });
    editor.status = n > 0 ? t('dist.done', { n }) : t('dist.none');
    close();
  }
</script>

<Dialog onclose={close} label={t('dist.title')} width="30rem">
  <h2>{t('dist.title')}</h2>
  <p>{t('dist.intro')}</p>
  <p class="scope">{t('dist.scope', { n: count, what: scope })}</p>
  <div class="grid">
    <NumberField label={t('dist.margin')} value={margin} min={0} onchange={(v) => (margin = Math.max(0, v))} />
    <NumberField label={t('dist.gap')} value={gap} min={0} onchange={(v) => (gap = Math.max(0, v))} />
  </div>
  <div class="foot">
    <button type="button" onclick={close}>{t('dialog.cancel')}</button>
    <button type="button" class="primary" disabled={count === 0} onclick={apply}>{t('dist.apply')}</button>
  </div>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.5rem;
  }
  .scope {
    color: var(--muted);
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
    margin: 0.8rem 0;
  }
  .foot {
    display: flex;
    gap: 0.6rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }
  .primary {
    font-weight: 700;
    padding: 0.4rem 1rem;
  }
</style>
