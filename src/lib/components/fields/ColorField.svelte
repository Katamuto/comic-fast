<script lang="ts">
  import { t } from '../../i18n/index.svelte';
  import { colorAlpha, colorHex, composeColor } from '../../render/color';

  interface Props {
    label: string;
    /** '#rrggbb', '#rrggbbaa' o 'none'. */
    value: string;
    optional?: boolean;
    /** Muestra el deslizador de transparencia (por defecto sí). */
    alpha?: boolean;
    onchange: (v: string) => void;
  }
  let { label, value, optional = false, alpha = true, onchange }: Props = $props();

  const isNone = $derived(value === 'none');
  const hex = $derived(isNone ? '#ffffff' : colorHex(value));
  const a = $derived(isNone ? 1 : colorAlpha(value));
</script>

<div class="field">
  <span>{label}</span>
  <div class="ctl">
    <input
      type="color"
      value={hex}
      aria-label={label}
      oninput={(e) => onchange(composeColor(e.currentTarget.value, a))}
    />
    {#if alpha}
      <input
        class="alpha"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={a}
        style:--c={hex}
        title={`${t('field.alpha')}: ${Math.round(a * 100)}%`}
        aria-label={`${label} — ${t('field.alpha')}`}
        oninput={(e) => onchange(composeColor(hex, e.currentTarget.valueAsNumber))}
      />
    {/if}
    {#if optional}
      <button type="button" class:on={isNone} onclick={() => onchange(isNone ? '#ffffff' : 'none')}>
        {t('field.none')}
      </button>
    {/if}
  </div>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.9231rem;
    color: var(--muted);
  }
  .ctl {
    display: flex;
    align-items: center;
    gap: 0.3077rem;
  }
  .alpha {
    flex: 1;
    min-width: 3rem;
    max-width: 8rem;
    height: 0.9rem;
    border-radius: 0.3rem;
    appearance: none;
    background:
      linear-gradient(90deg, transparent, var(--c)),
      repeating-conic-gradient(#999 0 25%, #ddd 0 50%) 0 0 / 8px 8px;
    border: 1px solid var(--border);
  }
  .alpha::-webkit-slider-thumb {
    appearance: none;
    width: 0.5rem;
    height: 1.2rem;
    border-radius: 0.2rem;
    background: #fff;
    border: 1px solid #000;
  }
  .alpha::-moz-range-thumb {
    width: 0.5rem;
    height: 1.2rem;
    border-radius: 0.2rem;
    background: #fff;
    border: 1px solid #000;
  }
  button {
    font-size: 0.9231rem;
    padding: 2px 0.4615rem;
    border: 1px solid var(--border);
    border-radius: 0.3077rem;
    background: var(--panel-2);
  }
  button.on {
    background: var(--sel);
    color: #fff;
    border-color: var(--sel);
  }
</style>
