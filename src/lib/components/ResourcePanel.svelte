<script lang="ts">
  /** En la interfaz móvil el inspector va en su propio panel. */
  let { inspector = true }: { inspector?: boolean } = $props();
  import { editor } from '../model/store.svelte';
  import { t, localName } from '../i18n/index.svelte';
  import { slug } from '../i18n/core';
  import { patternName } from '../render/patternNames.svelte';
  import { importImages } from '../io/fileActions';
  import { dragSource } from '../app/resourceDrag.svelte';
  import { resourceView } from '../app/viewMode.svelte';
  import { imageEditor } from '../app/imageEditor.svelte';
  import ViewToggle from './ViewToggle.svelte';
  import { TABS, type ResourceItem } from '../resources/registry';
  import ResourcePreview from './ResourcePreview.svelte';
  import Inspector from './Inspector.svelte';
  import Collapsible from './Collapsible.svelte';
  import Icon from './Icon.svelte';
  import { contextMenu } from '../app/contextMenu.svelte';
  import { NO_FILTER, filterAssets, isFiltering, type AssetFilter } from '../app/assetFilter';

  const TAB_ICONS: Record<string, string> = {
    images: 'image',
    stock: 'library',
    balloons: 'balloon',
    panels: 'panels',
    patterns: 'dots',
    textures: 'texture',
    gradients: 'gradient',
    text: 'type'
  };
  import { STOCK, STOCK_COUNT } from '../resources/stock';
  import { NEUTRAL_FX } from '../render/imageFx';
  import type { StockItem } from '../resources/stockTree';

  let tabId = $state('images');
  const tab = $derived(TABS.find((x) => x.id === tabId) ?? TABS[0]);
  const allAssets = $derived(Object.values(editor.assets));
  let filter = $state<AssetFilter>({ ...NO_FILTER });
  let showFilters = $state(false);
  const assetList = $derived(filterAssets(allAssets, filter, editor.usedAssets));
  const filtering = $derived(isFiltering(filter));

  const groups = $derived.by(() => {
    const map = new Map<string, ResourceItem[]>();
    for (const item of tab.items) {
      const key = item.group ?? '';
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return [...map.entries()];
  });

  // --- Imágenes incluidas ---
  let query = $state('');
  const q = $derived(query.trim().toLowerCase());
  const matches = (i: StockItem) => q === '' || i.search.includes(q);
  const stockView = $derived(
    STOCK.map((c) => ({
      ...c,
      items: c.items.filter(matches),
      groups: c.groups.map((g) => ({ ...g, items: g.items.filter(matches) })).filter((g) => g.items.length > 0)
    })).filter((c) => c.items.length > 0 || c.groups.length > 0)
  );

  /** Las siluetas «.tint» entran ya teñidas (el color se cambia en Filtros de imagen). */
  const stockFx = (i: StockItem) => (i.tint ? { ...NEUTRAL_FX, tint: '#222222' } : undefined);

  async function useStock(i: StockItem) {
    const a = await editor.assetFromUrl(i.id, i.url, i.name);
    if (a) editor.useAsset(a.id, stockFx(i));
  }

  /** Nombre traducido de un recurso (si no hay clave, se usa el texto original en español). */
  function itemLabel(tid: string, item: ResourceItem): string {
    if (tid === 'patterns' || tid === 'textures') return patternName(item.id.replace(/^(pat|tex)-/, ''));
    if (tid === 'gradients') return t(`gradient.${item.id.replace(/^grad-/, '')}`, undefined, item.label);
    if (tid === 'text' && item.group === 'Onomatopeyas') return item.label;
    return t(`res.${tid}.${item.id}`, undefined, item.label);
  }
  // Nombres de las imágenes incluidas: los de names.json si existen; si no, los de carpeta/archivo.
  const stockLabel = (i: StockItem) => localName(i.names, i.label);
  const catLabel = (c: { names?: Record<string, string>; label: string }) => localName(c.names, c.label);
  const grpLabel = (g: { parts: { names?: Record<string, string>; label: string }[] }) =>
    g.parts.map((p) => localName(p.names, p.label)).join(' › ');
  const groupLabel = (g: string) => t(`res.group.${slug(g)}`, undefined, g);

  const canLayer = $derived(tab.items.some((i) => i.layer));

  function addItem(item: ResourceItem) {
    // Con una viñeta seleccionada, tramas/texturas/degradados entran como capa.
    const s = editor.single;
    if (item.layer && s && s.type === 'panel') {
      editor.addLayer(s.id, item.layer());
      return;
    }
    const { pageW, pageH } = editor.doc;
    editor.addObjects(item.build({ pageW, pageH, cx: pageW / 2, cy: pageH / 2 }));
  }

  /** Clic derecho sobre una imagen importada: quitarla del proyecto. En el resto del panel no hay menú. */
  function assetMenu(e: MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    const kept = !!editor.assets[id]?.keep;
    contextMenu.show(e.clientX, e.clientY, [
      { label: t('img.edit'), run: () => imageEditor.openAsset(id) },
      { label: kept ? t('res.unkeep') : t('res.keep'), run: () => editor.setKeep(id, !kept) },
      '-',
      { label: t('res.remove'), run: () => editor.removeAsset(id) }
    ]);
  }

  function activate(e: KeyboardEvent, fn: () => void) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  }
