<script lang="ts">
  /**
   * Interfaz para teléfonos (solo se monta cuando device.mobile es true; el escritorio no cambia).
   * Reutiliza el lienzo, la barra de herramientas, la lista de páginas, los recursos y el inspector;
   * lo nuevo es la organización: barra superior, paneles inferiores y menú lateral.
   */
  import Canvas from './Canvas.svelte';
  import Toolbar from './Toolbar.svelte';
  import PageList from './PageList.svelte';
  import ResourcePanel from './ResourcePanel.svelte';
  import Inspector from './Inspector.svelte';
  import Sheet from './Sheet.svelte';
  import Icon from './Icon.svelte';
  import { actionMap, labelOf, menus } from '../app/actions';
  import { device } from '../app/device.svelte';
  import { notices } from '../app/notices.svelte';
  import { downloads } from '../app/downloads.svelte';
  import { editor } from '../model/store.svelte';
  import { i18n, t, LANGUAGES } from '../i18n/index.svelte';
  import { appearance } from '../app/appearance.svelte';

  type Panel = 'pages' | 'resources' | 'props' | null;
  let panel = $state<Panel>(null);
  let menuOpen = $state(false);

  const toggle = (p: Exclude<Panel, null>) => (panel = panel === p ? null : p);
  const act = (id: string) => {
    const a = actionMap.get(id);
    if (a && (a.enabled?.() ?? true)) void a.run();
  };

  function runFromMenu(id: string) {
    menuOpen = false;
    act(id);
  }

  const showFs = $derived(!device.standalone);

  async function install() {
    const r = await device.install();
    if (r === 'ios') editor.status = t('m.installIos');
    else if (r === 'unavailable') editor.status = t('m.installNo');
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && menuOpen && (menuOpen = false)} />

