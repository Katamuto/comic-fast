# 09 · Descargas de la versión de escritorio (desde la web)

La versión web puede ofrecer los instaladores de escritorio. El botón **«Obtener versión de escritorio»** (arriba a la derecha) abre una ventana con una fila por sistema (Windows, Linux, macOS…); cada una tiene un botón **Descargar**.

- **No aparece** si no hay ninguna opción disponible: puedes publicar la web sin instaladores y añadirlos después.
- **No se muestra en la app de escritorio.**
- Se configura con **`descargas/descargas.json`**, en la raíz del sitio (en el proyecto: `public/descargas/descargas.json`). Se lee al cargar y sin caché: para cambiarlo no hay que recompilar, basta con subir el archivo.

## Formato

```json
{
  "downloads": [
    {
      "id": "windows",
      "name": { "es": "Windows (64 bits)", "en": "Windows (64-bit)", "ja": "Windows (64ビット)" },
      "note": { "es": "Windows 10 u 11", "en": "Windows 10 or 11" },
      "file": "Comic-Fast_0.14.0_x64-setup.exe",
      "icon": "windows.svg"
    }
  ]
}
```

| Campo | Qué es |
|---|---|
| `name` | Nombre de la opción. Texto simple o un texto por idioma (idioma → base → inglés → español → el primero que haya). |
| `note` | Opcional. Línea pequeña bajo el nombre. Mismo formato que `name`. |
| `file` | Archivo descargable, **en la misma carpeta** que el `.json`. También vale una dirección `https://…` completa (por ejemplo una release de GitHub). |
| `icon` | Opcional. Imagen (svg, png…) en la misma carpeta. Si falta o no carga, se usa un icono genérico de descarga. |
| `id` | Opcional. Solo para distinguir filas. |

También se admite que el archivo sea directamente una lista `[ {…}, {…} ]`.

## Cómo se decide qué se muestra

1. Si `descargas.json` no existe, está vacío o no es JSON válido → sin botón.
2. Cada opción cuyo `file` es de esa carpeta se comprueba con una petición `HEAD`: si el archivo no está subido (el servidor devuelve `index.html` o un error) la opción se oculta. Así puedes dejar listadas Windows, Linux y macOS y subir los instaladores según los vayas compilando.
3. Si quedan opciones → botón visible.
4. Los `file` con dirección externa (`https://otro-sitio/…`) no se comprueban: se muestran siempre.

Solo se aceptan direcciones `http(s)`; `javascript:`, `data:` y similares se descartan.

## En Cloudflare Pages

1. Compila el instalador (`npm run tauri build`; ver `05-publicar.md`) o descárgalo de la release que genera el flujo de GitHub.
2. Ponlo en la carpeta `descargas` del sitio: en el repositorio, `public/descargas/`, junto al `descargas.json`. Haz commit y push.
3. Añade su entrada al `descargas.json`.

**Límite:** Cloudflare Pages no admite archivos de más de **25 MiB**. Los instaladores `.exe`, `.msi` y `.dmg` suelen caber; un `.AppImage` puede no caber. En ese caso sube el archivo a **GitHub Releases** y pon su dirección en `file`:

```json
{ "name": "Linux (AppImage)", "file": "https://github.com/TU_USUARIO/comic-fast/releases/download/v0.14.0/Comic-Fast_0.14.0_amd64.AppImage" }
```

**No se cuelan en la app de escritorio:** al compilar con Tauri, `vite.config.ts` borra `dist/descargas`, `dist/avisos.json` y `dist/_headers` del paquete (solo sirven en la web), de modo que los instaladores de `public/descargas/` no engordan la propia app.

## Código

`src/lib/app/downloads.ts` (lectura y validación, con pruebas), `downloads.svelte.ts` (carga y comprobación), `components/DownloadDialog.svelte` (ventana) y el botón en `MenuBar.svelte`. Textos: claves `dl.*` de `src/locales/*.json`.
