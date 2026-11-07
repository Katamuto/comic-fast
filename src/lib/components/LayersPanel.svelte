<script lang="ts">
  /** Capas de la viñeta seleccionada: lista, orden y propiedades de la capa activa. */
  import { editor } from '../model/store.svelte';
  import { t } from '../i18n/index.svelte';
  import { type PanelLayer, type PanelObj } from '../model/types';
  import { containScale, coverScale } from '../model/panelGeometry';
  import { gradientLayer, patternLayer } from '../model/defaults';
  import ImageFxEditor from './fields/ImageFxEditor.svelte';
  import { imageEditor } from '../app/imageEditor.svelte';
  import { listPatterns, listTextures, needsRegion, usesSeed } from '../render/patterns';
  import { patternName } from '../render/patternNames.svelte';
  import { importImageInto } from '../io/fileActions';
  import NumberField from './fields/NumberField.svelte';
  import ColorField from './fields/ColorField.svelte';
  import RangeField from './fields/RangeField.svelte';
  import BlendField from './fields/BlendField.svelte';
  import GradientEditor from './fields/GradientEditor.svelte';

  let { panel }: { panel: PanelObj } = $props();

  const active = $derived(editor.activeLayer);
  /** De arriba hacia abajo, como en cualquier editor. */
  const rows = $derived([...panel.layers].reverse());

  function nameOf(l: PanelLayer): string {
    if (l.type === 'image') return editor.assets[l.assetId]?.name ?? t('layer.image');
    if (l.type === 'pattern') return patternName(l.kind);
    return t('layer.gradient');
  }

  function upd(p: Record<string, unknown>, field: string) {
    if (active) editor.updateLayer(panel.id, active.id, p, field);
  }
</script>

