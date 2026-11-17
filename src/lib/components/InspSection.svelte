<script lang="ts">
  /** Sección plegable y compacta del Inspector. Recuerda si estaba abierta (por id, entre sesiones). */
  import type { Snippet } from 'svelte';
  import { isOpen, setOpen } from '../app/collapse.svelte';

  interface Props {
    id: string;
    title: string;
    open?: boolean;
    children: Snippet;
  }
  let { id, title, open = true, children }: Props = $props();
  const key = $derived(`insp/${id}`);
  const expanded = $derived(isOpen(key, open));
</script>

<section class="isec">
  <button type="button" class="ihead" aria-expanded={expanded} onclick={() => setOpen(key, !expanded)}>
    <span class="chev" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
    <span>{title}</span>
  </button>
  {#if expanded}
    <div class="ibody">{@render children()}</div>
  {/if}
</section>

<style>
  .isec {
    border-top: 1px solid var(--border);
  }
  .ihead {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    width: 100%;
    padding: 0.3846rem 0;
    border: 0;
    background: none;
    color: var(--muted);
    font-size: 0.8462rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-align: left;
    cursor: pointer;
  }
  .ihead:hover {
    color: var(--text);
  }
  .chev {
    width: 0.9rem;
    text-align: center;
  }
  .ibody {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.1rem 0 0.6rem;
  }
</style>
