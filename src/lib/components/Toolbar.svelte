<script lang="ts">
  import { t } from '../i18n/index.svelte';
  /** Barra lateral de herramientas: atajos a las acciones más usadas (las mismas del menú). */
  import { actionMap, formatKeys, labelOf } from '../app/actions';
  import Icon from './Icon.svelte';

  /** [id de acción, icono]. Un `null` separa grupos. */
  const TOOLS: ([string, string] | null)[] = [
    ['view.styleMode', 'style'],
    null,
    ['edit.undo', 'undo'],
    ['edit.redo', 'redo'],
    null,
    ['edit.front', 'front'],
    ['edit.forward', 'forward'],
    ['edit.backward', 'backward'],
    ['edit.back', 'back'],
    null,
    ['edit.duplicate', 'duplicate'],
    ['edit.delete', 'trash'],
    ['edit.lock', 'lock'],
    null,
    ['edit.layerMode', 'image'],
    ['panel.toPolygon', 'polygon'],
    ['panel.cut', 'cut'],
    ['panel.union', 'union'],
    ['edit.linkTail', 'link'],
    ['edit.linkMerge', 'merge'],
    ['edit.unlink', 'unlink'],
    null,
    ['view.zoomIn', 'zoomIn'],
    ['view.zoomOut', 'zoomOut'],
    ['view.fit', 'fit'],
    null,
    ['view.grid', 'grid'],
    ['view.snap', 'snap']
  ];

  /** Interfaz móvil: botones grandes, en fila (o en columna si el teléfono está en horizontal). */
  let { mobile = false }: { mobile?: boolean } = $props();

  function tip(id: string): string {
    const a = actionMap.get(id);
    if (!a) return '';
    const k = formatKeys(a.keys?.[0]);
    return k ? `${labelOf(a)} (${k})` : labelOf(a);
  }
</script>

<div class="toolbar" class:m={mobile} role="toolbar" aria-label={t('toolbar.tools')} aria-orientation={mobile ? undefined : 'vertical'}>
  {#each TOOLS as tool}
    {#if tool === null}
      <hr />
    {:else}
      {@const a = actionMap.get(tool[0])}
      {#if a}
        <button
          type="button"
          class:on={a.checked?.() ?? false}
          title={tip(tool[0])}
          aria-label={labelOf(a)}
          disabled={!(a.enabled?.() ?? true)}
          onclick={() => void a.run()}
        >
          <Icon name={tool[0] === 'edit.lock' && a.checked?.() ? 'unlock' : tool[1]} />
        </button>
      {/if}
    {/if}
  {/each}
</div>

<style>
  .toolbar {
    flex: none;
    width: 3.3846rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3077rem;
    padding: 0.6154rem 0;
    overflow-y: auto;
    background: var(--panel);
    border-right: 1px solid var(--border);
  }
  button {
    display: grid;
    place-items: center;
    width: 2.4615rem;
    height: 2.4615rem;
    padding: 0;
    background: none;
    border: 1px solid transparent;
    border-radius: 0.4615rem;
    color: var(--text);
  }
  button:hover:not(:disabled) {
    background: var(--panel-2);
    border-color: var(--border);
  }
  button.on {
    background: var(--sel);
    border-color: var(--sel);
    color: #fff;
  }
  hr {
    width: 1.8462rem;
    margin: 0.3077rem 0;
    border: none;
    border-top: 1px solid var(--border);
  }

  /* Móvil: fila con desplazamiento horizontal; en horizontal (apaisado) pasa a columna. */
  .toolbar.m {
    width: auto;
    flex-direction: row;
    overflow: auto hidden;
    padding: 0.3rem 0.5rem;
    gap: 0.2rem;
    border-right: 0;
    border-top: 1px solid var(--border);
    scrollbar-width: none;
  }
  .toolbar.m button {
    flex: none;
    width: 3rem;
    height: 3rem;
  }
  .toolbar.m hr {
    flex: none;
    width: 0;
    height: 1.8rem;
    margin: 0 0.3rem;
    border-top: 0;
    border-left: 1px solid var(--border);
  }
  @media (orientation: landscape) {
    .toolbar.m {
      flex-direction: column;
      overflow: hidden auto;
      padding: 0.4rem 0.3rem;
      border-top: 0;
      border-right: 1px solid var(--border);
    }
    .toolbar.m button {
      width: 2.8rem;
      height: 2.8rem;
    }
    .toolbar.m hr {
      width: 1.8rem;
      height: 0;
      margin: 0.3rem 0;
      border-left: 0;
      border-top: 1px solid var(--border);
    }
  }
</style>
