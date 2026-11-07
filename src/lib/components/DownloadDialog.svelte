<script lang="ts">
  import { editor } from '../model/store.svelte';
  import { i18n, t } from '../i18n/index.svelte';
  import { downloads } from '../app/downloads.svelte';
  import { localizedText } from '../app/notices';
  import { inline } from '../i18n/markdown';
  import Dialog from './Dialog.svelte';
  import Icon from './Icon.svelte';

  function close() {
    editor.showDownload = false;
  }
</script>

<Dialog onclose={close} label={t('dl.title')} width="34rem">
  <h2>{t('dl.title')}</h2>
  <p class="intro">{t('dl.intro')}</p>
  <ul>
    {#each downloads.list as d (d.id)}
      <li>
        <span class="ico">
          <Icon name="download" size={26} />
          {#if d.icon}
            <img src={d.icon} alt="" draggable="false" onerror={(e) => ((e.currentTarget as HTMLElement).style.display = 'none')} />
          {/if}
        </span>
        <span class="txt">
          <strong>{localizedText(d.name, i18n.lang)}</strong>
          {#if d.note}<small>{@html inline(localizedText(d.note, i18n.lang))}</small>{/if}
        </span>
        <a class="get" href={d.url} download>{t('dl.get')}</a>
      </li>
    {/each}
  </ul>
  <div class="foot"><button type="button" onclick={close}>{t('dialog.close')}</button></div>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.4rem;
  }
  .intro {
    margin: 0 0 0.8rem;
    color: var(--muted);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  li {
    display: grid;
    grid-template-columns: 2.6rem 1fr auto;
    align-items: center;
    gap: 0.8rem;
    padding: 0.55rem 0.7rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background: var(--panel-2);
  }
  /* El icono del archivo se apila sobre el genérico: si no carga, queda el genérico. */
  .ico {
    display: grid;
    width: 2.6rem;
    height: 2.6rem;
  }
  .ico > :global(*) {
    grid-area: 1 / 1;
    place-self: center;
  }
  .ico img {
    width: 2.6rem;
    height: 2.6rem;
    object-fit: contain;
    background: var(--panel-2);
  }
  .txt {
    display: grid;
    min-width: 0;
  }
  small {
    color: var(--muted);
  }
  .get {
    padding: 0.45rem 0.9rem;
    border-radius: 0.4rem;
    background: var(--sel);
    color: #fff;
    font-weight: 700;
    text-decoration: none;
  }
  .get:hover {
    filter: brightness(1.1);
  }
  .foot {
    margin-top: 1rem;
    text-align: right;
  }
</style>
