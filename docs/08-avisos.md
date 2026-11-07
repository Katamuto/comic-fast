# 08 · Avisos para la versión web (la campanita)

Para dar un mensaje a quienes usan la versión **web** sin volver a compilar: edita **`avisos.json`**, que vive en la raíz del sitio (en el proyecto: `public/avisos.json`; publicado, junto a `index.html`).

- Al cargar, la web pide ese archivo. Si tiene contenido, aparece una **campanita** arriba a la derecha (con un puntito rojo si la persona aún no ha visto el mensaje). Al pulsarla se abre una ventana con el texto.
- **Archivo vacío o `{}` = sin campanita.** Para quitar un aviso, vacía el archivo.
- La **versión de escritorio no lo consulta** (no hace nada).
- En Cloudflare Pages: sube el archivo nuevo (o edítalo en tu repositorio y haz push). `public/_headers` ya manda `Cache-Control: no-cache` para que se vea enseguida.

## Formato

```json
{
  "id": "2026-10-20",
  "title":   { "es": "Novedades", "en": "News", "ja": "お知らせ" },
  "message": {
    "es": "Ya está la **versión 0.6**. Gracias por usar Comic Fast.",
    "en": "**Version 0.6** is out. Thanks for using Comic Fast."
  }
}
```

- `message` es obligatorio; `title` e `id` son opcionales.
- `title` y `message` pueden ser un texto simple (un solo idioma) o un objeto con un texto por idioma. Se elige el idioma de la persona; si falta, su idioma base, luego inglés y por último el primero que haya.
- El texto admite **negrita**, *cursiva*, listas (`- `), párrafos y enlaces `https`. El HTML se escapa.
- `id`: si lo cambias, la campanita vuelve a avisar a quien ya lo había visto. Sin `id` se calcula a partir del texto (cambiar el texto también vuelve a avisar).
- Varios avisos: `{ "messages": [ { … }, { … } ] }`.
- Si el archivo no es un JSON válido, simplemente no se muestra nada.

El código está en `src/lib/app/notices.ts` (lectura y formato, con pruebas) y `notices.svelte.ts` (carga y «visto»).
