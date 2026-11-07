<script lang="ts">
  import { editor } from '../model/store.svelte';
  import { isTauri } from '../io/platform';
  import { t } from '../i18n/index.svelte';
  import logo from '../../assets/logo.png';

  function close() {
    editor.showAbout = false;
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && editor.showAbout && close()} />

{#if editor.showAbout}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="backdrop" onclick={close}>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="about-title" tabindex="-1" onclick={(e) => e.stopPropagation()}>
      <h2 id="about-title"><img src={logo} alt="Comic Fast" draggable="false" /></h2>
      <p class="ver">{t('about.version', { version: __APP_VERSION__, platform: isTauri ? t('about.desktop') : t('about.web') })}</p>
      <p>{t('about.desc')}</p>
      <p class="credit">{t('about.createdBy')}</p>
      <p class="copyright">{t('app.copyright')}</p>
      <p class="ai">{t('about.aiNotice')}</p>
      <div class="links">
        <button type="button" onclick={() => { close(); editor.showHelp = true; }}>{t('act.help.guide')}</button>
        <button type="button" onclick={() => { close(); editor.showEula = true; }}>{t('act.help.eula')}</button>
      </div>
      <button type="button" onclick={close}>{t('dialog.close')}</button>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgb(0 0 0 / 0.45);
    z-index: 50;
  }
  .dialog {
    width: min(33.8462rem, 90vw);
    padding: 1.5385rem 1.8462rem;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 0.7692rem;
    box-shadow: 0 16px 48px rgb(0 0 0 / 0.4);
    user-select: text;
  }
  h2 {
    margin: 0 0 2px;
    text-align: center;
  }
  h2 img {
    width: min(24.6154rem, 100%);
    height: auto;
  }
  .ver {
    margin: 0 0 0.9231rem;
    text-align: center;
    color: var(--muted);
    font-size: 0.9231rem;
  }
  ul {
    padding-left: 1.3846rem;
    line-height: 1.7;
    color: var(--muted);
  }
  button {
    margin-top: 0.6154rem;
    padding: 0.4615rem 1.2308rem;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 0.3846rem;
    font-weight: 600;
  }
  .credit {
    margin: 0.9231rem 0 0.1538rem;
    font-weight: 700;
  }
  .copyright {
    margin: 0.4rem 0 0;
    text-align: center;
    color: var(--muted);
    font-size: 0.9231rem;
  }
  .ai {
    margin: 0 0 0.9231rem;
    color: var(--muted);
    font-size: 0.9231rem;
    line-height: 1.4;
  }
  .links {
    display: flex;
    gap: 0.6154rem;
    justify-content: center;
    margin-bottom: 0.9231rem;
  }
  .links button {
    padding: 0.3077rem 0.9231rem;
  }
</style>
