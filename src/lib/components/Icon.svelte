<script lang="ts">
  /** Iconos de línea sencillos (24×24). Para añadir uno, agrega su marcado SVG a ICONS. */
  const ICONS: Record<string, string> = {
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    front: '<rect x="3" y="3" width="11" height="11" rx="1.5"/><rect x="10" y="10" width="11" height="11" rx="1.5" fill="currentColor"/>',
    forward: '<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M12 8V2M9 5l3-3 3 3"/>',
    backward: '<rect x="5" y="3" width="14" height="10" rx="1.5"/><path d="M12 16v6M9 19l3 3 3-3"/>',
    back: '<rect x="3" y="3" width="11" height="11" rx="1.5" fill="currentColor"/><rect x="10" y="10" width="11" height="11" rx="1.5"/>',
    duplicate: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    cut: '<path d="M3 3l18 18" /><rect x="4" y="4" width="16" height="16" rx="1.5" stroke-dasharray="3 2"/>',
    union: '<path d="M4 4h10v6h6v10H10v-6H4z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    merge: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
    unlink: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1M4 4l16 16"/>',
    polygon: '<path d="M12 3l9 7-3.5 11h-11L3 10z"/>',
    zoomIn: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/>',
    zoomOut: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    grid: '<path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    library: '<rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/>',
    balloon: '<path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
    panels: '<rect x="3" y="3" width="8" height="10" rx="1"/><rect x="13" y="3" width="8" height="6" rx="1"/><rect x="13" y="11" width="8" height="10" rx="1"/><rect x="3" y="15" width="8" height="6" rx="1"/>',
    dots: '<circle cx="6" cy="6" r="1.8"/><circle cx="12" cy="6" r="1.8"/><circle cx="18" cy="6" r="1.8"/><circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/><circle cx="6" cy="18" r="1.8"/><circle cx="12" cy="18" r="1.8"/><circle cx="18" cy="18" r="1.8"/>',
    texture: '<path d="M3 8c3-3 6 3 9 0s6 3 9 0M3 14c3-3 6 3 9 0s6 3 9 0M3 20c3-3 6 3 9 0s6 3 9 0"/>',
    gradient: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18" stroke-opacity=".45"/><path d="M8 3v18M14 3v18" stroke-opacity=".25"/>',
    type: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    style: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M4 8h16M4 16h16"/><path d="M9 11.5h6" stroke-opacity=".5"/>',
    unused: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    viewS: '<rect x="3" y="3" width="5" height="5"/><rect x="9.5" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="9.5" width="5" height="5"/><rect x="9.5" y="9.5" width="5" height="5"/><rect x="16" y="9.5" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><rect x="9.5" y="16" width="5" height="5"/><rect x="16" y="16" width="5" height="5"/>',
    viewM: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
    viewL: '<rect x="4" y="4" width="16" height="16" rx="1.5"/>',
    viewList: '<path d="M9 6h12M9 12h12M9 18h12"/><rect x="3" y="4.5" width="3" height="3"/><rect x="3" y="10.5" width="3" height="3"/><rect x="3" y="16.5" width="3" height="3"/>',
    pin: '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3zM12 14v7"/>',
    pinOn: '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z" fill="currentColor"/><path d="M12 14v7"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
    brush: '<path d="M18.5 3.5l2 2-9.5 9.5-3-1 1-3z"/><path d="M8 14c-2.5 0-4 1.5-4 3.5 0 1.5-.8 2.5-2 3 3 1 7 .5 8-2.5.4-1.200.2-2.500-2-4z" stroke-width="1.6"/>',
    eraser: '<path d="M4 15l9-10.5 7 6L12 20H7zM11 20h10M8 12l7 6"/>',
    picker: '<path d="M14 4l6 6-3 3-6-6zM11 7l-7 7-1 5 5-1 7-7"/>',
    selRect: '<rect x="4" y="5" width="16" height="14" stroke-dasharray="3 2.5"/>',
    lasso: '<path d="M12 5c5 0 9 1.800 9 4.500S17 14 12 14 3 12.200 3 9.500 7 5 12 5z" stroke-dasharray="3 2.5"/><path d="M8 14c-1.500 2.500-.5 5 3 6"/>',
    wand: '<path d="M4 20l11-11M14 3v3M18 5l-2 2M21 10h-3M6 5l2 2M10 3v0"/><path d="M13 9l2 2"/>',
    crop: '<path d="M7 3v14h14M3 7h14v14"/>',
    bucket: '<path d="M5 11l7-7 7 7-7 7z"/><path d="M5 11h14"/><path d="M20 15c1.200 1.700 1.800 2.800 1.800 3.700a1.800 1.800 0 0 1-3.600 0c0-.9.600-2 1.800-3.700z" fill="currentColor"/>',
    drop: '<path d="M12 3c3.500 4.500 6 7.500 6 11a6 6 0 0 1-12 0c0-3.500 2.500-6.500 6-11z"/><path d="M9 15a3 3 0 0 0 3 3" stroke-width="1.5"/>',
    finger: '<path d="M9 21c-1.500-1-3-3.500-3.500-6l-.5-3a1.500 1.500 0 0 1 3-.5L9 13V5a1.500 1.500 0 0 1 3 0v6c1-.5 3 0 3.500 1.500C17 12 19 13 19 15c0 3-1 5-3 6z"/><path d="M4 8c1-2 2-3 4-3" stroke-dasharray="2 2"/>',
    hand: '<path d="M8 13V6a1.500 1.500 0 0 1 3 0v5V4.500a1.500 1.500 0 0 1 3 0V11V6.500a1.500 1.500 0 0 1 3 0V15c0 4-2 6-6 6-3 0-4.500-1.500-6-4.500l-1.500-3a1.500 1.500 0 0 1 2.600-1.500z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    exitFullscreen: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    pages: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    snap: '<path d="M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3z"/><path d="M6 7h4M14 7h4"/>'
  };

  let { name, size = 18 }: { name: string; size?: number } = $props();
</script>

<svg
  style:width="{size / 13}rem"
  style:height="{size / 13}rem"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {@html ICONS[name] ?? ''}
</svg>
