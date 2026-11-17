<script lang="ts">
  /**
   * Borde arrastrable entre dos zonas. 'v' = separador vertical (cambia un ancho), 'h' = horizontal
   * (cambia una altura). `grow` = hacia dónde crece el panel al arrastrar: 1 = hacia la derecha/abajo,
   * −1 = hacia la izquierda/arriba. Doble clic: tamaño por defecto. Con el teclado: flechas.
   */
  interface Props {
    orientation: 'v' | 'h';
    grow: 1 | -1;
    label: string;
    /** Tamaño actual real (px) al empezar a arrastrar. */
    measure: () => number;
    onresize: (px: number) => void;
    onreset: () => void;
    /** Máximo disponible (px), por si el resto de la ventana necesita su sitio. */
    max?: () => number;
  }
  let { orientation, grow, label, measure, onresize, onreset }: Props = $props();

  let active = $state(false);
  let start = 0;
  let startSize = 0;

  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    active = true;
    start = orientation === 'v' ? e.clientX : e.clientY;
    startSize = measure();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function move(e: PointerEvent) {
    if (!active) return;
    const now = orientation === 'v' ? e.clientX : e.clientY;
    onresize(startSize + grow * (now - start));
  }
  function up(e: PointerEvent) {
    if (!active) return;
    active = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ya soltado */
    }
  }
  function key(e: KeyboardEvent) {
    const dec = orientation === 'v' ? 'ArrowLeft' : 'ArrowUp';
    const inc = orientation === 'v' ? 'ArrowRight' : 'ArrowDown';
    if (e.key !== dec && e.key !== inc) return;
    e.preventDefault();
    const step = e.shiftKey ? 40 : 12;
    onresize(measure() + grow * (e.key === inc ? step : -step));
  }
</script>

<div
  class="split {orientation}"
  class:active
  role="separator"
  aria-orientation={orientation === 'v' ? 'vertical' : 'horizontal'}
  aria-label={label}
  title={label}
  tabindex="0"
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  ondblclick={onreset}
  onkeydown={key}
></div>

<style>
  .split {
    position: relative;
    z-index: 30;
    flex: none;
    touch-action: none;
    background: transparent;
  }
  .split.v {
    width: 7px;
    margin: 0 -3px;
    cursor: col-resize;
    align-self: stretch;
  }
  .split.h {
    height: 7px;
    margin: -3px 0;
    cursor: row-resize;
  }
  .split::after {
    content: '';
    position: absolute;
    background: transparent;
    transition: background 0.12s;
  }
  .split.v::after {
    left: 3px;
    top: 0;
    bottom: 0;
    width: 2px;
  }
  .split.h::after {
    top: 3px;
    left: 0;
    right: 0;
    height: 2px;
  }
  .split:hover::after,
  .split:focus-visible::after,
  .split.active::after {
    background: var(--sel);
  }
</style>
