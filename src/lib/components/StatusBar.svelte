<script lang="ts">
  import { editor } from '../model/store.svelte';
  import { t } from '../i18n/index.svelte';
  import { isTauri, openExternal } from '../io/platform';
  import { DONATE_URL } from '../app/config';
  import logo from '../../assets/logo-sm.png';

  const selection = $derived.by(() => {
    const n = editor.selection.length;
    if (n === 0) return '';
    const s = editor.single;
    return s ? t(`obj.${s.type}`) : t('status.nObjects', { n });
  });
</script>

<footer class="statusbar">
  <span class="brand"><img src={logo} alt="Comic Fast" draggable="false" /> v{__APP_VERSION__}</span>
  <span>{t('status.page', { i: editor.pageIndex + 1, n: editor.doc.pages.length })}</span>
  <span>{Math.round(editor.doc.pageW)} × {Math.round(editor.doc.pageH)} px</span>
  {#if selection}<span>{t('status.selection', { what: selection })}</span>{/if}
  <span class="grow">{editor.status}</span>
  <span>{Math.round(editor.zoom * 100)}%</span>
  <span class:dirty={editor.dirty}>{editor.dirty ? t('status.unsaved') : t('status.savedShort')}</span>
  {#if DONATE_URL}
    <button type="button" class="donate" title={t('donate.tip')} onclick={() => openExternal(DONATE_URL)}>{t('donate.button')}</button>
  {/if}
  <span>{isTauri ? t('status.desktop') : t('status.web')}</span>
  <span class="copy">{t('app.copyright')}</span>
</footer>

<style>
  .statusbar {
    display: flex;
    align-items: center;
    gap: 1.2308rem;
    height: 1.8462rem;
    padding: 0 0.7692rem;
    font-size: 0.9231rem;
    color: var(--muted);
    background: var(--panel);
    border-top: 1px solid var(--border);
    white-space: nowrap;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.4615rem;
    color: var(--text);
    font-weight: 600;
  }
  .brand img {
    height: 1.1538rem;
  }
  .grow {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .donate {
    padding: 0 0.6154rem;
    height: 1.3846rem;
    font-size: 0.9231rem;
    color: #d6336c;
    background: none;
    border: 1px solid #d6336c;
    border-radius: 0.6923rem;
  }
  .donate:hover {
    background: #d6336c;
    color: #fff;
  }
  .copy {
    font-size: 0.8462rem;
    opacity: 0.85;
  }
  /* En ventanas estrechas se oculta la leyenda de la barra (sigue en Acerca de). */
  @media (max-width: 70rem) {
    .copy {
      display: none;
    }
  }
  .dirty {
    color: var(--accent);
  }
</style>