</script>

{#snippet itemGrid(items: ResourceItem[])}
  <div class="grid">
    {#each items as item (item.id)}
      <div
        class="tile"
        role="button"
        tabindex="0"
        title={itemLabel(tab.id, item)}
        use:dragSource={() => ({ kind: 'item', tab: tab.id, id: item.id })}
        onclick={() => addItem(item)}
        onkeydown={(e) => activate(e, () => addItem(item))}
      >
        <div class="preview"><ResourcePreview {item} /></div>
        <span class="cap">{itemLabel(tab.id, item)}</span>
      </div>
    {/each}
  </div>
{/snippet}

{#snippet stockGrid(items: StockItem[])}
  <div class="grid">
    {#each items as item (item.id)}
      <div
        class="tile"
        role="button"
        tabindex="0"
        title={stockLabel(item)}
        use:dragSource={() => ({ kind: 'stock', id: item.id })}
        onclick={() => void useStock(item)}
        onkeydown={(e) => activate(e, () => void useStock(item))}
      >
        <img class="checker" src={item.url} alt={stockLabel(item)} loading="lazy" draggable="false" />
        <span class="cap">{stockLabel(item)}</span>
      </div>
    {/each}
  </div>
{/snippet}

<aside class="resources" aria-label={t('res.title')}>
  <div class="tabs" role="tablist">
    {#each TABS as x}
      <button
        type="button"
        role="tab"
        aria-selected={x.id === tabId}
        class:active={x.id === tabId}
        title={t(`res.tab.${x.id}`, undefined, x.label)}
        aria-label={t(`res.tab.${x.id}`, undefined, x.label)}
        onclick={() => (tabId = x.id)}
      >
        <Icon name={TAB_ICONS[x.id] ?? 'image'} size={19} />
      </button>
    {/each}
  </div>

  <div class="content" data-view={resourceView.value}>
    <div class="viewbar"><ViewToggle pref={resourceView} /></div>
    {#if tab.kind === 'assets'}
      <button type="button" class="import" onclick={() => importImages()}>{t('res.import')}</button>
      <button type="button" class="import alt" onclick={() => (imageEditor.showNew = true)}>{t('img.newDrawing')}</button>
      {#if allAssets.length === 0}
        <p class="hint">
          {t('res.importHint')}
        </p>
      {:else}
        <div class="filters">
          <button type="button" class="ftoggle" class:on={filtering} aria-expanded={showFilters} onclick={() => (showFilters = !showFilters)}>
            {t('flt.title')}{filtering ? ` (${assetList.length}/${allAssets.length})` : ''}
          </button>
          {#if showFilters}
            <input type="search" class="search" placeholder={t('flt.search')} bind:value={filter.query} />
            <label>{t('flt.use')}
              <select bind:value={filter.use}>
                <option value="all">{t('flt.all')}</option>
                <option value="used">{t('flt.used')}</option>
                <option value="unused">{t('flt.unused')}</option>
              </select>
            </label>
            <label>{t('flt.keep')}
              <select bind:value={filter.keep}>
                <option value="all">{t('flt.all')}</option>
                <option value="kept">{t('flt.kept')}</option>
                <option value="notKept">{t('flt.notKept')}</option>
              </select>
            </label>
            <label>{t('flt.shape')}
              <select bind:value={filter.shape}>
                <option value="all">{t('flt.all')}</option>
                <option value="landscape">{t('flt.landscape')}</option>
                <option value="portrait">{t('flt.portrait')}</option>
                <option value="square">{t('flt.square')}</option>
              </select>
            </label>
            <label>{t('flt.sort')}
              <select bind:value={filter.sort}>
                <option value="import">{t('flt.sortImport')}</option>
                <option value="name">{t('flt.sortName')}</option>
                <option value="size">{t('flt.sortSize')}</option>
              </select>
            </label>
            {#if filtering}
              <button type="button" onclick={() => (filter = { ...NO_FILTER, sort: filter.sort })}>{t('flt.clear')}</button>
            {/if}
          {/if}
        </div>
        {#if assetList.length === 0}<p class="hint">{t('flt.none')}</p>{/if}
      {/if}
      <div class="grid">
        {#each assetList as a (a.id)}
          <div
            class="tile"
            role="button"
            tabindex="0"
            title={a.name}
            use:dragSource={() => ({ kind: 'asset', id: a.id })}
            onclick={() => editor.useAsset(a.id)}
            oncontextmenu={(e) => assetMenu(e, a.id)}
            onkeydown={(e) => activate(e, () => editor.useAsset(a.id))}
          >
            <img src={a.thumbUrl ?? a.viewUrl ?? a.url} alt={a.name} draggable="false" />
            <span class="cap lbl">{a.name}</span>
            {#if a.keep}
              <button type="button" class="unused kept" title={t('res.kept')} aria-label={t('res.unkeep')} onclick={(e) => { e.stopPropagation(); editor.setKeep(a.id, false); }}><Icon name="pinOn" size={13} /></button>
            {:else if !editor.usedAssets.has(a.id)}
              <button type="button" class="unused" title={t('res.unusedKeep')} aria-label={t('res.keep')} onclick={(e) => { e.stopPropagation(); editor.setKeep(a.id, true); }}><Icon name="unused" size={13} /></button>
            {/if}
          </div>
        {/each}
      </div>
    {:else if tab.kind === 'stock'}
      {#if STOCK_COUNT === 0}
        <p class="hint">
          {@html t('res.stockEmpty')}
        </p>
      {:else}
        <input type="search" class="search" placeholder={t('res.search', { n: STOCK_COUNT })} bind:value={query} />
        <p class="hint">{t('res.stockHint')}</p>
        {#each stockView as cat, ci (cat.id)}
          <Collapsible id={`stock/${cat.id}`} title={catLabel(cat)} count={cat.count} open={ci === 0} forceOpen={q !== ''}>
            {#if cat.items.length > 0}
              {@render stockGrid(cat.items)}
            {/if}
            {#each cat.groups as g (g.id)}
              <Collapsible id={`stock/${g.id}`} title={grpLabel(g)} count={g.items.length} level={2} open={true} forceOpen={q !== ''}>
                {@render stockGrid(g.items)}
              </Collapsible>
            {/each}
          </Collapsible>
        {:else}
          <p class="hint">{t('res.noMatch', { q: query })}</p>
        {/each}
      {/if}
    {:else}
      {#if canLayer}
        <p class="hint">
          {t('res.itemHint')}
        </p>
      {/if}
      {#each groups as [group, items] (group)}
        {#if group}
          <Collapsible id={`${tab.id}/${group}`} title={groupLabel(group)} count={items.length}>
            {@render itemGrid(items)}
          </Collapsible>
        {:else}
          {@render itemGrid(items)}
        {/if}
      {/each}
    {/if}
  </div>

  {#if inspector}<Inspector />{/if}
</aside>

<style>
  .filters {
    display: flex;
    flex-direction: column;
    gap: 0.3846rem;
    margin: 0.4rem 0;
  }
  .filters label {
    display: grid;
    grid-template-columns: 6rem 1fr;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9231rem;
    color: var(--muted);
  }
  .ftoggle.on {
    font-weight: 600;
    color: var(--sel);
  }
  .resources {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--panel);
    border-left: 1px solid var(--border);
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
  }
  .tabs button {
    display: grid;
    place-items: center;
    flex: 1 1 auto;
    padding: 0.4615rem 0.5385rem;
    font-size: 0.9231rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--muted);
  }
  .tabs button:hover {
    color: var(--text);
  }
  .tabs button.active {
    color: var(--text);
    border-bottom-color: var(--accent);
    font-weight: 600;
  }
  .content {
    flex: 1;
    min-height: 9.2308rem;
    overflow-y: auto;
    padding: 0.7692rem;
  }
  .import.alt {
    background: var(--panel-2);
    color: var(--text);
    border: 1px solid var(--border);
  }
  .import {
    width: 100%;
    padding: 0.4615rem;
    margin-bottom: 0.6154rem;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 0.3077rem;
    font-weight: 600;
  }
  h4 {
    margin: 0.7692rem 0 0.4615rem;
    font-size: 0.9231rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  h4:first-child {
    margin-top: 0;
  }
  .hint {
    margin: 0 0 0.6154rem;
    font-size: 0.9231rem;
    color: var(--muted);
    line-height: 1.4;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6154rem;
  }
  .tile {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.3077rem;
    padding: 0.3077rem;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: grab;
  }
  /* Indicador de imagen importada que no se usa en el cómic. */
  .unused {
    position: absolute;
    top: 0.6rem;
    right: 0.6rem;
    display: grid;
    place-items: center;
    width: 1.4rem;
    height: 1.4rem;
    border-radius: 50%;
    background: rgb(0 0 0 / 0.6);
    color: #ffd54f;
    pointer-events: auto;
    padding: 0;
    border: 0;
    cursor: pointer;
  }
  .unused.kept {
    color: #fff;
    background: var(--sel);
  }
  .lbl {
    display: none;
  }
  .viewbar {
    margin: -0.3rem 0 0.4rem;
  }
  /* Tamaños de miniatura y vista en lista. */
  .content[data-view='s'] .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
  }
  .content[data-view='s'] .preview {
    height: 3.4rem;
    padding: 0.15rem;
  }
  .content[data-view='s'] .tile img {
    height: 3.9rem;
  }
  .content[data-view='s'] .cap {
    display: none;
  }
  .content[data-view='s'] .unused {
    top: 0.45rem;
    right: 0.45rem;
    width: 1.2rem;
    height: 1.2rem;
  }
  .content[data-view='l'] .grid {
    grid-template-columns: 1fr;
  }
  .content[data-view='l'] .preview {
    height: 11rem;
  }
  .content[data-view='l'] .tile img {
    height: 12rem;
  }
  .content[data-view='l'] .lbl {
    display: block;
  }
  .content[data-view='list'] .grid {
    grid-template-columns: 1fr;
    gap: 0.3rem;
  }
  .content[data-view='list'] .tile {
    flex-direction: row;
    align-items: center;
    gap: 0.6rem;
  }
  .content[data-view='list'] .preview {
    flex: none;
    width: 3.6rem;
    height: 2.7rem;
    padding: 0.15rem;
  }
  .content[data-view='list'] .tile img {
    flex: none;
    width: 3.6rem;
    height: 2.7rem;
  }
  .content[data-view='list'] .cap {
    flex: 1;
    min-width: 0;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .content[data-view='list'] .lbl {
    display: block;
  }
  .content[data-view='list'] .unused {
    top: 50%;
    right: 0.6rem;
    transform: translateY(-50%);
  }
  .tile:hover {
    border-color: var(--sel);
  }
  .preview {
    height: 5.8462rem;
    background: var(--tile);
    border-radius: 0.3077rem;
    padding: 0.3077rem;
  }
  .tile img {
    width: 100%;
    height: 6.9231rem;
    object-fit: contain;
    border-radius: 0.3077rem;
    background: var(--tile);
  }
  /* Damero: deja ver la transparencia de PNG y SVG. */
  .tile img.checker {
    background-color: var(--tile);
    background-image:
      linear-gradient(45deg, rgb(128 128 128 / 0.18) 25%, transparent 25%, transparent 75%, rgb(128 128 128 / 0.18) 75%),
      linear-gradient(45deg, rgb(128 128 128 / 0.18) 25%, transparent 25%, transparent 75%, rgb(128 128 128 / 0.18) 75%);
    background-size: 12px 12px;
    background-position: 0 0, 6px 6px;
  }
  .search {
    width: 100%;
    margin-bottom: 0.6154rem;
  }
  .cap {
    font-size: 0.9231rem;
    text-align: center;
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
