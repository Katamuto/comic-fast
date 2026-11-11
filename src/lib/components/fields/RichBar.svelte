<script lang="ts">
  /**
   * Formato por partes del texto de un globo o cuadro de texto. Se aplica a la selección del cuadro
   * de texto (la recuerda aunque el foco cambie); sin selección, a todo el texto.
   */
  import { editor } from '../../model/store.svelte';
  import { t } from '../../i18n/index.svelte';
  import { fontFamilies } from '../../render/fonts.svelte';
  import { commonValue } from '../../render/richText';
  import type { BalloonObj, TextObj } from '../../model/types';
  import ColorField from './ColorField.svelte';

  let { o }: { o: BalloonObj | TextObj } = $props();

  const range = $derived.by(() => {
    const s = editor.textSel;
    const len = o.text.length;
    if (s && s.id === o.id && s.to > s.from) return { from: Math.min(s.from, len), to: Math.min(s.to, len), partial: true };
    return { from: 0, to: len, partial: false };
  });
  const val = <K extends 'bold' | 'italic' | 'underline' | 'strike' | 'color' | 'fontFamily'>(k: K) => commonValue(o.spans, o.text.length, o, range.from, range.to, k);

  // El foco debe quedarse en el cuadro de texto: los botones no lo roban.
  const keep = (e: Event) => e.preventDefault();
</script>

<div class="rich" role="group" aria-label={t('rich.title')}>
  <div class="btns">
    <button type="button" class:on={val('bold') === true} title={`${t('insp.bold')} (Ctrl+B)`} onmousedown={keep} onclick={() => editor.formatText({ toggle: 'bold' })}><b>B</b></button>
    <button type="button" class:on={val('italic') === true} title={`${t('insp.italic')} (Ctrl+I)`} onmousedown={keep} onclick={() => editor.formatText({ toggle: 'italic' })}><i>I</i></button>
    <button type="button" class:on={val('underline') === true} title={`${t('rich.underline')} (Ctrl+U)`} onmousedown={keep} onclick={() => editor.formatText({ toggle: 'underline' })}><u>U</u></button>
    <button type="button" class:on={val('strike') === true} title={t('rich.strike')} onmousedown={keep} onclick={() => editor.formatText({ toggle: 'strike' })}><s>S</s></button>
    <button type="button" title={t('rich.clear')} onmousedown={keep} onclick={() => editor.formatText({ clear: true })}>⌫</button>
  </div>
  <ColorField label={t('rich.color')} value={val('color') ?? o.color} onchange={(v) => editor.formatText({ set: { color: v } })} />
  <label class="font">
    <span>{t('insp.font')}</span>
    <select value={val('fontFamily') ?? ''} onchange={(e) => editor.formatText({ set: { fontFamily: e.currentTarget.value || undefined } })}>
      <option value="">{val('fontFamily') === undefined ? t('rich.mixed') : ''}</option>
      {#each fontFamilies() as f}
        <option value={f}>{f}</option>
      {/each}
    </select>
  </label>
  <p class="hint">{range.partial ? t('rich.onSelection') : t('rich.onAll')}</p>
</div>

<style>
  .rich {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .btns {
    display: flex;
    gap: 0.3rem;
  }
  .btns button {
    min-width: 2rem;
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 0.3077rem;
    background: var(--panel-2);
    color: var(--text);
  }
  .btns button.on {
    background: var(--sel);
    color: #fff;
  }
  .font {
    display: grid;
    grid-template-columns: 5rem 1fr;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9231rem;
    color: var(--muted);
  }
  .hint {
    margin: 0;
    font-size: 0.8462rem;
    color: var(--muted);
  }
</style>
