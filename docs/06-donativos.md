# 06 · Donativos

Comic Fast **no lleva anuncios** y no los llevará: la única forma de apoyo es un botón de donativo, discreto y opcional.

## Cómo activarlo

1. Crea una página de cobro y copia su enlace **https**:

| Servicio | Cómo |
|---|---|
| PayPal | paypal.com → *Herramientas* → **PayPal.Me** (`https://paypal.me/tuusuario`) o un botón «Donar» |
| Ko-fi | `https://ko-fi.com/tuusuario` |
| Buy Me a Coffee | `https://buymeacoffee.com/tuusuario` |
| GitHub Sponsors | `https://github.com/sponsors/tuusuario` |

2. Pégalo en **`src/site.config.ts`**:
   ```ts
   export const SITE = {
     donateUrl: 'https://paypal.me/tuusuario'
   };
   ```
3. Haz *commit* y *push* (la web se vuelve a publicar sola) y vuelve a compilar el escritorio.

Con un enlace, aparece «♥ Apoyar» en la barra inferior, en el menú Ayuda y en la bienvenida. En escritorio abre el navegador del sistema. Sin enlace, no se muestra nada.

## Por qué antes no salía en la web (versión 0.3)

El enlace se leía de la variable `VITE_DONATE_URL`, que solo existía en tu archivo `.env.production` local. Ese archivo **no se sube a Git** (está en `.gitignore`), así que la web publicada se compilaba sin enlace y el botón se ocultaba; el AppImage, compilado en tu equipo, sí lo leía. Desde la 0.5 el enlace vive en `src/site.config.ts`, que sí va al repositorio.

(`VITE_DONATE_URL` sigue funcionando como sustituto opcional al compilar.)

## Ideas para sostener el dominio sin molestar
- Donativos recurrentes (Ko-fi, Liberapay, GitHub Sponsors).
- Packs de recursos de pago (globos, fuentes, imágenes) en Gumroad o itch.io, usando la carpeta `src/assets/resources/`.
- Versión de escritorio «paga lo que quieras» en itch.io.
