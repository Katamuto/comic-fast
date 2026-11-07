GUÍA DE USUARIO POR IDIOMA
==========================

Un archivo por idioma, con el mismo código que en src/locales: es.md, en.md, ja.md…
Para añadir uno, copia en.md con el código nuevo (p. ej. de.md) y tradúcelo.
Aparece solo en Ayuda → Guía de usuario cuando ese idioma está activo. Si no existe,
se muestra la del inglés (y luego la española).

Formato (mini-Markdown):
  # Título                 título de la ventana
  ## Sección               cada sección es una entrada del índice de la izquierda
  - elemento               lista
  1. paso                  lista numerada
  **negrita**  *cursiva*  `código`  [texto](https://enlace)
El HTML no se interpreta: todo se escapa.