<div class="m">
  <div class="bar">
    <button type="button" class="ib" aria-label={t('m.menu')} onclick={() => (menuOpen = true)}><Icon name="menu" size={22} /></button>
    <span class="title">{editor.dirty ? '● ' : ''}{editor.fileName}</span>
    {#if device.canInstall}
      <button type="button" class="install" onclick={install}><Icon name="download" size={16} /> {t('m.install')}</button>
    {/if}
    <button type="button" class="ib" aria-label={t('act.edit.undo')} disabled={!(actionMap.get('edit.undo')?.enabled?.() ?? true)} onclick={() => act('edit.undo')}><Icon name="undo" size={20} /></button>
    <button type="button" class="ib" aria-label={t('act.edit.redo')} disabled={!(actionMap.get('edit.redo')?.enabled?.() ?? true)} onclick={() => act('edit.redo')}><Icon name="redo" size={20} /></button>
    {#if showFs}
      <button
        type="button"
        class="ib"
        class:on={device.fullscreen}
        aria-label={device.fullscreen ? t('act.view.exitFullscreen') : t('act.view.fullscreen')}
        onclick={() => act('view.fullscreen')}
      >
        <Icon name={device.fullscreen ? 'exitFullscreen' : 'fullscreen'} size={20} />
      </button>
    {/if}
  </div>

  <div class="work">
    <div class="canvas">
      <Canvas />
      {#if editor.styleMode}
        <div class="stylebanner" role="status">
          <span>{t('style.banner')}</span>
          <button type="button" onclick={() => editor.setStyleMode(false)}>{t('style.back')}</button>
        </div>
      {/if}
      {#if editor.status}<div class="toast" role="status">{editor.status}</div>{/if}
    </div>

    {#if panel === 'pages'}
      <Sheet title={t('m.pages')} compact onclose={() => (panel = null)}>
        {#snippet actions()}
          <button type="button" class="sb" aria-label={t('act.page.add')} title={t('act.page.add')} onclick={() => act('page.add')}>＋</button>
          <button type="button" class="sb" aria-label={t('act.page.duplicate')} title={t('act.page.duplicate')} onclick={() => act('page.duplicate')}><Icon name="duplicate" size={19} /></button>
          <button type="button" class="sb" aria-label={t('act.page.delete')} title={t('act.page.delete')} disabled={!(actionMap.get('page.delete')?.enabled?.() ?? true)} onclick={() => act('page.delete')}><Icon name="trash" size={19} /></button>
        {/snippet}
        <PageList mobile />
      </Sheet>
    {:else if panel === 'resources'}
      <Sheet title={t('m.resources')} onclose={() => (panel = null)}>
        <ResourcePanel inspector={false} />
      </Sheet>
    {:else if panel === 'props'}
      <Sheet title={t('m.props')} onclose={() => (panel = null)}>
        <Inspector />
      </Sheet>
    {/if}
  </div>

  <div class="strip"><Toolbar mobile /></div>

  <nav class="tabs" aria-label={t('m.panels')}>
    <button type="button" class:on={panel === 'pages'} onclick={() => toggle('pages')}>
      <Icon name="pages" size={20} /><span>{t('m.pages')}</span>
    </button>
    <button type="button" class:on={panel === 'resources'} onclick={() => toggle('resources')}>
      <Icon name="library" size={20} /><span>{t('m.resources')}</span>
    </button>
    <button type="button" class:on={panel === 'props'} onclick={() => toggle('props')}>
      <Icon name="sliders" size={20} /><span>{t('m.props')}</span>
    </button>
  </nav>

  {#if menuOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="backdrop" onclick={() => (menuOpen = false)}>
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
      <aside class="drawer" aria-label={t('menu.main')} onclick={(e) => e.stopPropagation()}>
        <div class="dhead">
          <strong>Comic Fast</strong>
          <button type="button" class="ib" aria-label={t('m.close')} onclick={() => (menuOpen = false)}><Icon name="close" size={22} /></button>
        </div>
        <div class="dbody">
          {#each menus as menu, i}
            <details open={i === 0}>
              <summary>{t(menu.label)}</summary>
              {#each menu.entries as id}
                {#if id === '-'}
                  <hr />
                {:else}
                  {@const a = actionMap.get(id)}
                  {#if a}
                    <button type="button" class="item" disabled={!(a.enabled?.() ?? true)} onclick={() => runFromMenu(id)}>
                      <span class="check">{a.checked?.() ? '✓' : ''}</span>{labelOf(a)}
                    </button>
                  {/if}
                {/if}
              {/each}
            </details>
          {/each}
          <div class="extras">
            {#if downloads.any}
              <button type="button" class="item" onclick={() => { menuOpen = false; editor.showDownload = true; }}>
                <Icon name="download" size={18} /> {t('dl.button')}
              </button>
            {/if}
            {#if notices.any}
              <button type="button" class="item" onclick={() => { menuOpen = false; editor.showNotice = true; notices.markSeen(); }}>
                <Icon name="bell" size={18} /> {t('notice.bell')}
              </button>
            {/if}
            <label class="lang">
              <Icon name="globe" size={18} />
              <select value={i18n.lang} aria-label={t('lang.choose')} onchange={(e) => i18n.set(e.currentTarget.value)}>
                {#each LANGUAGES as l (l.code)}
                  <option value={l.code} lang={l.code}>{l.name}</option>
                {/each}
              </select>
            </label>
          </div>
        </div>
      </aside>
    </div>
  {/if}
</div>

<style>
  .m {
    display: grid;
    height: 100vh;
    height: 100dvh;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto auto;
    grid-template-areas: 'bar' 'work' 'strip' 'tabs';
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    background: var(--bg);
  }
  .bar {
    grid-area: bar;
    display: flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0 0.3rem;
    min-height: 3rem;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
  }
  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .install {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex: none;
    padding: 0.4rem 0.8rem;
    background: var(--accent);
    color: #fff;
    border: 0;
    border-radius: 1.2rem;
    font-weight: 700;
    font-size: 0.9rem;
    white-space: nowrap;
  }
  .ib {
    display: grid;
    place-items: center;
    flex: none;
    width: 2.8rem;
    height: 2.8rem;
    padding: 0;
    background: none;
    border: 0;
    border-radius: 0.5rem;
    color: var(--text);
  }
  .ib.on {
    background: var(--sel);
    color: #fff;
  }
  .work {
    grid-area: work;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .canvas {
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 0;
  }
  .canvas :global(.viewport) {
    position: absolute;
    inset: 0;
    height: auto;
  }
  .strip {
    grid-area: strip;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .tabs {
    grid-area: tabs;
    display: flex;
    background: var(--panel);
    border-top: 1px solid var(--border);
  }
  .tabs button {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    padding: 0.4rem 0.2rem;
    font-size: 0.8rem;
    background: none;
    border: 0;
    border-top: 3px solid transparent;
    color: var(--muted);
  }
  .tabs button.on {
    color: var(--text);
    border-top-color: var(--accent);
    font-weight: 600;
  }
  .toast {
    position: absolute;
    left: 50%;
    bottom: 0.8rem;
    transform: translateX(-50%);
    max-width: 92%;
    padding: 0.5rem 0.9rem;
    background: rgb(20 20 24 / 0.92);
    color: #fff;
    border-radius: 1rem;
    font-size: 0.9rem;
    text-align: center;
    pointer-events: none;
    z-index: 20;
  }
  .stylebanner {
    position: absolute;
    top: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    max-width: 94%;
    padding: 0.3rem 0.4rem 0.3rem 0.8rem;
    background: var(--sel);
    color: #fff;
    border-radius: 1.2rem;
    box-shadow: 0 4px 14px rgb(0 0 0 / 0.3);
    font-size: 0.85rem;
  }
  .stylebanner button {
    padding: 0.35rem 0.8rem;
    color: var(--sel);
    background: #fff;
    border: 0;
    border-radius: 1rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: rgb(0 0 0 / 0.5);
  }
  .drawer {
    display: flex;
    flex-direction: column;
    width: min(21rem, 86vw);
    height: 100%;
    background: var(--panel);
    box-shadow: 8px 0 30px rgb(0 0 0 / 0.4);
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .dhead {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.4rem 0 1rem;
    border-bottom: 1px solid var(--border);
    font-size: 1.1rem;
  }
  .dbody {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 1rem;
  }
  summary {
    padding: 0.8rem 1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.9rem;
    color: var(--muted);
    cursor: pointer;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    min-height: 3rem;
    padding: 0 1rem;
    text-align: left;
    background: none;
    border: 0;
    color: var(--text);
    font-size: 1rem;
  }
  .item:active:not(:disabled) {
    background: var(--panel-2);
  }
  .check {
    width: 1.2rem;
    color: var(--accent);
  }
  hr {
    margin: 0.2rem 1rem;
    border: 0;
    border-top: 1px solid var(--border);
  }
  .extras {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
  }
  .lang {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 1rem;
  }
  .lang select {
    flex: 1;
    min-height: 2.6rem;
    font-size: 1rem;
  }

  /* Teléfono en horizontal: barra superior con las pestañas a la derecha, herramientas en columna a la izquierda. */
  @media (orientation: landscape) {
    .m {
      grid-template-columns: auto minmax(0, 1fr) auto;
      grid-template-rows: auto minmax(0, 1fr);
      grid-template-areas: 'bar bar tabs' 'strip work work';
    }
    .bar {
      min-height: 2.8rem;
    }
    .tabs {
      border-top: 0;
      border-bottom: 1px solid var(--border);
    }
    .tabs button {
      flex-direction: row;
      gap: 0.4rem;
      padding: 0 0.8rem;
      font-size: 0.85rem;
      border-top: 0;
      border-bottom: 3px solid transparent;
    }
    .tabs button.on {
      border-bottom-color: var(--accent);
    }
    .work {
      flex-direction: row;
    }
  }
</style>
