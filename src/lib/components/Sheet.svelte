<script lang="ts">
  /**
   * Panel inferior de la interfaz móvil (a la derecha si el teléfono está en horizontal).
   * No tapa el lienzo: ocupa su propio espacio, así se puede seguir tocando la página.
   */
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import { t } from '../i18n/index.svelte';

  interface Props {
    title: string;
    onclose: () => void;
    /** Teléfono en vertical: altura justa (p. ej. el carrusel de páginas). */
    compact?: boolean;
    /** Botones extra junto al título. */
    actions?: Snippet;
    children: Snippet;
  }
  let { title, onclose, compact = false, actions, children }: Props = $props();
</script>

<section class="sheet" class:compact aria-label={title}>
  <header>
    <h2>{title}</h2>
    <div class="acts">{#if actions}{@render actions()}{/if}</div>
    <button type="button" class="x" aria-label={t('m.close')} onclick={onclose}><Icon name="close" size={20} /></button>
  </header>
  <div class="body">{@render children()}</div>
</section>

<style>
  .sheet {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 46dvh;
    background: var(--panel);
    border-top: 1px solid var(--border);
  }
  header {
    flex: none;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0 0.3rem 0 0.8rem;
    border-bottom: 1px solid var(--border);
  }
  h2 {
    flex: 1;
    margin: 0;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .acts {
    display: flex;
    gap: 0.2rem;
  }
  .sheet :global(button.sb),
  .x {
    display: grid;
    place-items: center;
    min-width: 2.8rem;
    height: 2.8rem;
    padding: 0 0.4rem;
    background: none;
    border: 0;
    border-radius: 0.4rem;
    color: var(--text);
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  /* Los paneles de escritorio reutilizados ocupan todo el cuerpo y no llevan borde lateral. */
  .body :global(.pagelist),
  .body :global(.resources) {
    flex: 1;
    min-height: 0;
    border: 0;
  }
  .body :global(.inspector) {
    flex: 1;
    max-height: none;
    border-top: 0;
    overflow-y: auto;
  }
  @media (orientation: portrait) {
    .sheet.compact {
      height: auto;
    }
    .sheet.compact .body {
      flex: none;
    }
  }
  @media (orientation: landscape) {
    .sheet {
      height: auto;
      width: min(24rem, 48vw);
      border-top: 0;
      border-left: 1px solid var(--border);
    }
  }
</style>
