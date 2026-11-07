<script lang="ts">
  /** Parámetros globales: mandan sobre el valor de cada elemento (sin modificarlo). */
  import { editor } from '../model/store.svelte';
  import { t } from '../i18n/index.svelte';
  import Dialog from './Dialog.svelte';
  import NumberField from './fields/NumberField.svelte';

  const g = $derived(editor.doc.globals ?? {});

  function close() {
    editor.showGlobals = false;
  }

  /** Valor de partida al activar un parámetro: el del primer elemento pertinente, o uno razonable. */
  function firstOf(types: string[], key: string, fallback: number): number {
    for (const p of editor.doc.pages) {
      for (const o of p.objects) {
        const v = (o as unknown as Record<string, unknown>)[key];
        if (types.includes(o.type) && typeof v === 'number') return v;
      }
    }
    return fallback;
  }

  function toggleText(on: boolean) {
    if (on) editor.setGlobals({ textSize: firstOf(['balloon', 'text'], 'fontSize', 28) });
    else editor.setGlobals({ textSize: undefined, forceText: undefined });
  }
  function togglePanel(on: boolean) {
    editor.setGlobals({ panelStroke: on ? firstOf(['panel'], 'strokeWidth', 4) : undefined });
  }
  function toggleBalloon(on: boolean) {
    editor.setGlobals({ balloonStroke: on ? firstOf(['balloon'], 'strokeWidth', 3) : undefined });
  }
</script>

<Dialog onclose={close} label={t('globals.title')} width="34rem">
  <h2>{t('globals.title')}</h2>
  <p>{t('globals.intro')}</p>

  <div class="row">
    <label class="on"><input type="checkbox" checked={g.textSize !== undefined} onchange={(e) => toggleText(e.currentTarget.checked)} /> {t('globals.textSize')}</label>
    {#if g.textSize !== undefined}
      <NumberField label={t('globals.px')} value={g.textSize} min={6} onchange={(v) => editor.setGlobals({ textSize: Math.max(6, v) })} />
    {/if}
  </div>
  {#if g.textSize !== undefined}
    <label class="sub">
      <input type="checkbox" checked={!!g.forceText} onchange={(e) => editor.setGlobals({ forceText: e.currentTarget.checked || undefined })} />
      <span>{t('globals.force')}</span>
    </label>
    <p class="hint">{t('globals.forceHint')}</p>
  {/if}

  <div class="row">
    <label class="on"><input type="checkbox" checked={g.panelStroke !== undefined} onchange={(e) => togglePanel(e.currentTarget.checked)} /> {t('globals.panelStroke')}</label>
    {#if g.panelStroke !== undefined}
      <NumberField label={t('globals.px')} value={g.panelStroke} min={0} onchange={(v) => editor.setGlobals({ panelStroke: Math.max(0, v) })} />
    {/if}
  </div>

  <div class="row">
    <label class="on"><input type="checkbox" checked={g.balloonStroke !== undefined} onchange={(e) => toggleBalloon(e.currentTarget.checked)} /> {t('globals.balloonStroke')}</label>
    {#if g.balloonStroke !== undefined}
      <NumberField label={t('globals.px')} value={g.balloonStroke} min={0} onchange={(v) => editor.setGlobals({ balloonStroke: Math.max(0, v) })} />
    {/if}
  </div>

  <div class="foot"><button type="button" onclick={close}>{t('dialog.close')}</button></div>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.5rem;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 7rem;
    align-items: center;
    gap: 0.8rem;
    padding: 0.5rem 0.2rem;
    border-bottom: 1px solid var(--border);
  }
  .on {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-weight: 600;
  }
  .sub {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin: 0.4rem 0 0 1.4rem;
  }
  .hint {
    margin: 0.2rem 0 0.4rem 1.4rem;
    color: var(--muted);
    font-size: 0.85em;
  }
  .foot {
    margin-top: 1rem;
    text-align: right;
  }
</style>
