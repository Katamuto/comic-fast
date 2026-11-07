<script lang="ts">
  import { editor } from '../model/store.svelte';
  import { type PanelShape } from '../model/types';
  import { scaleLayers } from '../model/geometry';
  import { pageInfo } from '../model/style';
  import { fontFamilies } from '../render/fonts.svelte';
  import { imageEditor } from '../app/imageEditor.svelte';
  import { importImageInto } from '../io/fileActions';
  import NumberField from './fields/NumberField.svelte';
  import ColorField from './fields/ColorField.svelte';
  import BlendField from './fields/BlendField.svelte';
  import RangeField from './fields/RangeField.svelte';
  import FillField from './fields/FillField.svelte';
  import { t, i18n, LANGUAGES } from '../i18n/index.svelte';
  import LayersPanel from './LayersPanel.svelte';
  import ImageFxEditor from './fields/ImageFxEditor.svelte';
  import { listPatterns, listTextures, usesSeed } from '../render/patterns';
  import { TAIL_STYLES } from '../render/balloon';
  import { patternName } from '../render/patternNames.svelte';

  const o = $derived(editor.single);

  /** Cambia propiedades del objeto seleccionado; los cambios seguidos de un mismo campo se fusionan. */
  function set(p: Record<string, unknown>, field: string) {
    if (o) editor.patch([o.id], p, `insp:${o.id}:${field}`);
  }

  /** Tamaño de texto global que afecta a esta página (si lo hay). */
  const gText = $derived(pageInfo(editor.doc, editor.pageIndex).globals?.textSize);

  /** Cambia el tamaño; en una viñeta, sus imágenes lo acompañan. */
  function setSize(w: number, h: number, field: string) {
    if (!o) return;
    if (o.type === 'panel') editor.patch([o.id], { w, h, layers: scaleLayers($state.snapshot(o.layers) as typeof o.layers, w / o.w, h / o.h) }, `insp:${o.id}:${field}`);
    else set({ w, h }, field);
  }

  const BALLOON_STYLES = ['speech', 'thought', 'shout', 'whisper', 'caption', 'jagged', 'rounded', 'scallop', 'blob', 'angular', 'impact'] as const;

  /** Otros globos de la página a los que se puede enlazar el seleccionado. */
  const linkChoices = $derived(
    o && o.type === 'balloon'
      ? editor.page.objects.filter((x) => x.type === 'balloon' && x.id !== o.id)
      : []
  );
  function setLink(to: string, mode: 'tail' | 'merge') {
    set({ link: to ? { to, mode } : undefined }, 'link');
  }
</script>

