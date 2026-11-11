<script lang="ts">
  import { actionMap, formatKeys, labelOf, menus } from '../app/actions';
  import logo from '../../assets/logo-sm.png';
  import { appearance } from '../app/appearance.svelte';
  import Icon from './Icon.svelte';
  import { t, i18n, LANGUAGES } from '../i18n/index.svelte';
  import { notices } from '../app/notices.svelte';
  import { downloads } from '../app/downloads.svelte';
  import { editor } from '../model/store.svelte';

  let open = $state<number | null>(null);
  let langOpen = $state(false);

  function run(id: string) {
    open = null;
    const a = actionMap.get(id);
    if (a && (a.enabled?.() ?? true)) void a.run();
  }

  function onWindowPointerDown(e: PointerEvent) {
    if (!(e.target as Element).closest('.menubar')) {
      open = null;
      langOpen = false;
    }
    else if (!(e.target as Element).closest('.lang')) langOpen = false;
  }

  function onWindowKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = null;
      langOpen = false;
    }
  }
</script>

<svelte:window onpointerdown={onWindowPointerDown} onkeydown={onWindowKeyDown} />

<nav class="menubar" role="menubar" aria-label={t('menu.main')}>
  <img class="logo" src={logo} alt="Comic Fast" draggable="false" />
  {#each menus as menu, i}
    <div class="menu">
      <button
        type="button"
        class="top"
        class:active={open === i}
        role="menuitem"
        aria-haspopup="true"
        aria-expanded={open === i}
        onclick={() => (open = open === i ? null : i)}
        onpointerenter={() => {
          if (open !== null) open = i;
        }}
      >
        {t(menu.label)}
      </button>

      {#if open === i}
        <div class="dropdown" role="menu">
          {#each menu.entries as id}
            {#if id === '-'}
              <hr />
            {:else}
              {@const a = actionMap.get(id)}
              {#if a}
                <button
                  type="button"
                  class="item"
                  role="menuitem"
                  disabled={!(a.enabled?.() ?? true)}
                  onclick={() => run(id)}
                >
                  <span class="check">{a.checked?.() ? '✓' : ''}</span>
                  <span class="label">{labelOf(a)}</span>
                  <span class="keys">{formatKeys(a.keys?.[0])}</span>
                </button>
              {/if}
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/each}

  <div class="tools">
    {#if downloads.any}
      <button type="button" class="tool getapp" title={t('dl.button')} onclick={() => (editor.showDownload = true)}>
        <Icon name="download" size={17} /><span class="getapp-text">{t('dl.button')}</span>
      </button>
    {/if}
    <button type="button" class="tool" title={t('view.textSmaller')} aria-label={t('view.textSmaller')} disabled={!appearance.canShrink} onclick={() => appearance.stepScale(-1)}>
      <span class="a-small">A</span>
    </button>
    <button type="button" class="tool" title={t('view.textBigger')} aria-label={t('view.textBigger')} disabled={!appearance.canGrow} onclick={() => appearance.stepScale(1)}>
      <span class="a-big">A</span>
    </button>
    <button
      type="button"
      class="tool"
      title={appearance.effectiveTheme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
      aria-label={t('theme.toggle')}
      onclick={() => appearance.toggleTheme()}
    >
      <Icon name={appearance.effectiveTheme === 'dark' ? 'sun' : 'moon'} size={17} />
    </button>
    {#if notices.any}
      <button
        type="button"
        class="tool bell"
        class:unread={notices.unread}
        title={t('notice.bell')}
        aria-label={t('notice.bell')}
        onclick={() => {
          editor.showNotice = true;
          notices.markSeen();
        }}
      >
        <Icon name="bell" size={17} />
      </button>
    {/if}
    <div class="lang">
      <button
        type="button"
        class="tool"
        title={t('lang.choose')}
        aria-label={t('lang.choose')}
        aria-haspopup="listbox"
        aria-expanded={langOpen}
        onclick={() => (langOpen = !langOpen)}
      >
        <Icon name="globe" size={17} />
      </button>
      {#if langOpen}
        <ul class="langlist" role="listbox" aria-label={t('lang.choose')}>
          {#each LANGUAGES as l (l.code)}
            <li>
              <button
                type="button"
                role="option"
                lang={l.code}
                aria-selected={l.code === i18n.lang}
                class:on={l.code === i18n.lang}
                onclick={() => {
                  i18n.set(l.code);
                  langOpen = false;
                }}
              >
                <span class="check">{l.code === i18n.lang ? '✓' : ''}</span>{l.name}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</nav>

<style>
  .tool.getapp {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 600;
    white-space: nowrap;
  }
  @media (max-width: 62rem) {
    .getapp-text {
      display: none;
    }
  }
  .bell {
    position: relative;
  }
  .bell.unread::after {
    content: '';
    position: absolute;
    top: 3px;
    right: 3px;
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: #e53935;
    border: 1px solid var(--panel);
  }
  .lang {
    position: relative;
    display: flex;
  }
  .langlist {
    position: absolute;
    right: 0;
    top: 100%;
    z-index: 50;
    min-width: 11rem;
    max-height: 70vh;
    overflow: auto;
    margin: 0;
    padding: 0.3rem;
    list-style: none;
    background: var(--panel, #fff);
    color: var(--text, inherit);
    border: 1px solid var(--border, #8884);
    border-radius: 0.4rem;
    box-shadow: 0 6px 20px #0004;
  }
  .langlist button {
    display: flex;
    gap: 0.4rem;
    width: 100%;
    padding: 0.35rem 0.5rem;
    background: none;
    border: 0;
    border-radius: 0.3rem;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .langlist button:hover,
  .langlist button.on {
    background: var(--hover, #8882);
  }
  .langlist .check {
    width: 1em;
  }

  .menubar {
    display: flex;
    align-items: stretch;
    height: 2.3077rem;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    padding: 0 0.3077rem;
    position: relative;
    z-index: 100;
  }
  .logo {
    align-self: center;
    height: 1.6923rem;
    margin: 0 0.7692rem 0 0.4615rem;
    pointer-events: none;
  }
  .menu {
    position: relative;
  }
  .top {
    height: 100%;
    padding: 0 0.7692rem;
    background: none;
    border: none;
    border-radius: 0.3077rem;
  }
  .top:hover,
  .top.active {
    background: var(--panel-2);
  }
  .tools {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.3077rem;
  }
  .tool {
    display: grid;
    place-items: center;
    min-width: 2.1538rem;
    height: 1.8462rem;
    padding: 0 0.3846rem;
    background: none;
    border: 1px solid transparent;
    border-radius: 0.3077rem;
    color: var(--text);
    font-weight: 700;
  }
  .tool:hover:not(:disabled) {
    background: var(--panel-2);
    border-color: var(--border);
  }
  .a-small {
    font-size: 0.9231rem;
  }
  .a-big {
    font-size: 1.3846rem;
  }
  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    min-width: 20rem;
    max-height: calc(100vh - 3.5rem);
    overflow-y: auto;
    padding: 0.3077rem;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
    z-index: 100;
  }
  .item {
    display: grid;
    grid-template-columns: 1.3846rem 1fr auto;
    align-items: center;
    width: 100%;
    gap: 0.4615rem;
    padding: 0.3846rem 0.6154rem;
    text-align: left;
    background: none;
    border: none;
    border-radius: 0.3077rem;
  }
  .item:hover:not(:disabled) {
    background: var(--sel);
    color: #fff;
  }
  .check {
    font-size: 0.9231rem;
  }
  .keys {
    color: var(--muted);
    font-size: 0.9231rem;
  }
  .item:hover:not(:disabled) .keys {
    color: rgb(255 255 255 / 0.8);
  }
  hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 0.3077rem 2px;
  }
</style>
