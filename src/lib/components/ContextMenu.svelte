<script lang="ts">
  /**
   * Menú del clic derecho (las entradas las decide cada zona; ver app/contextMenu.svelte.ts).
   * Sustituye al menú del navegador, que ofrecía cosas que no tienen sentido aquí.
   */
  import { tick } from 'svelte';
  import { contextMenu, type MenuEntry } from '../app/contextMenu.svelte';
  import { t } from '../i18n/index.svelte';

  let box = $state<HTMLDivElement | null>(null);
  // null = aún sin medir: se muestra en el punto del clic y se ajusta enseguida.
  let left = $state<number | null>(null);
  let top = $state<number | null>(null);

  // Al abrir: se coloca en el clic, sin salirse de la ventana, y el foco pasa al menú.
  $effect(() => {
    if (!contextMenu.open) {
      left = null;
      top = null;
      return;
    }
    if (!box) return;
    const { x, y } = contextMenu;
    const el = box;
    void tick().then(() => {
      const r = el.getBoundingClientRect();
      left = Math.max(4, Math.min(x, window.innerWidth - r.width - 4));
      top = Math.max(4, Math.min(y, window.innerHeight - r.height - 4));
      el.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    });
  });

  function run(e: Exclude<MenuEntry, '-'>) {
    contextMenu.close();
    if (e.enabled ?? true) e.run();
  }

  function onWindowPointerDown(e: PointerEvent) {
    if (contextMenu.open && !(e.target as Element).closest('.ctx')) contextMenu.close();
  }

  function onWindowKeyDown(e: KeyboardEvent) {
    if (!contextMenu.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      contextMenu.close();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && box) {
      e.preventDefault();
      const items = Array.from(box.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      if (items.length === 0) return;
      const i = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1);
      items[next].focus();
    }
  }
</script>

<svelte:window
  onpointerdown={onWindowPointerDown}
  onkeydown={onWindowKeyDown}
  onblur={() => contextMenu.close()}
  onresize={() => contextMenu.close()}
/>

{#if contextMenu.open}
  <div class="ctx" role="menu" aria-label={t('ctx.label')} bind:this={box} style:left="{left ?? contextMenu.x}px" style:top="{top ?? contextMenu.y}px">
    {#each contextMenu.entries as e}
      {#if e === '-'}
        <hr />
      {:else}
        <button type="button" class="item" role="menuitem" disabled={!(e.enabled ?? true)} onclick={() => run(e)}>
          <span class="label">{e.label}</span>
          <span class="keys">{e.keys ?? ''}</span>
        </button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .ctx {
    position: fixed;
    z-index: 300;
    min-width: 13rem;
    padding: 0.3077rem;
    background: var(--panel);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.3);
  }
  .item {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    width: 100%;
    gap: 1.2rem;
    padding: 0.3846rem 0.6154rem;
    text-align: left;
    background: none;
    border: none;
    border-radius: 0.3077rem;
    color: inherit;
    font: inherit;
  }
  .item:hover:not(:disabled),
  .item:focus-visible:not(:disabled) {
    background: var(--sel);
    color: #fff;
    outline: none;
  }
  .item:disabled {
    opacity: 0.45;
  }
  .keys {
    color: var(--muted);
    font-size: 0.9231rem;
  }
  .item:hover:not(:disabled) .keys,
  .item:focus-visible:not(:disabled) .keys {
    color: rgb(255 255 255 / 0.8);
  }
  hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 0.3077rem 2px;
  }
</style>
