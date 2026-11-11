# 05 · Publicar: versión web y ejecutables de escritorio

La **misma app** se publica de dos formas:

```
npm run build        →  dist/   (versión WEB: carpeta de archivos estáticos)
npm run tauri build  →  instaladores y ejecutable de ESCRITORIO
```

La versión web **no necesita servidor**: son archivos estáticos (HTML, JS, CSS, fuentes). Por eso hospedarla es gratis o casi.

---

## Parte A · Versión web

### A.0 Probarla antes de publicar
```bash
npm run build      # genera dist/
npm run preview    # sirve dist/ en http://localhost:4173 (esto es lo que verá el público)
```
Prueba ahí (no solo en `npm run dev`): importar imágenes, exportar PNG y PDF, guardar y abrir un `.cfast`, la fuente de los globos.

### A.1 Subir el proyecto a GitHub (necesario para los dos hostings)
1. Crea una cuenta en <https://github.com> y un repositorio nuevo (por ejemplo `comic-fast`; **público** si vas a usar GitHub Pages gratis).
2. En la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "Comic Fast 0.14.0"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/comic-fast.git
   git push -u origin main
   ```
   (`.gitignore` ya excluye `node_modules`, `dist`, `target` y tus archivos `.env`.)
3. Consejo: tras el primer `npm install` se crea `package-lock.json`; **súbelo también** (hace las compilaciones reproducibles).

### A.2 Opción recomendada: Cloudflare Pages
Ventajas: gratis para sitios estáticos, rápido en todo el mundo, HTTPS automático, y puedes **comprar el dominio en el mismo sitio** (Cloudflare Registrar vende al precio de coste, sin recargo; revisa su oferta actual).

1. Cuenta en <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git** → elige tu repositorio.
2. Configuración de compilación:
   | Campo | Valor |
   |---|---|
   | Framework preset | None (o Svelte; da igual) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Variables de entorno | `NODE_VERSION` = `20` |
3. **Save and Deploy.** En un par de minutos tendrás `https://tu-proyecto.pages.dev`. Cada `git push` a `main` publica una versión nueva sola.
4. **Dominio propio:** en el proyecto → **Custom domains** → **Set up a custom domain** → escribe `comicfast.com` (o el tuyo). Si el dominio está en Cloudflare, configura el DNS solo. Si lo compraste en otro registrador, Cloudflare te pedirá cambiar los *nameservers* (o añadir un registro CNAME); sigue las instrucciones de la pantalla.
5. El archivo `public/_headers` ya incluye cabeceras de seguridad y caché.

Alternativa sin Git: `npm run build` y luego `npx wrangler pages deploy dist --project-name comic-fast` (te pedirá iniciar sesión).

### A.3 Opción: GitHub Pages
1. Ya existe el flujo `.github/workflows/pages.yml`. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Cada `git push` a `main` ejecuta pruebas, compila y publica en `https://TU_USUARIO.github.io/comic-fast/`. (El proyecto usa rutas relativas, por eso funciona en esa subcarpeta.)
3. **Dominio propio:** Settings → Pages → **Custom domain**. En tu registrador crea los registros DNS que GitHub indica: un `CNAME` de `www` hacia `TU_USUARIO.github.io` y, para el dominio sin `www`, los registros `A` que figuran en la documentación de GitHub Pages (las IP pueden cambiar: copia las de su página oficial). Activa **Enforce HTTPS**.
4. Donativos: pon el enlace en `src/site.config.ts` (ver `06-donativos.md`).

### A.4 ¿Cuál elegir?
| | Cloudflare Pages | GitHub Pages |
|---|---|---|
| Coste | Gratis (consulta límites actuales) | Gratis con repositorio público |
| Dominio propio | Muy fácil, sobre todo si lo compras ahí | Fácil |
| Despliegues | Automáticos por Git, con vista previa por rama | Con el flujo incluido |
| Cabeceras (`_headers`) | Sí | No |
| Mi recomendación | ✔ | Buena alternativa |

