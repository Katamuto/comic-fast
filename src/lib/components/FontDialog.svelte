<script lang="ts">
  /** Fuentes del proyecto: importar las propias (con aviso sobre licencias) y quitarlas. */
  import { editor } from '../model/store.svelte';
  import { t } from '../i18n/index.svelte';
  import { userFonts } from '../render/userFonts.svelte';
  import { importFonts } from '../io/fileActions';
  import Dialog from './Dialog.svelte';

  function close() {
    editor.showFonts = false;
  }

  function remove(id: string) {
    userFonts.remove(id);
    editor.dirty = true;
  }

  const styleText = (f: { weight: string; style: string }) =>
    [f.weight === '700' ? t('insp.bold') : '', f.style === 'italic' ? t('insp.italic') : ''].filter(Boolean).join(' · ');
</script>

<Dialog onclose={close} label={t('fonts.title')} width="38rem">
  <h2>{t('fonts.title')}</h2>
  <p>{t('fonts.intro')}</p>

  <div class="warn" role="note">
    <strong>{t('fonts.warnTitle')}</strong>
    <p>{t('fonts.disclaimer')}</p>
    <label class="accept">
      <input type="checkbox" bind:checked={editor.fontsAccepted} />
      <span>{t('fonts.accept')}</span>
    </label>
  </div>

  <div class="actions">
    <button type="button" class="primary" disabled={!editor.fontsAccepted || editor.busy} onclick={() => void importFonts()}>
      {t('fonts.import')}
    </button>
  </div>

  {#if userFonts.list.length === 0}
    <p class="empty">{t('fonts.empty')}</p>
  {:else}
    <ul>
      {#each userFonts.list as f (f.id)}
        <li>
          <span class="name" style:font-family={`"${f.family}", sans-serif`} style:font-weight={f.weight} style:font-style={f.style}>
            {f.family}
          </span>
          <small>{styleText(f)} {f.name}</small>
          <button type="button" onclick={() => remove(f.id)}>{t('fonts.remove')}</button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="foot"><button type="button" onclick={close}>{t('dialog.close')}</button></div>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.5rem;
  }
  .warn {
    margin: 0.8rem 0;
    padding: 0.7rem 0.9rem;
    border: 1px solid #e0a800;
    border-left-width: 5px;
    border-radius: 0.4rem;
    background: rgb(255 193 7 / 0.12);
  }
  .warn p {
    margin: 0.3rem 0 0.6rem;
  }
  .accept {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    font-weight: 600;
  }
  .actions {
    margin-bottom: 0.8rem;
  }
  .primary {
    padding: 0.4rem 1rem;
    font-weight: 700;
  }
  .empty {
    color: var(--muted);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.4rem;
  }
  li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 0.8rem;
    padding: 0.4rem 0.7rem;
    border: 1px solid var(--border);
    border-radius: 0.4rem;
    background: var(--panel-2);
  }
  .name {
    font-size: 1.3rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    color: var(--muted);
    max-width: 14rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .foot {
    margin-top: 1rem;
    text-align: right;
  }
</style>
