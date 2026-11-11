<script lang="ts">
  import { onMount } from 'svelte';
  import MenuBar from './lib/components/MenuBar.svelte';
  import PageList from './lib/components/PageList.svelte';
  import Canvas from './lib/components/Canvas.svelte';
  import Toolbar from './lib/components/Toolbar.svelte';
  import ResourcePanel from './lib/components/ResourcePanel.svelte';
  import StatusBar from './lib/components/StatusBar.svelte';
  import AboutDialog from './lib/components/AboutDialog.svelte';
  import SplashDialog from './lib/components/SplashDialog.svelte';
  import PageSizeDialog from './lib/components/PageSizeDialog.svelte';
  import HelpDialog from './lib/components/HelpDialog.svelte';
  import EulaDialog from './lib/components/EulaDialog.svelte';
  import NoticeDialog from './lib/components/NoticeDialog.svelte';
  import DownloadDialog from './lib/components/DownloadDialog.svelte';
  import MobileApp from './lib/components/MobileApp.svelte';
  import { device } from './lib/app/device.svelte';
  import ImageEditor from './lib/components/ImageEditor.svelte';
  import { imageEditor } from './lib/app/imageEditor.svelte';
  import ProgressDialog from './lib/components/ProgressDialog.svelte';
  import ContextMenu from './lib/components/ContextMenu.svelte';
  import GridDialog from './lib/components/GridDialog.svelte';
  import SplitDialog from './lib/components/SplitDialog.svelte';
  import SelectPopup from './lib/components/SelectPopup.svelte';
  import NewDrawingDialog from './lib/components/NewDrawingDialog.svelte';
  import TemplateDialog from './lib/components/TemplateDialog.svelte';
  import GlobalsDialog from './lib/components/GlobalsDialog.svelte';
  import DistributeDialog from './lib/components/DistributeDialog.svelte';
  import ReorganizeDialog from './lib/components/ReorganizeDialog.svelte';
  import FontDialog from './lib/components/FontDialog.svelte';
  import { downloads } from './lib/app/downloads.svelte';
  import { notices } from './lib/app/notices.svelte';
  import { i18n, t } from './lib/i18n/index.svelte';
  import { eulaAccepted, splashHidden } from './lib/app/prefs';
  import { handleKeydown } from './lib/app/actions';
  import { editor } from './lib/model/store.svelte';
  import { appearance } from './lib/app/appearance.svelte';
  import { loadFonts } from './lib/render/fonts.svelte';
  import { importDroppedFiles, importDroppedPaths, openLaunchedProjects } from './lib/io/fileActions';
  import { fileDrop } from './lib/app/fileDrop';
  import { guardClose, listenNativeFileDrop, listenOpenFiles, setWindowTitle } from './lib/io/platform';

  onMount(() => {
    appearance.apply();
    i18n.apply();
    void notices.load();
    void downloads.load();
    if (!eulaAccepted()) editor.showEula = true;
    else if (!splashHidden()) editor.showSplash = true;
    void loadFonts();
    void guardClose(() => editor.dirty);
    const stopWatch = device.watch();
    let stopDrop: (() => void) | null = null;
    let stopOpen: (() => void) | null = null;
    let gone = false;
    // Escritorio Linux/macOS: los archivos arrastrados llegan como evento nativo con rutas.
    void listenNativeFileDrop({
      over: () => (fileOver = true),
      leave: () => (fileOver = false),
      drop: (paths, x, y) => {
        fileOver = false;
        void (async () => {
          const added = await importDroppedPaths(paths);
          if (added.length === 0) return;
          const onPage = document.elementFromPoint(x, y)?.closest('[data-dropzone]');
          if (onPage && fileDrop.place) fileDrop.place(added, x, y);
          else editor.status = t('status.droppedToResources', { n: added.length });
        })();
      }
    }).then((off) => {
      if (gone) off();
      else stopDrop = off;
    });
    // Escritorio: proyectos con los que el sistema abrió la app (doble clic) y los que lleguen después.
    void openLaunchedProjects();
    void listenOpenFiles(() => void openLaunchedProjects()).then((off) => {
      if (gone) off();
      else stopOpen = off;
    });
    return () => {
      gone = true;
      stopWatch();
      stopDrop?.();
      stopOpen?.();
    };
  });

  // Título de la ventana: «● nombre — Comic Fast» cuando hay cambios sin guardar.
  $effect(() => {
    void i18n.lang;
    void setWindowTitle(`${editor.dirty ? '● ' : ''}${editor.fileName} — Comic Fast`);
  });

  // Clic derecho: cada zona abre su propio menú (lienzo, lista de páginas, imágenes importadas).
  // En todo lo demás (barras, paneles, diálogos…) no debe salir el menú del navegador, ni en la web
  // ni en el escritorio. Los campos de texto conservan el suyo (copiar y pegar texto).
  function onContextMenu(e: MouseEvent) {
    if (e.defaultPrevented) return;
    const el = e.target as HTMLElement | null;
    if (el) {
      if (el.tagName === 'TEXTAREA' || el.isContentEditable) return;
      if (el.tagName === 'INPUT' && !['range', 'color', 'checkbox', 'radio', 'button', 'file'].includes((el as HTMLInputElement).type)) return;
    }
    e.preventDefault();
  }

  // Soltar archivos desde el sistema en cualquier parte de la interfaz: las imágenes se añaden a Recursos.
  // (Sobre la página, el lienzo las coloca él mismo y marca el evento como atendido.)
  let fileOver = $state(false);
  let overDepth = 0;
  const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
  function onDragEnter(e: DragEvent) {
    if (!hasFiles(e)) return;
    overDepth++;
    fileOver = true;
  }
  function onDragLeave(e: DragEvent) {
    if (!hasFiles(e)) return;
    overDepth = Math.max(0, overDepth - 1);
    if (overDepth === 0) fileOver = false;
  }
  async function onDrop(e: DragEvent) {
    overDepth = 0;
    fileOver = false;
    const handled = e.defaultPrevented;
    e.preventDefault();
    if (handled || !e.dataTransfer?.files.length) return;
    const added = await importDroppedFiles(Array.from(e.dataTransfer.files));
    if (added.length > 0) editor.status = t('status.droppedToResources', { n: added.length });
  }

  // Los mensajes de estado desaparecen solos.
  $effect(() => {
    const s = editor.status;
    if (!s) return;
    const timer = setTimeout(() => {
      if (editor.status === s) editor.status = '';
    }, 6000);
    return () => clearTimeout(timer);
  });
