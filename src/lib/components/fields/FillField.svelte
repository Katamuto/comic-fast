<script lang="ts">
  import { t } from '../../i18n/index.svelte';
  /** Relleno que puede ser un color sólido o un degradado. */
  import type { Fill } from '../../model/types';
  import { DEFAULT_GRADIENT, fillColor, isGradient } from '../../render/paint';
  import ColorField from './ColorField.svelte';
  import GradientEditor from './GradientEditor.svelte';

  interface Props {
    label: string;
    value: Fill;
    onchange: (v: Fill) => void;
    /** Sin puntos ni guías en el lienzo (para el relleno del texto). */
    plain?: boolean;
  }
  let { label, value, onchange, plain = false }: Props = $props();

  const gradient = $derived(isGradient(value) ? value : null);

  function setMode(mode: string) {
    if (mode === 'solid') onchange(fillColor(value));
    else if (!gradient) onchange({ ...DEFAULT_GRADIENT, c1: fillColor(value) });
  }
</script>

<div class="fill">
  <label class="mode">
    <span>{label}</span>
    <select value={gradient ? 'gradient' : 'solid'} onchange={(e) => setMode(e.currentTarget.value)}>
      <option value="solid">{t('insp.color')}</option>
      <option value="gradient">{t('layer.gradient')}</option>
    </select>
  </label>
  {#if gradient}
    <GradientEditor g={gradient} onchange={onchange} {plain} />
  {:else if typeof value === 'string'}
    <ColorField label={t('insp.color')} {value} {onchange} />
  {/if}
</div>

<style>
  .fill {
    display: flex;
    flex-direction: column;
    gap: 0.4615rem;
    grid-column: 1 / -1;
  }
  .mode {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.9231rem;
    color: var(--muted);
  }
  .mode select {
    width: 100%;
    color: var(--text);
  }
</style>
