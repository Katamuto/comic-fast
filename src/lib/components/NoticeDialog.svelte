<script lang="ts">
  import { editor } from '../model/store.svelte';
  import { i18n, t } from '../i18n/index.svelte';
  import { notices } from '../app/notices.svelte';
  import { localizedText } from '../app/notices';
  import { renderMarkdown, inline } from '../i18n/markdown';
  import Dialog from './Dialog.svelte';
  import DocBody from './DocBody.svelte';

  function close() {
    editor.showNotice = false;
  }
</script>

<Dialog onclose={close} label={t('notice.title')} width="38rem">
  <h2>{t('notice.title')}</h2>
  {#each notices.list as n (n.id)}
    <article>
      {#if n.title}<h3>{@html inline(localizedText(n.title, i18n.lang))}</h3>{/if}
      <DocBody html={renderMarkdown(localizedText(n.message, i18n.lang))} />
    </article>
  {/each}
  <div class="foot"><button type="button" onclick={close}>{t('dialog.close')}</button></div>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.6rem;
  }
  article {
    padding: 0.4rem 0 0.8rem;
    border-bottom: 1px solid var(--border);
  }
  article:last-of-type {
    border-bottom: 0;
  }
  h3 {
    margin: 0.2rem 0;
  }
  .foot {
    margin-top: 0.8rem;
    text-align: right;
  }
</style>
