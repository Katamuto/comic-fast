<script lang="ts">
  /** Selector del modo de fusión (cómo se mezcla con lo de debajo). */
  import { t } from '../../i18n/index.svelte';
  import type { BlendMode } from '../../model/types';
  import { BLEND_MODES, isBlendMode } from '../../render/blend';

  interface Props {
    value: BlendMode | undefined;
    onchange: (v: BlendMode) => void;
  }
  let { value, onchange }: Props = $props();

  const current = $derived(isBlendMode(value) ? value : 'normal');
</script>

<label class="block">
  <span>{t('insp.blend')}</span>
  <select value={current} onchange={(e) => onchange(e.currentTarget.value as BlendMode)}>
    {#each BLEND_MODES as m (m)}
      <option value={m}>{t(`blend.${m}`)}</option>
    {/each}
  </select>
</label>

<style>
  .block {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.9231rem;
    color: var(--muted);
  }
  select {
    width: 100%;
    color: var(--text);
  }
</style>
