IDIOMAS DE LA INTERFAZ  (Comic Fast)
====================================

Cada archivo de esta carpeta es un idioma:

    es.json   en.json   ja.json   ko.json   fr.json   zh.json   pt.json

PARA AÑADIR UN IDIOMA
  1. Copia en.json (o es.json) con el código del idioma: de.json, it.json, ru.json,
     pt-BR.json, zh-TW.json… (código ISO 639-1; con región si hace falta).
  2. Cambia la clave "lang.name" por el nombre del idioma ESCRITO EN ESE IDIOMA
     (es lo que verá la persona en el selector): "Deutsch", "Italiano", "Русский"…
  3. Traduce los valores. NO cambies las claves (lo de la izquierda).
  4. Guarda. No hay que registrar nada en el código: el idioma aparece solo en el
     botón del globo, arriba a la derecha.
  Después, opcionalmente:
     - la guía de usuario:  src/locales/guide/<código>.md
     - el EULA:             src/assets/eula/<código>.md

REGLAS
  - Los marcadores como {n}, {name}, {version} se dejan EXACTAMENTE igual: la app
    los sustituye por valores. Puedes moverlos dentro de la frase.
  - **negrita**, *cursiva* y `código` (en splash.*) se conservan.
  - Los textos con <b>…</b> (res.stockEmpty, size.result) conservan esas etiquetas.
  - Si falta una clave, la app usa el inglés y luego el español: nunca se rompe.
  - "lang.dir": "rtl" (opcional) para idiomas que se escriben de derecha a izquierda.
  - Códigos de teclas (Ctrl+L…) no se traducen.

IDIOMA POR DEFECTO
  La app usa el idioma del sistema (navigator.languages). Si no está disponible,
  usa el inglés. La elección manual se recuerda.

RECURSOS (tramas, globos, plantillas, tamaños…)
  Sus nombres tienen claves propias: pattern.<tipo>, gradient.<id>, res.<pestaña>.<id>,
  size.<id>, unit.<id>… Una clave que falte muestra el nombre original en español.

LETRAS PARA JAPONÉS / COREANO / CHINO
  Los globos usan las fuentes de src/assets/fonts. Si quieres que el texto de los globos
  salga bien en CJK, añade allí una fuente con esos caracteres (ver su README).