### A.5 Comprar el dominio
Cualquier registrador sirve (Cloudflare Registrar, Namecheap, Porkbun, Google/Squarespace Domains…). Precios típicos de un `.com`: unos 10–15 USD al año; extensiones como `.app` o `.io` cuestan más. Activa la renovación automática y la **privacidad WHOIS** (suele ser gratis).

### A.6 Cosas a saber de la versión web
- **Guardar** descarga un archivo `.cfast` (el navegador no puede escribir donde quiera). Nada se guarda en tu servidor; los proyectos viven en el equipo del usuario. Al cerrar la pestaña con cambios, el navegador avisa. (Un autoguardado local sería una mejora futura.)
- Navegadores modernos (Chrome, Edge, Firefox, Safari recientes). La compilación apunta a `chrome105` y `safari15`.
- Páginas enormes pueden agotar la memoria del navegador al exportar; la app reduce sola la resolución de exportación si la página mide más de ~4500 px.
- **Privacidad:** la app no envía nada a ningún servidor; los proyectos viven en el equipo de quien los usa.

---

## Parte B · Ejecutable de escritorio

### B.1 Lo que necesitas instalado (una vez)
- **Node.js 20+** y **Rust** (<https://rustup.rs>).
- **Windows:** *Microsoft C++ Build Tools* (workload «Desarrollo para el escritorio con C++») y WebView2 (ya viene en Windows 10/11 actuales).
- **macOS:** `xcode-select --install`.
- **Linux (Debian/Ubuntu):**
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
  ```
Guía oficial por sistema: <https://v2.tauri.app/start/prerequisites/>

### B.2 Compilar
```bash
npm install
npm run tauri build
```
- **La primera vez tarda bastante** (compila Rust: 5–15 min). Las siguientes, mucho menos.
- Hay dos cosas distintas en el resultado:

| Qué | Dónde | Para qué |
|---|---|---|
| **Ejecutable suelto** | `src-tauri/target/release/comic-fast` (`comic-fast.exe` en Windows) | Probar rápido; necesita estar en el mismo equipo que lo compiló |
| **Instaladores / paquetes** | `src-tauri/target/release/bundle/…` | Lo que sí repartes |

Dentro de `bundle/`:
- Windows: `msi/Comic Fast_0.14.0_x64_en-US.msi` y `nsis/Comic Fast_0.14.0_x64-setup.exe`
- macOS: `dmg/Comic Fast_0.14.0_aarch64.dmg` y `macos/Comic Fast.app`
- Linux: `deb/…​.deb`, `rpm/…​.rpm`, `appimage/…​.AppImage` (este último se ejecuta con doble clic, sin instalar)

**Importante:** cada sistema operativo compila **solo para sí mismo** (en Windows obtienes los de Windows, etc.). Para tener los tres sin poseer los tres equipos, usa B.3.

### B.3 Los tres sistemas automáticamente (GitHub Actions)
Ya está el flujo `.github/workflows/build.yml`.
1. Sube el proyecto a GitHub (A.1).
2. Comprueba que la versión sea la misma en `package.json`, `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`.
3. Crea y sube una etiqueta:
   ```bash
   git tag v0.14.0
   git push origin v0.14.0
   ```
4. En GitHub → **Actions** verás la compilación (15–30 min). Al terminar, en **Releases** aparece un **borrador** con los instaladores de Windows, macOS (Apple Silicon e Intel) y Linux. Revísalo y pulsa **Publish release**.
5. Enlaza esa página de descargas desde tu sitio web.

### B.4 Iconos
`npm run icons` regenera todos los tamaños desde `src-tauri/icons/icon.png` (cuadrado, ≥ 1024 px, con transparencia). Cambia ese PNG por el icono definitivo antes de publicar.

### B.5 Avisos de seguridad del sistema (firma de código)
Un instalador **sin firmar** funciona, pero:
- **Windows:** SmartScreen muestra «Windows protegió su PC»; el usuario pulsa *Más información → Ejecutar de todas formas*. Un certificado de firma de código cuesta dinero anual y el aviso desaparece solo con reputación acumulada.
- **macOS:** Gatekeeper bloquea apps sin firmar/notarizar («está dañada»). Los usuarios pueden abrirla con clic derecho → *Abrir*, o tú puedes unirte al Apple Developer Program (de pago, ~99 USD/año) y firmar/notarizar. Tauri documenta cómo en <https://v2.tauri.app/distribute/sign/macos/>.
- **Linux:** sin avisos.
Para empezar, publica sin firmar y explica el aviso en tu página de descargas.

### B.6 Actualizaciones
Esta versión **no** se actualiza sola: el usuario descarga el instalador nuevo. Tauri tiene un plugin de actualización automática (`tauri-plugin-updater`) que se puede añadir más adelante.

### B.7 Si algo falla
| Error | Causa habitual |
|---|---|
| `failed to run custom build command` / falta `webkit2gtk` | Faltan las dependencias del sistema (B.1) |
| `linker 'link.exe' not found` (Windows) | Faltan las C++ Build Tools |
| La ventana abre en blanco | Ejecuta `npm run build` aparte y mira errores; revisa el CSP en `tauri.conf.json` |
| «No se pudo abrir un enlace» | Falta el permiso `opener:default` en `src-tauri/capabilities/default.json` |
| Cambié la versión y los instaladores conservan la antigua | Faltó actualizar uno de los tres archivos de versión |

---

## Ajustes del sitio

El enlace de donativos se configura en **`src/site.config.ts`** (va en el repositorio, vale para web y escritorio; ver `06-donativos.md`). La variable opcional `VITE_DONATE_URL` (plantilla en `.env.example`) lo sustituye al compilar, pero ojo: los archivos `.env*` **no se suben a Git**, así que solo valen para compilaciones locales.


## Avisos en la web
`public/avisos.json` se publica en la raíz del sitio; puedes editarlo en Cloudflare Pages sin recompilar la app (ver `08-avisos.md`). `public/_headers` evita que se cachee.

## Descargas de escritorio en la web
`public/descargas/descargas.json` lista los instaladores que ofrece la versión web (botón «Obtener versión de escritorio»). Con la lista vacía no aparece el botón. Ver `09-descargas.md` (incluye el límite de 25 MiB de Cloudflare Pages y cómo apuntar a GitHub Releases).

## Si falla la compilación en GitHub Actions
Abre la ejecución fallida (pestaña **Actions**), entra en el sistema que falló (Windows, macOS o Linux) y busca el primer paso en rojo. Las causas habituales:

| Síntoma | Causa y arreglo |
|---|---|
| `Resource not accessible by integration` al crear el release | Settings → Actions → General → Workflow permissions → **Read and write permissions**. |
| Error en `npm ci` («package.json and package-lock.json are not in sync») | Ejecuta `npm install` en tu equipo y sube el `package-lock.json` nuevo. |
| Falla solo Linux, en `apt-get`/`pkg-config` (webkit2gtk, appindicator) | La lista de dependencias de `build.yml` es la oficial para Ubuntu 22.04; no cambies `ubuntu-22.04` por `ubuntu-latest` sin revisarla. |
| Falla `npm test` | Es un fallo real de una prueba: corrígelo o quita el paso «Pruebas» de `build.yml`. |
| `The tag/version ... doesn't match` o el release sale con otro número | La versión de `package.json`, `tauri.conf.json` y `Cargo.toml` debe ser la misma que la etiqueta (`v0.14.0` ↔ `0.14.0`). |
| macOS: «la app está dañada» al abrirla | Sin firma de Apple es normal: clic derecho → Abrir (o `xattr -cr "/Applications/Comic Fast.app"`). Para evitarlo hace falta una cuenta de desarrollador de Apple. |
| Windows: aviso de SmartScreen | Sin certificado de firma de código es normal: «Más información → Ejecutar de todas formas». |

El flujo genera solo los formatos más útiles (Windows `.exe`, macOS `.dmg`, Linux `.deb` y `.AppImage`) para acortar el tiempo y reducir fallos; para añadir el `.msi` de Windows cambia `--bundles nsis` por `--bundles nsis,msi`. Los instaladores también quedan como *artifacts* de la ejecución aunque falle la creación del release.