<div class="layers">
  <h4>{t('layer.title', { n: panel.layers.length })}</h4>

  <div class="add">
    <button type="button" onclick={() => importImageInto(panel.id)}>{t('layer.addImage')}</button>
    <button type="button" onclick={() => editor.addLayer(panel.id, patternLayer())}>{t('layer.addPattern')}</button>
    <button type="button" onclick={() => editor.addLayer(panel.id, patternLayer({ kind: 'grain' }))}>{t('layer.addTexture')}</button>
    <button type="button" onclick={() => editor.addLayer(panel.id, gradientLayer())}>{t('layer.addGradient')}</button>
  </div>

  {#if rows.length === 0}
    <p class="hint">{t('layer.empty')}</p>
  {/if}

  <ul>
    {#each rows as l (l.id)}
      <li class:on={active?.id === l.id}>
        <button type="button" class="name" onclick={() => (editor.activeLayerId = l.id)} title={nameOf(l)}>
          <b>{t(`layer.${l.type}`)}</b> {nameOf(l)}
        </button>
        <button type="button" title={t('layer.up')} onclick={() => editor.moveLayer(panel.id, l.id, 1)}>↑</button>
        <button type="button" title={t('layer.down')} onclick={() => editor.moveLayer(panel.id, l.id, -1)}>↓</button>
        <button type="button" title={t('layer.remove')} onclick={() => editor.removeLayer(panel.id, l.id)}>✕</button>
      </li>
    {/each}
  </ul>

  {#if active}
    <div class="props">
      {#if active.type === 'image'}
        {@const asset = editor.assets[active.assetId]}
        {#if asset}
          {@const cover = coverScale(asset.w, asset.h, panel.w, panel.h)}
          <RangeField
            label={t('layer.sizeCover')}
            value={active.scale / cover}
            min={0.1}
            max={4}
            onchange={(v) => upd({ scale: cover * v }, 'scale')}
          />
          <div class="grid3">
            <NumberField label="X" value={active.x} onchange={(v) => upd({ x: v }, 'x')} />
            <NumberField label="Y" value={active.y} onchange={(v) => upd({ y: v }, 'y')} />
            <NumberField label={t('insp.rotation')} value={active.rotation} onchange={(v) => upd({ rotation: v }, 'rot')} />
          </div>
          <div class="buttons">
            <button type="button" onclick={() => upd({ scale: cover, x: 0, y: 0 }, 'fit')}>{t('layer.cover')}</button>
            <button
              type="button"
              onclick={() => upd({ scale: containScale(asset.w, asset.h, panel.w, panel.h), x: 0, y: 0 }, 'fit')}
            >
              {t('layer.contain')}
            </button>
            <button type="button" onclick={() => upd({ rotation: 0 }, 'rot')}>{t('layer.straighten')}</button>
            <button type="button" class:toggle={editor.layerMode} onclick={() => (editor.layerMode = !editor.layerMode)}>
              {t('layer.editOnCanvas')}
            </button>
          </div>
          <div class="buttons">
            <button type="button" class:toggle={active.flipH} onclick={() => editor.flip('h')}>{t('act.edit.flipH')}</button>
            <button type="button" class:toggle={active.flipV} onclick={() => editor.flip('v')}>{t('act.edit.flipV')}</button>
          </div>
          <button type="button" onclick={() => imageEditor.openCurrent()}>{t('img.edit')}</button>
          <ImageFxEditor fx={active.fx} onchange={(fx) => upd({ fx }, 'fx')} />
        {/if}
      {:else if active.type === 'pattern'}
        <label class="block">
          <span>{t('insp.kind')}</span>
          <select value={active.kind} onchange={(e) => upd({ kind: e.currentTarget.value }, 'kind')}>
            <optgroup label={t('res.tab.patterns')}>
              {#each listPatterns() as p (p.kind)}<option value={p.kind}>{patternName(p.kind)}</option>{/each}
            </optgroup>
            <optgroup label={t('res.tab.textures')}>
              {#each listTextures() as p (p.kind)}<option value={p.kind}>{patternName(p.kind)}</option>{/each}
            </optgroup>
          </select>
        </label>
        <div class="grid2">
          <ColorField label={t('insp.color')} value={active.color} onchange={(v) => upd({ color: v }, 'color')} />
          <ColorField label={t('insp.fill')} value={active.bg} optional onchange={(v) => upd({ bg: v }, 'bg')} />
        </div>
        <RangeField label={t('insp.scale')} value={active.scale} min={0.2} max={8} onchange={(v) => upd({ scale: v }, 'scale')} />
        {#if needsRegion(active.kind)}
          <div class="grid3">
            <NumberField label="X" value={active.x} onchange={(v) => upd({ x: v }, 'x')} />
            <NumberField label="Y" value={active.y} onchange={(v) => upd({ y: v }, 'y')} />
            <NumberField label={t('insp.rotation')} value={active.rotation} onchange={(v) => upd({ rotation: v }, 'rot')} />
          </div>
          <div class="buttons">
            <button type="button" onclick={() => upd({ rotation: 0, x: 0, y: 0 }, 'rot')}>{t('layer.centerStraighten')}</button>
            <button type="button" class:toggle={editor.layerMode} onclick={() => (editor.layerMode = !editor.layerMode)}>
              {t('layer.rotScaleOnCanvas')}
            </button>
          </div>
          <p class="hint">{t('layer.patternHint')}</p>
        {/if}
        {#if usesSeed(active.kind)}
          <RangeField label={t('insp.amount')} value={active.amount ?? 0.5} min={0} max={1} onchange={(v) => upd({ amount: v }, 'amount')} />
          <div class="buttons">
            <button type="button" onclick={() => upd({ seed: (active.seed ?? 0) + 1 }, 'seed')}>{t('insp.vary')}</button>
          </div>
        {/if}
      {:else}
        <GradientEditor g={active.gradient} onchange={(g) => upd({ gradient: g }, 'gradient')} />
      {/if}
      <RangeField label={t('insp.opacity')} value={active.opacity} min={0} max={1} onchange={(v) => upd({ opacity: v }, 'opacity')} />
      <BlendField value={active.blend} onchange={(v) => upd({ blend: v }, 'blend')} />
    </div>
  {/if}
</div>

<style>
  .layers {
    display: flex;
    flex-direction: column;
    gap: 0.4615rem;
  }
  h4 {
    margin: 0.3077rem 0 0;
    font-size: 0.9231rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .add {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.3077rem;
  }
  button {
    padding: 0.2308rem 0.6154rem;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 0.3077rem;
    font-size: 0.9231rem;
  }
  button.toggle {
    background: var(--sel);
    border-color: var(--sel);
    color: #fff;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2308rem;
  }
  li {
    display: flex;
    gap: 0.2308rem;
    align-items: stretch;
  }
  li .name {
    flex: 1;
    min-width: 0;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  li.on .name {
    border-color: var(--sel);
    box-shadow: inset 0 0 0 1px var(--sel);
  }
  li .name b {
    color: var(--muted);
    font-weight: 600;
    margin-right: 0.3077rem;
  }
  .props {
    display: flex;
    flex-direction: column;
    gap: 0.6154rem;
    padding: 0.6154rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6154rem;
  }
  .grid3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.3077rem;
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3077rem;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.9231rem;
    color: var(--muted);
  }
  .block select {
    color: var(--text);
    width: 100%;
  }
  .hint {
    margin: 0;
    font-size: 0.9231rem;
    color: var(--muted);
    line-height: 1.4;
  }
</style>
