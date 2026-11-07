<script lang="ts">
  /** Ventana de progreso de tareas largas (exportar): bloquea la interfaz y muestra una barra. */
  import { editor } from '../model/store.svelte';
  import { t } from '../i18n/index.svelte';

  const p = $derived(editor.progress);
  const pct = $derived(p && p.total > 0 ? Math.min(100, Math.round((p.done / p.total) * 100)) : null);
</script>

{#if p}
  <div class="veil" role="alertdialog" aria-modal="true" aria-live="polite" aria-label={p.label}>
    <div class="box">
      <h2>{p.label}</h2>
      <div class="bar" class:indeterminate={pct === null}>
        <div class="fill" style:width={pct === null ? undefined : `${pct}%`}></div>
      </div>
      <p>{pct === null ? t('progress.working') : `${pct} %`}</p>
      <p class="hint">{t('progress.wait')}</p>
    </div>
  </div>
{/if}

<style>
  .veil {
    position: fixed;
    inset: 0;
    z-index: 600;
    display: grid;
    place-items: center;
    background: rgb(0 0 0 / 0.55);
    cursor: progress;
  }
  .box {
    width: min(26rem, 90vw);
    padding: 1.4rem 1.6rem;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 0.8rem;
    box-shadow: 0 16px 48px rgb(0 0 0 / 0.45);
    text-align: center;
  }
  h2 {
    margin: 0 0 1rem;
    font-size: 1.1rem;
  }
  .bar {
    position: relative;
    height: 0.9rem;
    overflow: hidden;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
  }
  .fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.25s ease;
  }
  .indeterminate .fill {
    width: 35%;
    animation: slide 1.1s ease-in-out infinite alternate;
  }
  @keyframes slide {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(185%);
    }
  }
  p {
    margin: 0.7rem 0 0;
  }
  .hint {
    font-size: 0.85rem;
    color: var(--muted);
  }
  @media (prefers-reduced-motion: reduce) {
    .indeterminate .fill {
      animation: none;
    }
  }
</style>
