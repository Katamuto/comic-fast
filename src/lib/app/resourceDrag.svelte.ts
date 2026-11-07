/**
 * Arrastrar recursos del panel hasta la página con el puntero (ratón, dedo o lápiz).
 * No usa el arrastrar-y-soltar de HTML5, que no funciona con el dedo y es poco fiable entre navegadores:
 *  - ratón/lápiz: se empieza a arrastrar al mover unos píxeles (un clic sigue añadiendo el recurso);
 *  - dedo: mantener pulsado ~0,3 s (si se mueve antes, la lista se desplaza como siempre).
 * Mientras se arrastra, una copia semitransparente de la miniatura sigue al puntero. Al soltar sobre el
 * lienzo (elemento con `data-dropzone`), se llama al manejador que registra el lienzo.
 */

export type DragPayload =
  | { kind: 'asset'; id: string }
  | { kind: 'stock'; id: string }
  | { kind: 'item'; tab: string; id: string };

export const HOLD_MS = 280;
export const MOVE_PX = 6;

/** ¿Un gesto que empieza en `start` ya es un arrastre al llegar a `cur`? (ratón/lápiz: al superar MOVE_PX). */
export function movedEnough(start: { x: number; y: number }, cur: { x: number; y: number }): boolean {
  return Math.hypot(cur.x - start.x, cur.y - start.y) > MOVE_PX;
}

class ResourceDrag {
  /** Lo registra el lienzo: coloca el recurso en las coordenadas de pantalla dadas. */
  handler: ((p: DragPayload, clientX: number, clientY: number) => void) | null = null;
  active = $state(false);
}

export const resourceDrag = new ResourceDrag();

export interface PointerDragOpts {
  /** Al soltar: punto de pantalla y elemento que hay justo debajo. */
  onDrop: (x: number, y: number, el: Element | null) => void;
  /** Empieza el arrastre. */
  onStart?: () => void;
  /** El puntero se mueve durante el arrastre (para resaltar el destino). */
  onMove?: (x: number, y: number, el: Element | null) => void;
  /** Termina (se soltara o se cancele). */
  onEnd?: () => void;
}

/** Acción de Svelte: arrastre con el puntero con copia semitransparente (ver la descripción del archivo). */
export function pointerDrag(node: HTMLElement, getOpts: () => PointerDragOpts) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let start = { x: 0, y: 0 };
  let last = { x: 0, y: 0 };
  let pid = -1;
  let touch = false;
  let dragging = false;
  let ghost: HTMLElement | null = null;

  const block = (e: Event) => {
    if (dragging && e.cancelable) e.preventDefault();
  };

  function begin() {
    dragging = true;
    resourceDrag.active = true;
    getOpts().onStart?.();
    ghost = node.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: `${node.offsetWidth}px`,
      opacity: '0.85',
      pointerEvents: 'none',
      zIndex: '1000',
      boxShadow: '0 6px 18px rgb(0 0 0 / 0.4)'
    });
    document.body.appendChild(ghost);
    moveGhost();
    window.addEventListener('touchmove', block, { passive: false });
  }

  function moveGhost() {
    if (ghost) ghost.style.transform = `translate(${last.x - node.offsetWidth / 2}px, ${last.y - node.offsetHeight / 2}px)`;
  }

  function stop(e: PointerEvent | null, cancelled: boolean) {
    clearTimeout(timer);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('touchmove', block);
    pid = -1;
    const was = dragging;
    dragging = false;
    resourceDrag.active = false;
    ghost?.remove();
    ghost = null;
    if (!was) return;
    // El clic que sigue a un arrastre no debe activar el elemento otra vez.
    const swallow = (ev: Event) => ev.stopPropagation();
    node.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => node.removeEventListener('click', swallow, { capture: true }), 150);
    const opts = getOpts();
    if (!cancelled && e) opts.onDrop(e.clientX, e.clientY, document.elementFromPoint(e.clientX, e.clientY));
    opts.onEnd?.();
  }

  function onMove(e: PointerEvent) {
    if (e.pointerId !== pid) return;
    last = { x: e.clientX, y: e.clientY };
    if (!dragging) {
      if (!movedEnough(start, last)) return;
      if (touch) return stop(null, true); // el dedo se movió antes de tiempo: era un desplazamiento
      begin();
    }
    moveGhost();
    getOpts().onMove?.(last.x, last.y, document.elementFromPoint(last.x, last.y));
    e.preventDefault();
  }
  const onUp = (e: PointerEvent) => e.pointerId === pid && stop(e, false);
  const onCancel = (e: PointerEvent) => e.pointerId === pid && stop(e, true);

  function onDown(e: PointerEvent) {
    if (e.button !== 0 || pid !== -1) return;
    pid = e.pointerId;
    touch = e.pointerType === 'touch';
    start = last = { x: e.clientX, y: e.clientY };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    if (touch) timer = setTimeout(begin, HOLD_MS);
  }

  node.addEventListener('pointerdown', onDown);
  node.style.setProperty('-webkit-touch-callout', 'none');
  return {
    update(g: () => PointerDragOpts) {
      getOpts = g;
    },
    destroy() {
      stop(null, true);
      node.removeEventListener('pointerdown', onDown);
    }
  };
}

/** Recurso del panel que se suelta sobre el lienzo. */
export function dragSource(node: HTMLElement, getPayload: () => DragPayload) {
  const opts = (p: () => DragPayload): PointerDragOpts => ({
    onDrop: (x, y, el) => {
      if (el?.closest('[data-dropzone]')) resourceDrag.handler?.(p(), x, y);
    }
  });
  const inner = pointerDrag(node, () => opts(getPayload));
  return {
    update(g: () => DragPayload) {
      getPayload = g;
    },
    destroy: inner.destroy
  };
}
