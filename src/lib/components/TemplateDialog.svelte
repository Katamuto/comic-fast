<script lang="ts">
  /** Nuevo proyecto a partir de una plantilla (los .cfast de src/assets/templates). */
  import { onMount } from 'svelte';
  import { editor } from '../model/store.svelte';
  import { i18n, t } from '../i18n/index.svelte';
  import { TEMPLATES, readTemplate, templateName, type TemplateDef } from '../io/templates';
  import { newFromTemplate } from '../io/fileActions';
  import type { ComicDoc } from '../model/types';
  import Dialog from './Dialog.svelte';
  import PageSvg from './PageSvg.svelte';

  interface Entry {
    tpl: TemplateDef;
    doc: ComicDoc | null;
    failed: boolean;
  }
  let entries = $state<Entry[]>(TEMPLATES.map((tpl) => ({ tpl, doc: null, failed: false })));

  onMount(() => {
    entries.forEach((e, i) => {
      readTemplate(e.tpl)
        .then((r) => (entries[i].doc = r.doc))
        .catch(() => (entries[i].failed = true));
    });
  });

  function close() {
    editor.showTemplates = false;
  }
  function choose(tpl: TemplateDef) {
    close();
    void newFromTemplate(tpl);
  }
</script>

<Dialog onclose={close} label={t('tpl.title')} width="52rem">
  <h2>{t('tpl.title')}</h2>
  <p>{t('tpl.intro')}</p>

  {#if entries.length === 0}
    <p class="empty">{t('tpl.empty')}</p>
  {:else}
    <div class="cards">
      {#each entries as e (e.tpl.id)}
        <button type="button" class="card" disabled={e.failed} onclick={() => choose(e.tpl)}>
          <span class="thumb" style:aspect-ratio={e.doc ? `${e.doc.pageW} / ${e.doc.pageH}` : '3 / 4'}>
            {#if e.doc}
              <PageSvg
                w={e.doc.pageW}
                h={e.doc.pageH}
                page={e.doc.pages[0]}
                assets={{}}
                scope={`tpl-${e.tpl.id}`}
                style={e.doc.pages[0]?.noStyle ? null : (e.doc.style ?? null)}
                pageNo={e.doc.pages[0]?.noNumber ? null : 1}
                pageCount={e.doc.pages.length}
                globals={e.doc.globals ?? null}
                quality="thumb"
              />
            {/if}
          </span>
          <strong>{templateName(e.tpl, i18n.lang)}</strong>
          {#if e.doc}
            <small>{t('tpl.info', { n: e.doc.pages.length, w: e.doc.pageW, h: e.doc.pageH })}</small>
          {:else if e.failed}
            <small>{t('tpl.failed')}</small>
          {/if}
        </button>
      {/each}
    </div>
  {/if}

  <div class="foot"><button type="button" onclick={close}>{t('dialog.cancel')}</button></div>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.5rem;
  }
  .empty {
    color: var(--muted);
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
    gap: 0.9rem;
    margin: 0.8rem 0;
    max-height: 60vh;
    overflow-y: auto;
    padding: 0.2rem;
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.35rem;
    padding: 0.6rem;
    text-align: center;
    background: var(--panel-2);
    border: 2px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
  }
  .card:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .thumb {
    display: block;
    width: 100%;
    max-height: 16rem;
    background: #fff;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.35);
    overflow: hidden;
  }
  .thumb :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }
  small {
    color: var(--muted);
  }
  .foot {
    text-align: right;
  }
</style>