</script>

<!-- Evita que soltar un archivo fuera del lienzo navegue la ventana hacia él. -->
<svelte:window
  onkeydown={handleKeydown}
  ondragover={(e) => {
    e.preventDefault();
    if (hasFiles(e) && e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }}
  ondragenter={onDragEnter}
  ondragleave={onDragLeave}
  ondrop={onDrop}
  oncontextmenu={onContextMenu}
/>

{#if device.mobile}
  <MobileApp />
{:else}
<div class="app">
  <div class="menu"><MenuBar /></div>
  <PageList />
  <main>
    <Toolbar />
    <div class="canvas"><Canvas /></div>
    {#if editor.styleMode}
      <div class="stylebanner" role="status">
        <span>{t('style.banner')}</span>
        <button type="button" onclick={() => editor.setStyleMode(false)}>{t('style.back')}</button>
      </div>
    {/if}
  </main>
  <ResourcePanel />
  <div class="status"><StatusBar /></div>
</div>
{/if}
{#if fileOver}
  <div class="dropveil" aria-hidden="true"><span>{t('drop.hint')}</span></div>
{/if}
<div class="overlays">
  <AboutDialog />
  {#if editor.showSplash}<SplashDialog />{/if}
  {#if editor.showPageSize}<PageSizeDialog />{/if}
  {#if editor.showHelp}<HelpDialog />{/if}
  {#if editor.showEula}<EulaDialog />{/if}
  {#if editor.showNotice}<NoticeDialog />{/if}
  {#if editor.showDownload}<DownloadDialog />{/if}
  {#if editor.showFonts}<FontDialog />{/if}
  {#if editor.showGlobals}<GlobalsDialog />{/if}
  {#if editor.showGridDialog}<GridDialog />{/if}
  {#if editor.showSplit}<SplitDialog />{/if}
  {#if editor.showTemplates}<TemplateDialog />{/if}
  {#if editor.showDistribute}<DistributeDialog />{/if}
  {#if editor.showReorg}<ReorganizeDialog />{/if}
  <ContextMenu />
  <SelectPopup />
  {#if imageEditor.showNew}<NewDrawingDialog />{/if}
  {#if imageEditor.isOpen}<ImageEditor />{/if}
  <ProgressDialog />
</div>

<style>
  .dropveil {
    position: fixed;
    inset: 0;
    z-index: 500;
    display: grid;
    place-items: center;
    background: rgb(31 111 235 / 0.22);
    border: 4px dashed var(--sel);
    pointer-events: none;
  }
  .dropveil span {
    padding: 0.8rem 1.4rem;
    background: var(--panel);
    color: var(--text);
    border-radius: 0.8rem;
    font-weight: 700;
    box-shadow: 0 8px 28px rgb(0 0 0 / 0.35);
  }
  .overlays {
    display: contents;
  }
  .app {
    display: grid;
    grid-template-columns: 13.5385rem minmax(0, 1fr) 22.4615rem;
    grid-template-rows: auto minmax(0, 1fr) auto;
    height: 100vh;
    height: 100dvh;
  }
  .menu,
  .status {
    grid-column: 1 / -1;
  }
  /* Los menús desplegables deben quedar por encima del lienzo y de las listas. */
  .menu {
    position: relative;
    z-index: 100;
  }
  main {
    display: flex;
    min-width: 0;
    min-height: 0;
    position: relative;
  }
  .stylebanner {
    position: absolute;
    top: 0.6rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    max-width: 90%;
    padding: 0.35rem 0.5rem 0.35rem 0.9rem;
    background: var(--sel);
    color: #fff;
    border-radius: 1.2rem;
    box-shadow: 0 4px 14px rgb(0 0 0 / 0.3);
    font-size: 0.9231rem;
  }
  .stylebanner button {
    padding: 0.2rem 0.8rem;
    color: var(--sel);
    background: #fff;
    border: 0;
    border-radius: 1rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .canvas {
    flex: 1;
    min-width: 0;
    min-height: 0;
  }
</style>
