<script lang="ts">
  import { editor } from '../model/store.svelte';
  import { i18n, t } from '../i18n/index.svelte';
  import { GUIDES } from '../i18n/locales';
  import { pickDocument } from '../i18n/core';
  import { parseDoc } from '../i18n/markdown';
  import Dialog from './Dialog.svelte';
  import DocBody from './DocBody.svelte';

  const doc = $derived(parseDoc(pickDocument(GUIDES, i18n.lang) ?? ''));
  let current = $state(0);
  const sec = $derived(doc.sections[Math.min(current, doc.sections.length - 1)]);
</script>

<Dialog onclose={() => (editor.showHelp = false)} label={t('help.title')} width="46rem">
  <h2>{doc.title || t('help.title')}</h2>
  {#if doc.sections.length === 0}
    <p>{t('help.empty')}</p>
  {:else}
    <div class="layout">
      <nav aria-label={t('help.index')}>
        {#each doc.sections as s, i}
          <button type="button" class:on={i === current} onclick={() => (current = i)}>{s.title || doc.title}</button>
        {/each}
      </nav>
      <div class="body">
        {#if sec.title}<h3>{sec.title}</h3>{/if}
        <DocBody html={sec.html} />
      </div>
    </div>
  {/if}
  <div class="foot"><button type="button" onclick={() => (editor.showHelp = false)}>{t('dialog.close')}</button></div>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.8rem;
  }
  h3 {
    margin: 0 0 0.3rem;
  }
  .layout {
    display: grid;
    grid-template-columns: 12rem minmax(0, 1fr);
    gap: 1rem;
    min-height: 20rem;
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  nav button {
    text-align: left;
    padding: 0.35rem 0.55rem;
    border: 0;
    border-radius: 0.35rem;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  nav button:hover,
  nav button.on {
    background: var(--hover, #8882);
  }
  nav button.on {
    font-weight: 600;
  }
  .foot {
    margin-top: 1rem;
    text-align: right;
  }
  @media (max-width: 40rem) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
</style>
