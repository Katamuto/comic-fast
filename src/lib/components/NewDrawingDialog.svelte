<script lang="ts">
  /** Nuevo dibujo: elige tamaño y fondo y abre el editor de imágenes con un lienzo en blanco. */
  import { editor } from '../model/store.svelte';
  import { imageEditor } from '../app/imageEditor.svelte';
  import { t } from '../i18n/index.svelte';
  import Dialog from './Dialog.svelte';
  import NumberField from './fields/NumberField.svelte';

  const PRESETS = [
    { id: 'square', w: 1024, h: 1024 },
    { id: 'hd', w: 1920, h: 1080 },
    { id: 'tall', w: 1000, h: 1500 }
  ];

  let w = $state(1024);
  let h = $state(1024);
  let bg = $state<'transparent' | 'white' | 'color'>('transparent');
  let color = $state('#ffffff');

  const clampSize = (v: number) => Math.max(16, Math.min(8192, Math.round(v)));

  function close() {
    imageEditor.showNew = false;
  }
  function create() {
    imageEditor.openNew(clampSize(w), clampSize(h), bg === 'transparent' ? 'transparent' : bg === 'white' ? '#ffffff' : color);
  }
</script>

<Dialog onclose={close} label={t('img.newDrawing')} width="30rem">
  <h2>{t('img.newDrawing')}</h2>
  <p>{t('img.new.intro')}</p>

  <div class="presets">
    {#each PRESETS as p (p.id)}
      <button type="button" class:on={w === p.w && h === p.h} onclick={() => ((w = p.w), (h = p.h))}>{t(`img.new.${p.id}`)} · {p.w}×{p.h}</button>
    {/each}
    <button type="button" class:on={w === editor.doc.pageW && h === editor.doc.pageH} onclick={() => ((w = editor.doc.pageW), (h = editor.doc.pageH))}>
      {t('img.new.page')} · {editor.doc.pageW}×{editor.doc.pageH}
    </button>
  </div>

  <div class="grid">
    <NumberField label={t('img.new.width')} value={w} min={16} max={8192} digits={0} onchange={(v) => (w = v)} />
    <NumberField label={t('img.new.height')} value={h} min={16} max={8192} digits={0} onchange={(v) => (h = v)} />
  </div>

  <fieldset>
    <legend>{t('img.new.bg')}</legend>
    <label><input type="radio" bind:group={bg} value="transparent" /> {t('img.new.transparent')}</label>
    <label><input type="radio" bind:group={bg} value="white" /> {t('img.new.white')}</label>
    <label><input type="radio" bind:group={bg} value="color" /> {t('img.new.color')} <input type="color" bind:value={color} onfocus={() => (bg = 'color')} /></label>
  </fieldset>

  <div class="foot">
    <button type="button" onclick={close}>{t('dialog.cancel')}</button>
    <button type="button" class="primary" onclick={create}>{t('img.new.create')}</button>
  </div>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.5rem;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.6rem 0;
  }
  .presets button.on {
    background: var(--sel);
    color: #fff;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
    margin-bottom: 0.8rem;
  }
  fieldset {
    display: grid;
    gap: 0.4rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .foot {
    display: flex;
    gap: 0.6rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }
  .primary {
    font-weight: 700;
    padding: 0.4rem 1rem;
  }
</style>
