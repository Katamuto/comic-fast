<script lang="ts">
  /** Sección plegable del panel de recursos. Recuerda si estaba abierta. */
  import type { Snippet } from 'svelte';
  import { isOpen, setOpen } from '../app/collapse.svelte';

  interface Props {
    /** Clave única para recordar el estado. */
    id: string;
    title: string;
    count?: number;
    /** Abierta por defecto (si la persona no la ha tocado). */
    open?: boolean;
    /** Forzar abierta (p. ej. mientras se busca). */
    forceOpen?: boolean;
    /** 1 = categoría, 2 = subcategoría. */
    level?: 1 | 2;
    children: Snippet;
  }
  let { id, title, count, open = true, forceOpen = false, level = 1, children }: Props = $props();

  const expanded = $derived(forceOpen || isOpen(id, open));
</script>

<section class="sec" class:sub={level === 2}>
  <button type="button" class="head" aria-expanded={expanded} onclick={() => setOpen(id, !expanded)}>
    <span class="chev" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
    <span class="title">{title}</span>
    {#if count !== undefined}<span class="count">{count}</span>{/if}
  </button>
  {#if expanded}
    <div class="body">{@render children()}</div>
  {/if}
</section>

<style>
  .sec {
    margin-bottom: 0.4615rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--panel);
  }
  .sec.sub {
    margin: 0.3846rem 0 0;
    border-color: transparent;
    background: none;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 0.4615rem;
    width: 100%;
    padding: 0.4615rem 0.6154rem;
    text-align: left;
    background: var(--panel-2);
    border: none;
    border-radius: var(--radius);
    font-weight: 600;
  }
  .sub .head {
    padding: 0.2308rem 0.4615rem;
    background: none;
    font-weight: 500;
    color: var(--muted);
  }
  .head:hover {
    filter: brightness(0.96);
  }
  .chev {
    width: 1em;
    flex: none;
  }
  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .count {
    font-size: 0.9231rem;
    font-weight: 400;
    color: var(--muted);
  }
  .body {
    padding: 0.4615rem;
  }
  .sub .body {
    padding: 0.3077rem 0 0.3077rem 0.6154rem;
  }
</style>
