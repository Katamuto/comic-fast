<script lang="ts">
  /** Tamaño de página personalizado: cualquier medida, en px, mm, cm o pulgadas. */
  import { editor } from '../model/store.svelte';
  import {
    clampPagePx,
    COMMON_SIZES,
    formatUnit,
    fromPx,
    MAX_PAGE_PX,
    MIN_PAGE_PX,
    toPx,
    UNITS,
    type Unit
  } from '../model/units';
  import { t } from '../i18n/index.svelte';
  import Dialog from './Dialog.svelte';

  const round = (v: number, u: Unit) => Number(formatUnit(v, u));

  let unit = $state<Unit>('mm');
  let w = $state(round(fromPx(editor.doc.pageW, 'mm'), 'mm'));
  let h = $state(round(fromPx(editor.doc.pageH, 'mm'), 'mm'));
  let lock = $state(false);
  let scaleContent = $state(true);

  const pxW = $derived(clampPagePx(toPx(w, unit)));
  const pxH = $derived(clampPagePx(toPx(h, unit)));
  const valid = $derived(pxW !== null && pxH !== null);
  const clamped = $derived(
    valid && (Math.round(toPx(w, unit)) !== pxW || Math.round(toPx(h, unit)) !== pxH)
  );
  const big = $derived(valid && Math.max(pxW ?? 0, pxH ?? 0) > 3500);

  function setUnit(u: Unit) {
    const cw = toPx(w, unit);
    const ch = toPx(h, unit);
    unit = u;
    w = round(fromPx(cw, u), u);
    h = round(fromPx(ch, u), u);
  }

  function choose(id: string) {
    const s = COMMON_SIZES.find((x) => x.id === id);
    if (!s) return;
    w = round(fromPx(s.w, unit), unit);
    h = round(fromPx(s.h, unit), unit);
  }

  function onW(v: number) {
    const old = w;
    w = v;
    if (lock && old > 0 && Number.isFinite(v)) h = round((h * v) / old, unit);
  }

  function onH(v: number) {
    const old = h;
    h = v;
    if (lock && old > 0 && Number.isFinite(v)) w = round((w * v) / old, unit);
  }

  function apply() {
    if (pxW === null || pxH === null) return;
    editor.setPageSize(pxW, pxH, scaleContent);
    editor.showPageSize = false;
  }
</script>

<Dialog label={t('size.title')} onclose={() => (editor.showPageSize = false)}>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      apply();
    }}
  >
    <h2>{t('size.title')}</h2>
    <p class="hint">{t('size.hint')}</p>

    <label class="block">
      <span>{t('size.common')}</span>
      <select value="" onchange={(e) => choose(e.currentTarget.value)}>
        <option value="" disabled>{t('size.choose')}</option>
        {#each COMMON_SIZES as s}
          <option value={s.id}>{t(`size.${s.id}`, undefined, s.label)}</option>
        {/each}
      </select>
    </label>

    <div class="row">
      <label class="block">
        <span>{t('size.width')}</span>
        <input type="number" step="any" min="0" value={w} oninput={(e) => onW(e.currentTarget.valueAsNumber)} />
      </label>
      <button type="button" class="swap" title={t('size.swap')} onclick={() => ([w, h] = [h, w])}>⇄</button>
      <label class="block">
        <span>{t('size.height')}</span>
        <input type="number" step="any" min="0" value={h} oninput={(e) => onH(e.currentTarget.valueAsNumber)} />
      </label>
      <label class="block unit">
        <span>{t('size.unit')}</span>
        <select value={unit} onchange={(e) => setUnit(e.currentTarget.value as Unit)}>
          {#each UNITS as u}
            <option value={u.id}>{t(`unit.${u.id}`, undefined, u.label)}</option>
          {/each}
        </select>
      </label>
    </div>

    <label class="check"><input type="checkbox" bind:checked={lock} /> {t('size.lock')}</label>
    <label class="check">
      <input type="checkbox" bind:checked={scaleContent} /> {t('size.scaleContent')}
    </label>

    <p class="result" class:warn={!valid || clamped || big}>
      {#if !valid}
        {t('size.invalid')}
      {:else}
        {t('size.result', { w: pxW ?? 0, h: pxH ?? 0 })}
        {#if clamped}
          {t('size.clamped', { min: MIN_PAGE_PX, max: MAX_PAGE_PX })}
        {:else if big}
          {t('size.big')}
        {/if}
      {/if}
    </p>

    <div class="buttons">
      <button type="button" onclick={() => (editor.showPageSize = false)}>{t('dialog.cancel')}</button>
      <button type="submit" class="primary" disabled={!valid}>{t('dialog.apply')}</button>
    </div>
  </form>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.3077rem;
  }
  .hint {
    margin: 0 0 0.9231rem;
    color: var(--muted);
    font-size: 0.9231rem;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 0.2308rem;
    font-size: 0.9231rem;
    color: var(--muted);
    min-width: 0;
    flex: 1;
  }
  .block select,
  .block input {
    width: 100%;
    color: var(--text);
  }
  .row {
    display: flex;
    align-items: flex-end;
    gap: 0.6154rem;
    margin: 0.9231rem 0;
  }
  .unit {
    flex: 1.3;
  }
  .swap {
    padding: 0.2308rem 0.6154rem;
    border: 1px solid var(--border);
    border-radius: 0.3077rem;
    background: var(--panel-2);
  }
  .check {
    display: flex;
    align-items: center;
    gap: 0.4615rem;
    margin: 0.3077rem 0;
    font-size: 0.9231rem;
  }
  .result {
    margin: 0.9231rem 0;
    padding: 0.6154rem 0.7692rem;
    border-radius: 0.4615rem;
    background: var(--panel-2);
    font-size: 0.9231rem;
  }
  .result.warn {
    color: var(--accent);
  }
  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 0.6154rem;
  }
  .buttons button {
    padding: 0.4615rem 1.2308rem;
    border: 1px solid var(--border);
    border-radius: 0.3846rem;
    background: var(--panel-2);
  }
  .buttons .primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 600;
  }
</style>
