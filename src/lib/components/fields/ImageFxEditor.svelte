<script lang="ts">
  import { t } from '../../i18n/index.svelte';
  /** Filtros de una imagen: ajustes rápidos y deslizadores. Vale para imágenes sueltas y capas de viñeta. */
  import type { ImageFx } from '../../model/types';
  import { FX_PRESETS, fxOf, hasFx } from '../../render/imageFx';
  import RangeField from './RangeField.svelte';
  import ColorField from './ColorField.svelte';

  interface Props {
    fx: ImageFx | undefined;
    /** `undefined` = sin filtros. */
    onchange: (fx: ImageFx | undefined) => void;
  }
  let { fx, onchange }: Props = $props();

  const f = $derived(fxOf(fx));

  function change(p: Partial<ImageFx>) {
    const next = { ...f, ...p };
    onchange(hasFx(next) ? next : undefined);
  }
</script>

<details class="fx" open={hasFx(fx)}>
  <summary>{t('fx.title')}{hasFx(fx) ? ' ●' : ''}</summary>
  <div class="body">
    <div class="presets">
      {#each FX_PRESETS as p (p.id)}
        <button type="button" onclick={() => onchange(p.id === 'none' ? undefined : { ...fxOf(p.fx) })}>{t(`fx.preset.${p.id}`, undefined, p.label)}</button>
      {/each}
    </div>
    <RangeField label={t('fx.brightness')} value={f.brightness} min={-100} max={100} step={1} onchange={(v) => change({ brightness: v })} />
    <RangeField label={t('fx.contrast')} value={f.contrast} min={-100} max={100} step={1} onchange={(v) => change({ contrast: v })} />
    <RangeField label={t('fx.saturation')} value={f.saturation} min={-100} max={100} step={1} onchange={(v) => change({ saturation: v })} />
    <RangeField label={t('fx.hue')} value={f.hue} min={-180} max={180} step={1} onchange={(v) => change({ hue: v })} />
    <RangeField label={t('fx.sepia')} value={f.sepia} min={0} max={100} step={1} onchange={(v) => change({ sepia: v })} />
    <RangeField label={t('fx.blur')} value={f.blur} min={0} max={30} step={0.5} onchange={(v) => change({ blur: v })} />
    <label class="check">
      <input type="checkbox" checked={f.invert} onchange={(e) => change({ invert: e.currentTarget.checked })} /> {t('fx.invert')}
    </label>
    <ColorField
      label={t('fx.tint')}
      value={f.tint ?? 'none'}
      optional
      onchange={(v) => change({ tint: v === 'none' ? null : v })}
    />
    <p class="hint">{t('fx.tintHint')}</p>
  </div>
</details>

<style>
  .fx {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.3077rem 0.6154rem;
  }
  summary {
    cursor: pointer;
    font-weight: 600;
    padding: 0.2308rem 0;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 0.4615rem;
    padding: 0.3077rem 0 0.4615rem;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3077rem;
  }
  .presets button {
    padding: 0.1538rem 0.5385rem;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 0.3077rem;
    font-size: 0.9231rem;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 0.3846rem;
  }
  .hint {
    margin: 0;
    font-size: 0.9231rem;
    color: var(--muted);
  }
</style>
