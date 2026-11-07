<script lang="ts">
  /** Pantalla de bienvenida: logo grande y una explicación breve de qué es Comic Fast. */
  import { editor } from '../model/store.svelte';
  import { openProject } from '../io/fileActions';
  import { openExternal } from '../io/platform';
  import { DONATE_URL } from '../app/config';
  import { setSplashHidden } from '../app/prefs';
  import { t } from '../i18n/index.svelte';
  import { inline } from '../i18n/markdown';
  import logo from '../../assets/logo.png';
  import Dialog from './Dialog.svelte';

  let dontShow = $state(false);

  function close() {
    if (dontShow) setSplashHidden(true);
    editor.showSplash = false;
  }

  function open() {
    close();
    void openProject();
  }

  function fromTemplate() {
    close();
    editor.showTemplates = true;
  }
</script>

<Dialog label={t('splash.label')} width="43rem" onclose={close}>
  <div class="splash">
    <img class="logo" src={logo} alt="Comic Fast" draggable="false" />
    <p class="tagline">{t('splash.tagline')}</p>

    <p>{@html inline(t('splash.intro'))}</p>

    <ol>
      <li>{@html inline(t('splash.step1'))}</li>
      <li>{@html inline(t('splash.step2'))}</li>
      <li>{@html inline(t('splash.step3'))}</li>
    </ol>

    <p class="privacy">{t('splash.privacy')}</p>

    <div class="buttons">
      <button type="button" class="primary" onclick={close}>{t('splash.start')}</button>
      <button type="button" onclick={fromTemplate}>{t('splash.template')}</button>
      <button type="button" onclick={open}>{t('splash.open')}</button>
      {#if DONATE_URL}
        <button type="button" class="donate" onclick={() => openExternal(DONATE_URL)}>{t('act.help.donate')}</button>
      {/if}
    </div>

    <label class="check"><input type="checkbox" bind:checked={dontShow} /> {t('splash.dontShow')}</label>
    <p class="ver">{t('splash.footer', { version: __APP_VERSION__ })}</p>
    <p class="copyright">{t('app.copyright')}</p>
  </div>
</Dialog>

<style>
  .splash {
    text-align: center;
  }
  .logo {
    width: min(33.8462rem, 100%);
    height: auto;
  }
  .tagline {
    margin: 2px 0 1.0769rem;
    font-size: 1.1538rem;
    font-weight: 600;
  }
  p,
  ol {
    font-size: 1rem;
    line-height: 1.55;
    text-align: left;
  }
  ol {
    padding-left: 1.6923rem;
    margin: 0.6154rem 0;
    color: var(--muted);
  }
  ol b {
    color: var(--text);
  }
  .privacy {
    text-align: center;
    font-size: 0.9231rem;
    color: var(--muted);
  }
  code {
    font-size: 0.9231rem;
  }
  .buttons {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.6154rem;
    margin: 1.0769rem 0 0.7692rem;
  }
  .buttons button {
    padding: 0.5385rem 1.3846rem;
    border: 1px solid var(--border);
    border-radius: 0.4615rem;
    background: var(--panel-2);
  }
  .buttons .primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 700;
  }
  .buttons .donate {
    color: #d6336c;
    border-color: #d6336c;
    background: none;
  }
  .check {
    display: inline-flex;
    align-items: center;
    gap: 0.4615rem;
    font-size: 0.9231rem;
    color: var(--muted);
  }
  .copyright {
    margin: 0.4rem 0 0;
    text-align: center;
    color: var(--muted);
    font-size: 0.9231rem;
  }
  .ver {
    margin: 0.6154rem 0 0;
    text-align: center;
    font-size: 0.9231rem;
    color: var(--muted);
  }
</style>