<section class="inspector" aria-label={t('insp.title')}>
  {#if o}
    <div class="head">
      <h3>{t(`obj.${o.type}`)}</h3>
      <label class="lock" title={t('insp.lockHint')}>
        <input type="checkbox" checked={o.locked === true} onchange={(e) => editor.setLocked([o.id], e.currentTarget.checked)} />
        {t('insp.lock')}
      </label>
    </div>

    <div class="grid5">
      <NumberField label="X" value={o.x} onchange={(v) => set({ x: v }, 'x')} />
      <NumberField label="Y" value={o.y} onchange={(v) => set({ y: v }, 'y')} />
      <NumberField label={t('insp.w')} value={o.w} min={12} onchange={(v) => setSize(Math.max(12, v), o.h, 'w')} />
      <NumberField label={t('insp.h')} value={o.h} min={12} onchange={(v) => setSize(o.w, Math.max(12, v), 'h')} />
      <NumberField label={t('insp.rotation')} value={o.rotation} onchange={(v) => set({ rotation: v }, 'rotation')} />
    </div>

    {#if o.type === 'panel'}
      <label class="block">
        <span>{t('insp.shape')}</span>
        <select value={o.shape} onchange={(e) => editor.setShape(o.id, e.currentTarget.value as PanelShape)}>
          <option value="rect">{t('shape.rect')}</option>
          <option value="ellipse">{t('shape.ellipse')}</option>
          <option value="poly">{t('shape.poly')}</option>
        </select>
      </label>
      {#if o.shape === 'poly'}
        <p class="hint">
          {t('insp.polyHint')}
        </p>
      {/if}
      <FillField label={t('insp.fill')} value={o.fill} onchange={(v) => set({ fill: v }, 'fill')} />
      <div class="grid2">
        <ColorField label={t('insp.stroke')} value={o.stroke} onchange={(v) => set({ stroke: v }, 'stroke')} />
        <NumberField label={t('insp.strokeWidth')} value={o.strokeWidth} min={0} onchange={(v) => set({ strokeWidth: Math.max(0, v) }, 'sw')} />
      </div>
      <BlendField value={o.blend} onchange={(v) => set({ blend: v }, 'blend')} />
      <LayersPanel panel={o} />
    {:else if o.type === 'image'}
      <RangeField label={t('insp.opacity')} value={o.opacity} min={0} max={1} onchange={(v) => set({ opacity: v }, 'opacity')} />
      <BlendField value={o.blend} onchange={(v) => set({ blend: v }, 'blend')} />
      <div class="buttons">
        <button type="button" class:toggle={o.flipH} onclick={() => editor.flip('h')}>{t('act.edit.flipH')}</button>
        <button type="button" class:toggle={o.flipV} onclick={() => editor.flip('v')}>{t('act.edit.flipV')}</button>
      </div>
      <button type="button" onclick={() => imageEditor.openCurrent()}>{t('img.edit')}</button>
      <ImageFxEditor fx={o.fx} onchange={(fx) => set({ fx }, 'fx')} />
    {:else if o.type === 'balloon'}
      <label class="block">
        <span>{t('insp.text')}</span>
        <textarea rows="3" spellcheck="true" lang={editor.doc.textLang || i18n.lang} autocorrect="on" autocapitalize="sentences" value={o.text} oninput={(e) => set({ text: e.currentTarget.value }, 'text')}></textarea>
      </label>
      <div class="grid2">
        <label class="block">
          <span>{t('insp.style')}</span>
          <select value={o.style} onchange={(e) => set({ style: e.currentTarget.value }, 'style')}>
            {#each BALLOON_STYLES as id}
              <option value={id}>{t(`balloon.style.${id}`)}</option>
            {/each}
          </select>
        </label>
        <label class="block">
          <span>{t('insp.font')}</span>
          <select value={o.fontFamily} onchange={(e) => set({ fontFamily: e.currentTarget.value }, 'font')}>
            {#each fontFamilies() as f}
              <option value={f}>{f}</option>
            {/each}
          </select>
        </label>
        <button type="button" class="fontbtn" onclick={() => (editor.showFonts = true)}>{t('fonts.manage')}</button>
        <NumberField label={t('insp.fontSize')} value={o.fontSize} min={6} onchange={(v) => set({ fontSize: Math.max(6, v) }, 'fs')} />
        {#if gText}<p class="hint">{t('insp.globalText', { size: Math.round(gText) })}</p>{/if}
        <label class="block">
          <span>{t('insp.align')}</span>
          <select value={o.align} onchange={(e) => set({ align: e.currentTarget.value }, 'align')}>
            <option value="left">{o.vertical ? t('align.top') : t('align.left')}</option>
            <option value="center">{t('align.center')}</option>
            <option value="right">{o.vertical ? t('align.bottom') : t('align.right')}</option>
            {#if !o.vertical}<option value="justify">{t('align.justify')}</option>{/if}
          </select>
        </label>
        <ColorField label={t('insp.textColor')} value={o.color} onchange={(v) => set({ color: v }, 'color')} />
        <FillField label={t('insp.balloonFill')} value={o.fill} onchange={(v) => set({ fill: v }, 'fill')} />
        <ColorField label={t('insp.stroke')} value={o.stroke} onchange={(v) => set({ stroke: v }, 'stroke')} />
        <NumberField label={t('insp.strokeWidth')} value={o.strokeWidth} min={0} onchange={(v) => set({ strokeWidth: Math.max(0, v) }, 'sw')} />
      </div>
      <div class="checks">
        <label><input type="checkbox" checked={o.bold} onchange={(e) => set({ bold: e.currentTarget.checked }, 'bold')} /> {t('insp.bold')}</label>
        <label><input type="checkbox" checked={o.italic} onchange={(e) => set({ italic: e.currentTarget.checked }, 'italic')} /> {t('insp.italic')}</label>
        <label><input type="checkbox" checked={!!o.vertical} onchange={(e) => set({ vertical: e.currentTarget.checked }, 'vertical')} /> {t('insp.vertical')}</label>
      </div>
      {#if o.style !== 'caption' && o.style !== 'jagged' && o.style !== 'shout' && o.style !== 'impact' && !o.vertical}
        <RangeField label={t('insp.textMargin')} value={o.textMargin ?? 6} min={0} max={40} step={1} onchange={(v) => set({ textMargin: v }, 'tm')} />
      {/if}
      {#if TAIL_STYLES.includes(o.style)}
        <h4 class="sub">{t('insp.tail')}</h4>
        <RangeField label={t('insp.tailWidth')} value={o.tailWidth ?? 1} min={0.1} max={3} step={0.05} onchange={(v) => set({ tailWidth: v }, 'tw')} />
        <RangeField label={t('insp.tailCurve')} value={o.tailCurve ?? 0} min={-1} max={1} step={0.02} onchange={(v) => set({ tailCurve: v }, 'tc')} />
        <div class="buttons">
          <button type="button" onclick={() => set({ tailWidth: 1, tailCurve: 0 }, 'tail-reset')}>{t('insp.tailReset')}</button>
          <button type="button" onclick={() => set({ tailOx: 0, tailOy: 0 }, 'tail-origin')}>{t('insp.tailOriginReset')}</button>
        </div>
        <p class="hint">{t('insp.tailHint')}</p>
      {/if}
      {#if linkChoices.length > 0 || o.link}
        <h4 class="sub">{t('insp.link')}</h4>
        <label class="block">
          <span>{t('insp.linkTo')}</span>
          <select value={o.link?.to ?? ''} onchange={(e) => setLink(e.currentTarget.value, o.link?.mode ?? 'tail')}>
            <option value="">{t('insp.linkNone')}</option>
            {#each linkChoices as b, i (b.id)}
              <option value={b.id}>{i + 1}. {b.type === 'balloon' ? b.text.slice(0, 24) : ''}</option>
            {/each}
          </select>
        </label>
        {#if o.link}
          <label class="block">
            <span>{t('insp.linkMode')}</span>
            <select value={o.link.mode} onchange={(e) => setLink(o.link!.to, e.currentTarget.value as 'tail' | 'merge')}>
              <option value="tail">{t('insp.linkTail')}</option>
              <option value="merge">{t('insp.linkMerge')}</option>
            </select>
          </label>
          <p class="hint">{t('insp.linkHint')}</p>
        {/if}
      {/if}
    {:else if o.type === 'text'}
      <label class="block">
        <span>{t('insp.text')}</span>
        <textarea rows="3" spellcheck="true" lang={editor.doc.textLang || i18n.lang} autocorrect="on" autocapitalize="sentences" value={o.text} oninput={(e) => set({ text: e.currentTarget.value }, 'text')}></textarea>
      </label>
      <div class="grid2">
        <label class="block">
          <span>{t('insp.font')}</span>
          <select value={o.fontFamily} onchange={(e) => set({ fontFamily: e.currentTarget.value }, 'font')}>
            {#each fontFamilies() as f}
              <option value={f}>{f}</option>
            {/each}
          </select>
        </label>
        <button type="button" class="fontbtn" onclick={() => (editor.showFonts = true)}>{t('fonts.manage')}</button>
        <NumberField label={t('insp.fontSize')} value={o.fontSize} min={6} onchange={(v) => set({ fontSize: Math.max(6, v) }, 'fs')} />
        {#if gText && !o.role}<p class="hint">{t('insp.globalText', { size: Math.round(gText) })}</p>{/if}
        <label class="block">
          <span>{t('insp.align')}</span>
          <select value={o.align} onchange={(e) => set({ align: e.currentTarget.value }, 'align')}>
            <option value="left">{o.vertical ? t('align.top') : t('align.left')}</option>
            <option value="center">{t('align.center')}</option>
            <option value="right">{o.vertical ? t('align.bottom') : t('align.right')}</option>
            {#if !o.vertical}<option value="justify">{t('align.justify')}</option>{/if}
          </select>
        </label>
        <label class="block">
          <span>{t('insp.textRole')}</span>
          <select value={o.role ?? 'normal'} onchange={(e) => set({ role: e.currentTarget.value === 'normal' ? undefined : e.currentTarget.value }, 'role')}>
            <option value="normal">{t('role.normal')}</option>
            <option value="title">{t('role.title')}</option>
            <option value="sfx">{t('role.sfx')}</option>
          </select>
        </label>
        <FillField
          label={t('insp.color')}
          value={o.fill ?? o.color}
          plain
          onchange={(v) => (typeof v === 'string' ? set({ color: v, fill: undefined }, 'color') : set({ fill: v }, 'tfill'))}
        />
        <ColorField label={t('insp.outline')} value={o.outline} onchange={(v) => set({ outline: v }, 'outline')} />
        <NumberField label={t('insp.outlineWidth')} value={o.outlineWidth} min={0} onchange={(v) => set({ outlineWidth: Math.max(0, v) }, 'ow')} />
      </div>
      <label class="block">
        <span>{t('insp.warp')}</span>
        <select
          value={o.warp?.kind ?? 'none'}
          onchange={(e) => {
            const k = e.currentTarget.value;
            set({ warp: k === 'none' ? undefined : { kind: k, amount: o.warp?.amount || 50 } }, 'warp');
          }}
        >
          <option value="none">{t('warp.none')}</option>
          <option value="arc">{t('warp.arc')}</option>
          <option value="wave">{t('warp.wave')}</option>
          <option value="bulge">{t('warp.bulge')}</option>
          <option value="perspective">{t('warp.perspective')}</option>
        </select>
      </label>
      {#if o.warp}
        <RangeField label={t('insp.warpAmount')} value={o.warp.amount} min={-100} max={100} step={1} onchange={(v) => set({ warp: { kind: o.warp!.kind, amount: v } }, 'warpAmt')} />
        {#if o.vertical}<p class="hint">{t('warp.verticalHint')}</p>{/if}
      {/if}
      <div class="checks">
        <label><input type="checkbox" checked={o.bold} onchange={(e) => set({ bold: e.currentTarget.checked }, 'bold')} /> {t('insp.bold')}</label>
        <label><input type="checkbox" checked={o.italic} onchange={(e) => set({ italic: e.currentTarget.checked }, 'italic')} /> {t('insp.italic')}</label>
        <label><input type="checkbox" checked={!!o.vertical} onchange={(e) => set({ vertical: e.currentTarget.checked }, 'vertical')} /> {t('insp.vertical')}</label>
      </div>
    {:else if o.type === 'pattern'}
      <label class="block">
        <span>{t('insp.kind')}</span>
        <select value={o.kind} onchange={(e) => set({ kind: e.currentTarget.value }, 'kind')}>
          <optgroup label={t('res.tab.patterns')}>
            {#each listPatterns() as p (p.kind)}
              <option value={p.kind}>{patternName(p.kind)}</option>
            {/each}
          </optgroup>
          <optgroup label={t('res.tab.textures')}>
            {#each listTextures() as p (p.kind)}
              <option value={p.kind}>{patternName(p.kind)}</option>
            {/each}
          </optgroup>
        </select>
      </label>
      <div class="grid2">
        <ColorField label={t('insp.color')} value={o.color} onchange={(v) => set({ color: v }, 'color')} />
        <ColorField label={t('insp.fill')} value={o.bg} optional onchange={(v) => set({ bg: v }, 'bg')} />
      </div>
      <RangeField label={t('insp.scale')} value={o.scale} min={0.3} max={4} onchange={(v) => set({ scale: v }, 'scale')} />
      <RangeField label={t('insp.opacity')} value={o.opacity} min={0} max={1} onchange={(v) => set({ opacity: v }, 'opacity')} />
      <BlendField value={o.blend} onchange={(v) => set({ blend: v }, 'blend')} />
      {#if usesSeed(o.kind)}
        <RangeField label={t('insp.amount')} value={o.amount ?? 0.5} min={0} max={1} onchange={(v) => set({ amount: v }, 'amount')} />
        <div class="buttons">
          <button type="button" onclick={() => set({ seed: (o.seed ?? 0) + 1 }, 'seed')}>{t('insp.vary')}</button>
        </div>
      {/if}
    {/if}
    <h4 class="sub">{t('insp.distort')}</h4>
    <RangeField label={t('insp.distortAmount')} value={o.distort?.amount ?? 0} min={0} max={40} step={0.5} onchange={(v) => set({ distort: v > 0 ? { amount: v, size: o.distort?.size ?? 40 } : undefined }, 'distort')} />
    {#if o.distort}
      <RangeField label={t('insp.distortSize')} value={o.distort.size} min={6} max={200} step={1} onchange={(v) => set({ distort: { amount: o.distort!.amount, size: v } }, 'distortSize')} />
    {/if}
  {:else if editor.selection.length > 1}
    <h3>{t('insp.multi')}</h3>
    <p class="hint">{t('insp.multiHint', { n: editor.selection.length })}</p>
  {:else if editor.styleMode}
    <h3>{t('insp.styleTitle')}</h3>
    <p class="hint">{t('insp.styleHint')}</p>
  {:else}
    <h3>{t('insp.page', { n: editor.pageIndex + 1 })}</h3>
    <ColorField label={t('insp.pageBg')} value={editor.page.background} alpha={false} onchange={(v) => editor.setBackground(v)} />
    <label class="block">
      <span>{t('insp.textLang')}</span>
      <select value={editor.doc.textLang ?? ''} onchange={(e) => editor.setTextLang(e.currentTarget.value)}>
        <option value="">{t('insp.textLangAuto')}</option>
        {#each LANGUAGES as l (l.code)}
          <option value={l.code} lang={l.code}>{l.name}</option>
        {/each}
      </select>
    </label>
    <p class="hint">{t('insp.textLangHint')}</p>
    <p class="hint">
      {t('insp.pageHint', { w: Math.round(editor.doc.pageW), h: Math.round(editor.doc.pageH) })}
    </p>
  {/if}
</section>

<style>
  .inspector {
    flex: none;
    max-height: 58%;
    overflow-y: auto;
    padding: 0.6154rem 0.7692rem 0.9231rem;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 0.6154rem;
  }
  h3 {
    margin: 0;
    font-size: 0.9231rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .grid5 {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.3077rem;
  }
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6154rem;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.9231rem;
    color: var(--muted);
  }
  .block select,
  .block textarea {
    color: var(--text);
    width: 100%;
    resize: vertical;
  }
  .checks {
    display: flex;
    gap: 1.0769rem;
    font-size: 0.9231rem;
  }
  .checks label {
    display: flex;
    align-items: center;
    gap: 0.3077rem;
  }
  .hint {
    margin: 0;
    font-size: 0.9231rem;
    color: var(--muted);
    line-height: 1.4;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6154rem;
  }
  .lock {
    display: flex;
    align-items: center;
    gap: 0.3077rem;
    font-size: 0.9231rem;
  }
  .sub {
    margin: 0.3077rem 0 0;
    font-size: 0.9231rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3846rem;
  }
  .buttons button.toggle {
    background: var(--sel);
    border-color: var(--sel);
    color: #fff;
  }
  .buttons button {
    padding: 0.3077rem 0.7692rem;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 0.3077rem;
  }
  .fontbtn {
    grid-column: 1 / -1;
    justify-self: start;
    padding: 0.15rem 0.6rem;
    font-size: 0.9231rem;
  }
</style>
