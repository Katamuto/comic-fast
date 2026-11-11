<script lang="ts">
  /**
   * Sustituye la lista desplegable nativa de los <select>: siempre cabe en la ventana
   * (se abre hacia arriba si abajo no hay sitio) y tiene scroll si es larga.
   * Funciona para todos los <select> de la app sin cambiar su código: al elegir, se
   * asigna el valor y se lanza el evento `change` como haría el navegador.
   */
  import { tick } from 'svelte';

  interface Opt {
    value: string;
    label: string;
    disabled: boolean;
    group?: string;
  }

  let sel = $state<HTMLSelectElement | null>(null);
  let opts = $state<Opt[]>([]);
  let current = $state(0);
  let box = $state<HTMLDivElement | null>(null);
  let pos = $state({ left: 0, top: 0, width: 0, maxH: 300 });

  function read(s: HTMLSelectElement): Opt[] {
    const out: Opt[] = [];
    for (const child of Array.from(s.children)) {
      if (child instanceof HTMLOptGroupElement) {
        for (const o of Array.from(child.children) as HTMLOptionElement[]) {
          out.push({ value: o.value, label: o.textContent ?? '', disabled: o.disabled || child.disabled, group: child.label });
        }
      } else if (child instanceof HTMLOptionElement) {
        out.push({ value: child.value, label: child.textContent ?? '', disabled: child.disabled });
      }
    }
    return out;
  }

  async function open(s: HTMLSelectElement) {
    sel = s;
    opts = read(s);
    current = Math.max(0, s.selectedIndex);
    place();
    await tick();
    place();
    box?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }

  function close() {
    const s = sel;
    sel = null;
    s?.focus({ preventScroll: true });
  }

  /** Coloca la lista bajo el campo, o encima si abajo hay menos sitio; limita el alto al espacio libre. */
  function place() {
    if (!sel) return;
    const r = sel.getBoundingClientRect();
    const margin = 8;
    const below = window.innerHeight - r.bottom - margin;
    const above = r.top - margin;
    const natural = box ? box.scrollHeight + 2 : 200;
    const up = natural > below && above > below;
    const room = up ? above : below;
    const maxH = Math.max(80, Math.min(natural, room));
    const width = Math.max(r.width, 120);
    const left = Math.min(Math.max(margin, r.left), Math.max(margin, window.innerWidth - width - margin));
    pos = { left, width, maxH, top: up ? r.top - maxH - 2 : r.bottom + 2 };
  }

  function choose(i: number) {
    const s = sel;
    const o = opts[i];
    if (!s || !o || o.disabled) return;
    if (s.value !== o.value) {
      s.value = o.value;
      s.dispatchEvent(new Event('input', { bubbles: true }));
      s.dispatchEvent(new Event('change', { bubbles: true }));
    }
    close();
  }

  function isTarget(e: Event): HTMLSelectElement | null {
    const el = e.target;
    if (!(el instanceof HTMLSelectElement)) return null;
    if (el.multiple || el.size > 1 || el.disabled || el.dataset.native !== undefined) return null;
    return el;
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    const s = isTarget(e);
    if (!s) return;
    e.preventDefault();
    s.focus({ preventScroll: true });
    if (sel === s) close();
    else void open(s);
  }

  function step(dir: 1 | -1) {
    let i = current;
    for (let n = 0; n < opts.length; n++) {
      i = (i + dir + opts.length) % opts.length;
      if (!opts[i].disabled) break;
    }
    current = i;
    void tick().then(() => box?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' }));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (sel) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        step(-1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        choose(current);
      } else if (e.key === 'Tab') {
        close();
      }
      return;
    }
    const s = isTarget(e);
    if (s && (e.key === ' ' || e.key === 'F4' || (e.altKey && e.key === 'ArrowDown'))) {
      e.preventDefault();
      void open(s);
    }
  }

  function onScroll(e: Event) {
    if (sel && !box?.contains(e.target as Node)) sel = null;
  }

  function onOutside(e: Event) {
    if (!sel) return;
    const t = e.target as Node;
    if (box?.contains(t) || t === sel) return;
    sel = null;
  }
</script>

<svelte:window onmousedowncapture={onMouseDown} onkeydowncapture={onKeyDown} onpointerdown={onOutside} onresize={() => (sel = null)} onblur={() => (sel = null)} />
<svelte:document onscrollcapture={onScroll} />

{#if sel}
  <div
    class="list"
    role="listbox"
    bind:this={box}
    style:left="{pos.left}px"
    style:top="{pos.top}px"
    style:min-width="{pos.width}px"
    style:max-height="{pos.maxH}px"
  >
    {#each opts as o, i}
      {#if o.group && (i === 0 || opts[i - 1].group !== o.group)}
        <div class="group">{o.group}</div>
      {/if}
      <div
        class="opt"
        class:cur={i === current}
        class:dis={o.disabled}
        role="option"
        aria-selected={i === sel.selectedIndex}
        data-i={i}
        tabindex="-1"
        onmouseenter={() => (current = i)}
        onpointerdown={(e) => e.preventDefault()}
        onclick={() => choose(i)}
        onkeydown={() => {}}
      >{o.label}</div>
    {/each}
  </div>
{/if}

<style>
  .list {
    position: fixed;
    z-index: 400;
    overflow-y: auto;
    padding: 0.2308rem;
    background: var(--panel);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.3);
  }
  .opt {
    padding: 0.3846rem 0.6154rem;
    border-radius: 0.3077rem;
    cursor: default;
    white-space: nowrap;
  }
  .opt[aria-selected='true'] {
    font-weight: 600;
  }
  .opt.cur {
    background: var(--sel);
    color: #fff;
  }
  .opt.dis {
    opacity: 0.45;
  }
  .group {
    padding: 0.3rem 0.6rem 0.1rem;
    font-size: 0.8462rem;
    color: var(--muted);
  }
</style>
