<script lang="ts">
  /** Botones para elegir el tamaño de las miniaturas o la vista en lista. */
  import type { ViewPref, ViewMode } from '../app/viewMode.svelte';
  import { t } from '../i18n/index.svelte';
  import Icon from './Icon.svelte';

  let { pref }: { pref: ViewPref } = $props();
  const ICON: Record<ViewMode, string> = { s: 'viewS', m: 'viewM', l: 'viewL', list: 'viewList' };
</script>

<div class="toggle" role="group" aria-label={t('view.mode')}>
  {#each pref.modes as m (m)}
    <button type="button" class:on={pref.value === m} aria-pressed={pref.value === m} title={t(`view.mode.${m}`)} aria-label={t(`view.mode.${m}`)} onclick={() => pref.set(m)}>
      <Icon name={ICON[m]} size={16} />
    </button>
  {/each}
</div>

<style>
  .toggle {
    display: flex;
    gap: 0.2rem;
    justify-content: flex-end;
  }
  button {
    display: grid;
    place-items: center;
    width: 1.9rem;
    height: 1.7rem;
    padding: 0;
    background: none;
    border: 1px solid transparent;
    border-radius: 0.3rem;
    color: var(--muted);
  }
  button:hover {
    color: var(--text);
    background: var(--panel-2);
  }
  button.on {
    color: var(--text);
    background: var(--panel-2);
    border-color: var(--border);
  }
</style>
