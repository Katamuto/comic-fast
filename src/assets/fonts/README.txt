CARPETA DE FUENTES (TIPOGRAFÍAS) EXTRA
======================================

Copia aquí archivos .woff2, .woff, .ttf u .otf y aparecerán en la lista de
fuentes del Inspector (globos y textos). No hay que instalar nada con npm ni
tocar el código. Reinicia «npm run dev» (o vuelve a compilar).

EL NOMBRE DEL ARCHIVO DEFINE LA FUENTE
  Patrick Hand.woff2                 → «Patrick Hand»
  Patrick Hand Bold.woff2            → misma fuente, negrita
  Patrick Hand Italic.woff2          → cursiva
  Patrick Hand Bold Italic.woff2     → negrita cursiva
  PatrickHand-Regular.ttf            → también vale el estilo de Google Fonts
  PatrickHand-BoldItalic.ttf

  Si solo tienes la variante normal, la negrita/cursiva del Inspector la «simula» el navegador.

DÓNDE CONSEGUIRLAS
  * fonts.google.com → «Get font» → «Download all» (viene en .ttf).
  * fontsource.org → la fuente → «Download» (trae .woff2).
  Comprueba la LICENCIA: con OFL o Apache puedes empaquetarla en tu app y regalarla/venderla.
  Las fuentes comerciales (de pago) normalmente NO permiten incluirlas en una app.

SI LA APP SE VE EN BLANCO después de agregar algo: mira la guía docs/04-recursos.md,
sección «Si algo sale mal». Casi siempre es un archivo corrupto o un import mal escrito.

FUENTES INCLUIDAS
  Noto Sans JP Black / KR Black / SC Black (licencia SIL OFL 1.1, © Google / Adobe).
  Peso «Black»: gruesa, buena para gritos, títulos y onomatopeyas en japonés,
  coreano y chino. Son subconjuntos (kana + kanji de nivel 1 JIS, hangul de
  KS X 1001, hanzi de nivel 1 de GB2312 y ASCII) para que pesen poco; un carácter
  fuera del subconjunto cae a la fuente siguiente de la lista.
  Cursivas, «turbias» (Creepster, Butcherman, East Sea Dokdo, Liu Jian Mao Cao,
  Zhi Mang Xing, Caveat, Gaegu…): NO se incluyen porque no pude descargarlas
  desde el entorno de desarrollo. Son OFL: bájalas de fonts.google.com y copia
  el .ttf aquí con el nombre «Creepster.ttf», etc.
