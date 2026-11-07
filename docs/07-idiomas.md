# 07 · Idiomas (i18n)

Comic Fast incluye **es, en, ja, ko, fr, zh y pt**. Añadir otro no requiere tocar código.

## Cómo funciona

| Qué | Dónde | Formato |
|---|---|---|
| Textos de la interfaz | `src/locales/<código>.json` | `{ "clave": "texto" }` plano |
| Guía de usuario | `src/locales/guide/<código>.md` | mini-Markdown |
| EULA | `src/assets/eula/<código>.md` | mini-Markdown |

Los archivos se descubren solos (`import.meta.glob` en `src/lib/i18n/locales.ts`). El código es el del idioma (`de`, `it`, `pt-BR`, `zh-TW`…).

En el código se usa `t('clave')` (de `src/lib/i18n`). Es reactivo: al cambiar de idioma se redibuja todo.
Si falta una clave, se busca en inglés, luego en español, luego en el texto de reserva y por último se muestra la clave.

## Añadir un idioma

1. Copia `src/locales/en.json` como `src/locales/de.json`.
2. Cambia `"lang.name"` por el nombre del idioma en ese idioma (`"Deutsch"`).
3. Traduce los valores (no las claves). Conserva `{n}`, `{name}`… tal cual.
4. (Opcional) Copia `src/locales/guide/en.md` → `de.md` y `src/assets/eula/en.md` → `de.md`.
5. Ejecuta `npm test`: comprueba que no falte ninguna clave y que los marcadores coincidan.

El idioma aparece solo en el botón del globo. La app arranca con el idioma del sistema (`navigator.languages`: `ja-JP` → `ja`, `pt-BR` → `pt`, `zh-TW` → `zh-TW` si existe, si no `zh`) y, si no está disponible, en inglés.

## Claves con nombre derivado

Los recursos tienen su propia clave; si falta, se ve el nombre original en español:

- `pattern.<tipo>` (tramas y texturas), `gradient.<id>`, `balloon.style.<id>`
- `res.tab.<pestaña>`, `res.<pestaña>.<id>` (globos, viñetas, texto), `res.group.<grupo>` (el grupo pasa por `slug()`)
- `size.<id>`, `unit.<id>`, `fx.preset.<id>`, `obj.<tipo>`, `layer.<tipo>`

Al añadir un recurso nuevo en `registry.ts`, añade su clave en los JSON (basta en `es` y `en`).

## Añadir un texto nuevo al código

1. Usa `t('mi.clave')` (o `t('mi.clave', { n: 3 })` con `{n}` en el texto).
2. Añade la clave a **todos** los JSON (la prueba falla si falta alguna).
3. En archivos fuera de componentes (`.ts`) importa `t` de `lib/i18n/index.svelte`.
4. Para errores: `throw new TKError('err.clave', 'Texto en español')`.

## Fuentes para japonés, coreano y chino

Los textos de los globos usan las fuentes de `src/assets/fonts/`. La interfaz usa las del sistema (que ya incluyen CJK), pero si quieres que el texto **dentro del cómic** salga bien en CJK, añade allí una fuente con esos caracteres (por ejemplo una Noto Sans CJK/JP en `.woff2`).

## Traducciones automáticas

Las traducciones incluidas son un primer borrador. Conviene que un hablante nativo las revise, sobre todo ja, ko y zh. Corregirlas es editar el JSON y recargar.


## Nombres de recursos (v0.6)
Las carpetas de recursos, tramas y texturas se traducen con un `names.json` dentro de la carpeta (ver `docs/04-recursos.md`, «Nombres en varios idiomas»). Sin él se usa el nombre de la carpeta o del archivo. Claves nuevas en `src/locales/*.json`: `field.alpha`, `drag.gradient`, `grad.guides`, `grad.resetGuides`, `grad.hint`, `grad.swap`, `insp.amount`, `pattern.streaks`, `pattern.blots`, `notice.title`, `notice.bell`.

## Claves nuevas en 0.8
`blend.<modo>` y `insp.blend`; `style.*`, `insp.styleTitle/styleHint`, `act.view.styleMode`, `res.text.t-pageno`; `fonts.*`, `act.file.fonts`, `file.filter.fonts`; `res.remove`, `res.unused`, `status.assetRemoved*`, `hist.removeAsset`; `status.outside`; `balloon.style.jagged`, `res.balloons.jagged`; `app.copyright`. Atención: en `insp.styleHint`, `{n}` y `{total}` son texto literal para el usuario (se muestran tal cual).
