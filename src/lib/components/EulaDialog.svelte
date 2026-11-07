<script lang="ts">
  import { editor } from '../model/store.svelte';
  import { i18n, t } from '../i18n/index.svelte';
  import { EULAS } from '../i18n/locales';
  import { pickDocument } from '../i18n/core';
  import { parseDoc } from '../i18n/markdown';
  import { eulaAccepted, setEulaAccepted, splashHidden } from '../app/prefs';
  import Dialog from './Dialog.svelte';
  import DocBody from './DocBody.svelte';

  const doc = $derived(parseDoc(pickDocument(EULAS, i18n.lang) ?? ''));
  const first = !eulaAccepted();

  function close(accept: boolean) {
    if (accept) setEulaAccepted(true);
    editor.showEula = false;
    if (first && !splashHidden()) editor.showSplash = true;
  }
</script>

<Dialog onclose={() => close(false)} label={t('eula.title')} width="44rem">
  <h2>{doc.title || t('eula.title')}</h2>
  <div class="text">
    {#if doc.sections.length === 0}
      <p>{t('eula.empty')}</p>
    {/if}
    {#each doc.sections as s}
      {#if s.title}<h3>{s.title}</h3>{/if}
      <DocBody html={s.html} />
    {/each}
  </div>
  <div class="foot">
    {#if first}
      <button type="button" onclick={() => close(true)}>{t('eula.accept')}</button>
    {:else}
      <button type="button" onclick={() => close(false)}>{t('dialog.close')}</button>
    {/if}
  </div>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.6rem;
  }
  h3 {
    margin: 1rem 0 0.2rem;
  }
  .text {
    max-height: 55vh;
    overflow: auto;
    padding-right: 0.5rem;
  }
  .foot {
    margin-top: 1rem;
    text-align: right;
  }
</style>
