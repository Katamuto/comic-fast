<script lang="ts">
  /** Ventana modal sencilla: fondo oscuro, Esc o clic fuera cierran. */
  import type { Snippet } from 'svelte';

  interface Props {
    onclose: () => void;
    /** Nombre accesible del diálogo. */
    label: string;
    width?: string;
    children: Snippet;
  }
  let { onclose, label, width = '34rem', children }: Props = $props();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onclose}>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <div class="dialog" role="dialog" aria-modal="true" aria-label={label} tabindex="-1" style:width="min({width}, 92vw)" onclick={(e) => e.stopPropagation()}>
    {@render children()}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgb(0 0 0 / 0.45);
    z-index: 200;
  }
  .dialog {
    max-height: 92vh;
    max-height: 92dvh;
    overflow-y: auto;
    padding: 1.5385rem 1.8462rem;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 0.7692rem;
    box-shadow: 0 16px 48px rgb(0 0 0 / 0.4);
    user-select: text;
  }
</style>
