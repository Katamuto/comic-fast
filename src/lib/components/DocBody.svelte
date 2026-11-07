<script lang="ts">
  /** Estilo común del texto de la guía y del EULA (HTML ya escapado por markdown.ts). */
  let { html }: { html: string } = $props();
</script>

<div class="doc">{@html html}</div>

<style>
  .doc :global(p) {
    margin: 0.5em 0;
    line-height: 1.55;
  }
  .doc :global(ul),
  .doc :global(ol) {
    margin: 0.4em 0 0.6em;
    padding-left: 1.4em;
    line-height: 1.55;
  }
  .doc :global(h4) {
    margin: 0.9em 0 0.2em;
  }
  .doc :global(code) {
    padding: 0 0.3em;
    border-radius: 0.25em;
    background: var(--hover, #8882);
  }
  .doc :global(a) {
    color: var(--accent, #3b82f6);
  }
</style>
